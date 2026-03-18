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
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn find_pid_by_exe_name(exe_name: &str) -> Option<u32> {
    let out = std::process::Command::new("tasklist")
        .args(["/fo", "csv", "/nh"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let target = exe_name.to_lowercase();
    for line in text.lines() {
        let cols: Vec<&str> = line.splitn(3, ',').collect();
        if cols.len() < 2 { continue; }
        let name = cols[0].trim_matches('"').to_lowercase();
        let pid_str = cols[1].trim_matches('"');
        if name == target {
            if let Ok(pid) = pid_str.parse::<u32>() {
                return Some(pid);
            }
        }
    }
    None
}

#[cfg(windows)]
fn is_pid_running(pid: u32) -> bool {
    let out = std::process::Command::new("tasklist")
        .args(["/fi", &format!("PID eq {}", pid), "/fo", "csv", "/nh"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();
    out.contains('"')
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

#[tauri::command]
pub fn launch_game(app: AppHandle, state: State<DbState>, id: String) -> Result<(), String> {
    let (exe_path, minimize) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let game = queries::get_game_by_id(&conn, &id)
            .map_err(|e| e.to_string())?
            .ok_or("Game not found")?;
        let exe = game.exe_path.clone().ok_or("No executable path set for this game")?;
        let min = queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false);
        (exe, min)
    };

    let child = std::process::Command::new(&exe_path)
        .spawn()
        .map_err(|e| format!("Failed to launch: {}", e))?;

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
    let start = std::time::Instant::now();
    let started_at = now.clone();
    let mut child = child;

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(5));
            if start.elapsed().as_secs() > 86400 {
                let _ = child.kill();
                break;
            }
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => continue,
                Err(_) => break,
            }
        }
        finish_session(&app_clone, &game_id, &started_at, start.elapsed().as_secs());
    });

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
    let (exe_path, minimize) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let exe = queries::get_game_by_id(&conn, &game_id)
            .ok().flatten()
            .and_then(|g| g.exe_path);
        let min = queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false);
        (exe, min)
    };

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

    if let Some(exe) = exe_path {
        let app_clone = app.clone();
        let gid = game_id.clone();
        let pids = active_pids.0.clone();
        let started_at = now.clone();

        std::thread::spawn(move || {
            #[cfg(windows)]
            {
                let exe_name = std::path::Path::new(&exe)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_lowercase())
                    .unwrap_or_default();

                if exe_name.is_empty() { return; }

                let start = std::time::Instant::now();

                let mut pid: Option<u32> = None;
                for _ in 0..120 {
                    if let Some(p) = find_pid_by_exe_name(&exe_name) {
                        pid = Some(p);
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }

                if let Some(pid) = pid {
                    {
                        let mut set = pids.lock().unwrap_or_else(|e| e.into_inner());
                        if !set.insert(pid) {
                            return;
                        }
                    }
                    let game_start = std::time::Instant::now();
                    loop {
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        if game_start.elapsed().as_secs() > 86400 { break; }
                        if !is_pid_running(pid) { break; }
                    }
                    pids.lock().unwrap_or_else(|e| e.into_inner()).remove(&pid);
                    finish_session(&app_clone, &gid, &started_at, game_start.elapsed().as_secs());
                } else {
                    finish_session(&app_clone, &gid, &started_at, 0);
                }
            }
        });
    }

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
    let (exe_path, minimize) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let exe = queries::get_game_by_id(&conn, &game_id)
            .ok().flatten()
            .and_then(|g| g.exe_path);
        let min = queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false);
        (exe, min)
    };

    let uri = format!(
        "com.epicgames.launcher://apps/{}?action=launch&silent=true",
        app_name
    );
    open::that(&uri)
        .map_err(|e| format!("Failed to launch Epic game: {}", e))?;

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

    if let Some(exe) = exe_path {
        let app_clone = app.clone();
        let gid = game_id.clone();
        let pids = active_pids.0.clone();
        let started_at = now.clone();

        std::thread::spawn(move || {
            #[cfg(windows)]
            {
                let exe_name = std::path::Path::new(&exe)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_lowercase())
                    .unwrap_or_default();

                if exe_name.is_empty() { return; }

                let start = std::time::Instant::now();

                let mut pid: Option<u32> = None;
                for _ in 0..180 {
                    if let Some(p) = find_pid_by_exe_name(&exe_name) {
                        pid = Some(p);
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_secs(1));
                }

                if let Some(pid) = pid {
                    {
                        let mut set = pids.lock().unwrap_or_else(|e| e.into_inner());
                        if !set.insert(pid) {
                            return;
                        }
                    }
                    let game_start = std::time::Instant::now();
                    loop {
                        std::thread::sleep(std::time::Duration::from_secs(5));
                        if game_start.elapsed().as_secs() > 86400 { break; }
                        if !is_pid_running(pid) { break; }
                    }
                    pids.lock().unwrap_or_else(|e| e.into_inner()).remove(&pid);
                    finish_session(&app_clone, &gid, &started_at, game_start.elapsed().as_secs());
                } else {
                    finish_session(&app_clone, &gid, &started_at, 0);
                }
            }
        });
    }

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
