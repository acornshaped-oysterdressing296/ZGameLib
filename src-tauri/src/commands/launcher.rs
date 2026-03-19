use tauri::{AppHandle, Emitter, Manager, State};
use chrono::Utc;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use crate::db::{DbState, queries};

pub struct ActivePids(pub Arc<Mutex<HashSet<u32>>>);

impl ActivePids {
    pub fn new() -> Self {
        Self(Arc::new(Mutex::new(HashSet::new())))
    }
}


#[cfg(windows)]
fn get_foreground_pid() -> Option<u32> {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 { None } else { Some(pid) }
    }
}

#[cfg(windows)]
fn get_process_exe_path(pid: u32) -> Option<String> {
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_NAME_FORMAT,
    };
    use windows::Win32::Foundation::CloseHandle;
    use windows::core::PWSTR;
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 1024];
        let mut size = 1024u32;
        let ok = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_FORMAT(0),
            PWSTR(buf.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(handle);
        if ok.is_ok() {
            Some(String::from_utf16_lossy(&buf[..size as usize]))
        } else {
            None
        }
    }
}

#[cfg(windows)]
fn snapshot_processes() -> Vec<(u32, String)> {
    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
    };
    use windows::Win32::Foundation::CloseHandle;
    let mut result = Vec::new();
    unsafe {
        let snap = match CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) {
            Ok(h) => h,
            Err(_) => return result,
        };
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snap, &mut entry).is_ok() {
            loop {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(entry.szExeFile.len());
                let name = String::from_utf16_lossy(&entry.szExeFile[..len]);
                result.push((entry.th32ProcessID, name.to_string()));
                if Process32NextW(snap, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snap);
    }
    result
}

#[cfg(windows)]
fn find_pids_in_directory(dir: &str) -> Vec<u32> {
    let dir_norm = normalize_dir(dir);
    let dir_path = std::path::Path::new(dir);
    let mut result = Vec::new();
    for (pid, exe_name) in snapshot_processes() {
        if pid == 0 {
            continue;
        }
        if let Some(path) = get_process_exe_path(pid) {
            if path.to_lowercase().starts_with(&dir_norm) {
                result.push(pid);
            }
        } else if !exe_name.is_empty() {
            if dir_path.join(&exe_name).exists() {
                result.push(pid);
            }
        }
    }
    result
}

#[cfg(windows)]
fn find_pid_by_exe_name(exe_name: &str) -> Option<u32> {
    let target = exe_name.to_lowercase();
    for (pid, name) in snapshot_processes() {
        if name.to_lowercase() == target {
            return Some(pid);
        }
    }
    None
}

#[cfg(windows)]
fn is_pid_running(pid: u32) -> bool {
    snapshot_processes().iter().any(|(p, _)| *p == pid)
}

#[cfg(windows)]
fn normalize_dir(dir: &str) -> String {
    let lower = dir.replace('/', "\\").to_lowercase();
    if lower.ends_with('\\') { lower } else { format!("{}\\", lower) }
}

#[cfg(windows)]
fn is_game_foreground(install_dir: &str) -> bool {
    let fg_pid = match get_foreground_pid() {
        Some(p) => p,
        None => return false,
    };
    match get_process_exe_path(fg_pid) {
        Some(path) => path.to_lowercase().starts_with(&normalize_dir(install_dir)),
        None => false,
    }
}

#[cfg(windows)]
fn find_steam_game_dir(app_id: &str) -> Option<String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let steam_key = hkcu.open_subkey("Software\\Valve\\Steam").ok()?;
    let steam_path: String = steam_key.get_value("SteamPath").ok()?;
    let steam_path = steam_path.replace('/', "\\");

    let mut library_dirs = vec![steam_path.clone()];
    let vdf = std::path::Path::new(&steam_path).join("steamapps").join("libraryfolders.vdf");
    if let Ok(content) = std::fs::read_to_string(vdf) {
        for line in content.lines() {
            let line = line.trim();
            if line.to_lowercase().contains("\"path\"") {
                let parts: Vec<&str> = line.splitn(4, '"').collect();
                if parts.len() >= 4 {
                    library_dirs.push(parts[3].replace("\\\\", "\\").replace('/', "\\"));
                }
            }
        }
    }

    let acf_name = format!("appmanifest_{}.acf", app_id);
    for lib in &library_dirs {
        let acf_path = std::path::Path::new(lib).join("steamapps").join(&acf_name);
        if let Ok(content) = std::fs::read_to_string(&acf_path) {
            for line in content.lines() {
                let line = line.trim();
                if line.to_lowercase().starts_with("\"installdir\"") {
                    let parts: Vec<&str> = line.splitn(4, '"').collect();
                    if parts.len() >= 4 && !parts[3].is_empty() {
                        let full = std::path::Path::new(lib)
                            .join("steamapps")
                            .join("common")
                            .join(parts[3]);
                        return Some(full.to_string_lossy().to_string().replace('/', "\\"));
                    }
                }
            }
        }
    }
    None
}

fn finish_session(app: &AppHandle, game_id: &str, started_at: &str, elapsed_secs: u64) {
    let elapsed_mins = (elapsed_secs / 60) as i64;
    let now = Utc::now().to_rfc3339();
    {
        let db = app.state::<DbState>();
        let lock = db.0.lock();
        if let Ok(conn) = lock {
            if elapsed_mins > 0 {
                let _ = conn.execute(
                    "UPDATE games SET playtime_mins = playtime_mins + ?1, last_played = ?2 WHERE id = ?3",
                    rusqlite::params![elapsed_mins, now, game_id],
                );
            } else {
                let _ = conn.execute(
                    "UPDATE games SET last_played = ?1 WHERE id = ?2",
                    rusqlite::params![now, game_id],
                );
            }
            if elapsed_secs >= 30 {
                let session_id = uuid::Uuid::new_v4().to_string();
                let mins_to_save = elapsed_mins.max(1);
                let _ = conn.execute(
                    "INSERT INTO sessions (id, game_id, started_at, ended_at, duration_mins) VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![session_id, game_id, started_at, now, mins_to_save],
                );
            }
        }
    }
    let _ = app.emit("game-session-ended", game_id);
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[cfg(windows)]
fn track_by_directory(
    app: AppHandle,
    game_id: String,
    started_at: String,
    install_dir: String,
    active_pids: Arc<Mutex<HashSet<u32>>>,
    exclude_idle: bool,
    wait_startup_secs: u64,
    sentinel_pid: Option<u32>,
    exe_name_hint: Option<String>,
) {
    if let Some(pid) = sentinel_pid {
        let mut set = active_pids.lock().unwrap_or_else(|e| e.into_inner());
        if !set.insert(pid) {
            return;
        }
    }

    let hint_lower = exe_name_hint.as_deref().map(|h| h.to_lowercase());

    let startup_start = std::time::Instant::now();
    loop {
        let dir_hit = !find_pids_in_directory(&install_dir).is_empty();
        let hint_hit = hint_lower.as_ref().map(|h| find_pid_by_exe_name(h).is_some()).unwrap_or(false);
        if dir_hit || hint_hit {
            break;
        }
        if startup_start.elapsed().as_secs() >= wait_startup_secs {
            if let Some(pid) = sentinel_pid {
                active_pids.lock().unwrap_or_else(|e| e.into_inner()).remove(&pid);
            }
            finish_session(&app, &game_id, &started_at, 0);
            return;
        }
        std::thread::sleep(std::time::Duration::from_secs(1));
    }

    let game_start = std::time::Instant::now();
    let mut total_idle_secs: u64 = 0;
    let mut idle_run_secs: u64 = 0;
    let mut iter_count: u32 = 0;
    let mut empty_ticks: u32 = 0;
    let mut continuous_secs: u64 = 0;
    let mut real_game_confirmed = false;

    loop {
        std::thread::sleep(std::time::Duration::from_secs(5));
        if game_start.elapsed().as_secs() > 86400 {
            break;
        }

        let dir_hit = !find_pids_in_directory(&install_dir).is_empty();
        let hint_hit = hint_lower.as_ref().map(|h| find_pid_by_exe_name(h).is_some()).unwrap_or(false);
        let game_running = dir_hit || hint_hit;

        if !game_running {
            empty_ticks += 1;
            let grace_ticks: u32 = if real_game_confirmed { 6 } else { 60 };
            if empty_ticks >= grace_ticks {
                break;
            }
            continue;
        }
        if empty_ticks > 0 {
            real_game_confirmed = true;
            continuous_secs = 0;
        }
        empty_ticks = 0;
        continuous_secs += 5;
        if continuous_secs >= 30 {
            real_game_confirmed = true;
        }

        iter_count += 1;
        if iter_count % 6 == 0 {
            let fg_by_dir = is_game_foreground(&install_dir);
            let fg_by_hint = if !fg_by_dir {
                hint_lower.as_ref().and_then(|h| {
                    let pid = find_pid_by_exe_name(h)?;
                    Some(get_foreground_pid() == Some(pid))
                }).unwrap_or(false)
            } else {
                false
            };
            if exclude_idle && !fg_by_dir && !fg_by_hint {
                idle_run_secs += 30;
            } else {
                if idle_run_secs >= 300 {
                    total_idle_secs += idle_run_secs;
                }
                idle_run_secs = 0;
            }
        }
    }

    if idle_run_secs >= 300 {
        total_idle_secs += idle_run_secs;
    }
    if let Some(pid) = sentinel_pid {
        active_pids.lock().unwrap_or_else(|e| e.into_inner()).remove(&pid);
    }
    let elapsed = game_start.elapsed().as_secs().saturating_sub(total_idle_secs);
    finish_session(&app, &game_id, &started_at, elapsed);
}

#[cfg(windows)]
fn track_by_pid(
    app: AppHandle,
    game_id: String,
    started_at: String,
    pid: u32,
    active_pids: Arc<Mutex<HashSet<u32>>>,
    exclude_idle: bool,
) {
    {
        let mut set = active_pids.lock().unwrap_or_else(|e| e.into_inner());
        if !set.insert(pid) {
            return;
        }
    }
    let game_start = std::time::Instant::now();
    let mut total_idle_secs: u64 = 0;
    let mut idle_run_secs: u64 = 0;
    let mut iter_count: u32 = 0;

    loop {
        std::thread::sleep(std::time::Duration::from_secs(5));
        if game_start.elapsed().as_secs() > 86400 {
            break;
        }
        if !is_pid_running(pid) {
            break;
        }
        iter_count += 1;
        if iter_count % 6 == 0 {
            if exclude_idle && get_foreground_pid() != Some(pid) {
                idle_run_secs += 30;
            } else {
                if idle_run_secs >= 300 {
                    total_idle_secs += idle_run_secs;
                }
                idle_run_secs = 0;
            }
        }
    }

    if idle_run_secs >= 300 {
        total_idle_secs += idle_run_secs;
    }
    active_pids.lock().unwrap_or_else(|e| e.into_inner()).remove(&pid);
    let elapsed = game_start.elapsed().as_secs().saturating_sub(total_idle_secs);
    finish_session(&app, &game_id, &started_at, elapsed);
}

#[tauri::command]
pub fn launch_game(
    app: AppHandle,
    state: State<DbState>,
    active_pids: State<ActivePids>,
    id: String,
) -> Result<(), String> {
    let (exe_path, install_dir, minimize, exclude_idle) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let game = queries::get_game_by_id(&conn, &id)
            .map_err(|e| e.to_string())?
            .ok_or("Game not found")?;
        let exe = game.exe_path.clone().ok_or("No executable path set for this game")?;
        let dir = game.install_dir.clone().or_else(|| {
            let parent = std::path::Path::new(&exe).parent()?;
            if parent.components().count() <= 1 {
                return None;
            }
            Some(parent.to_string_lossy().to_string())
        });
        let min = queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false);
        let idle = queries::get_setting(&conn, "exclude_idle_time")
            .map(|v| v != "false").unwrap_or(true);
        (exe, dir, min, idle)
    };

    let child = std::process::Command::new(&exe_path)
        .spawn()
        .map_err(|e| format!("Failed to launch: {}", e))?;
    let exe_pid = child.id();

    let now = Utc::now().to_rfc3339();
    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "UPDATE games SET last_played = ?1 WHERE id = ?2",
            rusqlite::params![now, id],
        );
    }

    if minimize {
        let app_min = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(400));
            if let Some(win) = app_min.get_webview_window("main") {
                let _ = win.minimize();
            }
        });
    }

    let app_clone = app.clone();
    let game_id = id.clone();
    let started_at = now.clone();
    let pids = active_pids.0.clone();

    #[cfg(windows)]
    {
        let exe_hint = std::path::Path::new(&exe_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string());
        drop(child);
        std::thread::spawn(move || {
            if let Some(dir) = install_dir {
                track_by_directory(app_clone, game_id, started_at, dir, pids, exclude_idle, 300, Some(exe_pid), exe_hint);
            } else {
                track_by_pid(app_clone, game_id, started_at, exe_pid, pids, exclude_idle);
            }
        });
    }

    #[cfg(not(windows))]
    {
        let _ = (install_dir, exe_pid, pids, exclude_idle);
        let mut child = child;
        std::thread::spawn(move || {
            let start = std::time::Instant::now();
            loop {
                std::thread::sleep(std::time::Duration::from_secs(5));
                if start.elapsed().as_secs() > 86400 {
                    let _ = child.kill();
                    break;
                }
                match child.try_wait() {
                    Ok(Some(_)) | Err(_) => break,
                    Ok(None) => {}
                }
            }
            finish_session(&app_clone, &game_id, &started_at, start.elapsed().as_secs());
        });
    }

    Ok(())
}

#[tauri::command]
pub fn launch_steam_game(
    app: AppHandle,
    state: State<DbState>,
    active_pids: State<ActivePids>,
    app_id: String,
    game_id: String,
) -> Result<(), String> {
    let (exe_path, install_dir, minimize, exclude_idle, not_installed) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let game = queries::get_game_by_id(&conn, &game_id).ok().flatten();
        let exe = game.as_ref().and_then(|g| g.exe_path.clone());
        let dir = game.as_ref().and_then(|g| g.install_dir.clone()).or_else(|| {
            let exe_ref = exe.as_ref()?;
            let parent = std::path::Path::new(exe_ref).parent()?;
            if parent.components().count() <= 1 { return None; }
            Some(parent.to_string_lossy().to_string())
        });
        let uninstalled = game.map(|g| g.not_installed).unwrap_or(false);
        let min = queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false);
        let idle = queries::get_setting(&conn, "exclude_idle_time")
            .map(|v| v != "false").unwrap_or(true);
        (exe, dir, min, idle, uninstalled)
    };

    if not_installed {
        open::that(format!("steam://install/{}", app_id))
            .map_err(|e| format!("Failed to open Steam install dialog: {}", e))?;
        return Ok(());
    }

    open::that(format!("steam://run/{}", app_id))
        .map_err(|e| format!("Failed to launch Steam game: {}", e))?;

    let now = Utc::now().to_rfc3339();
    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "UPDATE games SET last_played = ?1 WHERE id = ?2",
            rusqlite::params![now, game_id],
        );
    }

    if minimize {
        let app_min = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(400));
            if let Some(win) = app_min.get_webview_window("main") {
                let _ = win.minimize();
            }
        });
    }

    let app_clone = app.clone();
    let gid = game_id.clone();
    let pids = active_pids.0.clone();
    let started_at = now.clone();
    let app_id_clone = app_id.clone();

    std::thread::spawn(move || {
        #[cfg(windows)]
        {
            let exe_hint = exe_path.as_ref().and_then(|e| {
                std::path::Path::new(e).file_name().map(|n| n.to_string_lossy().to_string())
            });
            let resolved_dir = install_dir.or_else(|| find_steam_game_dir(&app_id_clone));
            if let Some(dir) = resolved_dir {
                track_by_directory(app_clone, gid, started_at, dir, pids, exclude_idle, 300, None, exe_hint);
            } else if let Some(exe) = exe_path {
                let exe_name = std::path::Path::new(&exe)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if exe_name.is_empty() {
                    return;
                }
                let mut pid: Option<u32> = None;
                for _ in 0..180 {
                    if let Some(p) = find_pid_by_exe_name(&exe_name) {
                        pid = Some(p);
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
                if let Some(p) = pid {
                    track_by_pid(app_clone, gid, started_at, p, pids, exclude_idle);
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn launch_epic_game(
    app: AppHandle,
    state: State<DbState>,
    active_pids: State<ActivePids>,
    app_name: String,
    game_id: String,
) -> Result<(), String> {
    let (exe_path, install_dir, minimize, exclude_idle) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let game = queries::get_game_by_id(&conn, &game_id).ok().flatten();
        let exe = game.as_ref().and_then(|g| g.exe_path.clone());
        let dir = game.as_ref().and_then(|g| g.install_dir.clone()).or_else(|| {
            let exe_ref = exe.as_ref()?;
            let parent = std::path::Path::new(exe_ref).parent()?;
            if parent.components().count() <= 1 { return None; }
            Some(parent.to_string_lossy().to_string())
        });
        let min = queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false);
        let idle = queries::get_setting(&conn, "exclude_idle_time")
            .map(|v| v != "false").unwrap_or(true);
        (exe, dir, min, idle)
    };

    let uri = format!(
        "com.epicgames.launcher://apps/{}?action=launch&silent=true",
        app_name
    );
    open::that(&uri).map_err(|e| format!("Failed to launch Epic game: {}", e))?;

    let now = Utc::now().to_rfc3339();
    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "UPDATE games SET last_played = ?1 WHERE id = ?2",
            rusqlite::params![now, game_id],
        );
    }

    if minimize {
        let app_min = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(400));
            if let Some(win) = app_min.get_webview_window("main") {
                let _ = win.minimize();
            }
        });
    }

    let app_clone = app.clone();
    let gid = game_id.clone();
    let pids = active_pids.0.clone();
    let started_at = now.clone();

    std::thread::spawn(move || {
        #[cfg(windows)]
        {
            let exe_hint = exe_path.as_ref().and_then(|e| {
                std::path::Path::new(e).file_name().map(|n| n.to_string_lossy().to_string())
            });
            if let Some(dir) = install_dir {
                track_by_directory(app_clone, gid, started_at, dir, pids, exclude_idle, 300, None, exe_hint);
            } else if let Some(exe) = exe_path {
                let exe_name = std::path::Path::new(&exe)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if exe_name.is_empty() {
                    return;
                }
                let mut pid: Option<u32> = None;
                for _ in 0..180 {
                    if let Some(p) = find_pid_by_exe_name(&exe_name) {
                        pid = Some(p);
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }
                if let Some(p) = pid {
                    track_by_pid(app_clone, gid, started_at, p, pids, exclude_idle);
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn open_game_folder(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let game = queries::get_game_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or("Game not found")?;

    let folder = game
        .install_dir
        .or(game.exe_path.as_ref().and_then(|p| {
            std::path::Path::new(p)
                .parent()
                .map(|par| par.to_string_lossy().to_string())
        }))
        .ok_or("No folder path available")?;

    open::that(&folder).map_err(|e: std::io::Error| e.to_string())?;
    Ok(())
}
