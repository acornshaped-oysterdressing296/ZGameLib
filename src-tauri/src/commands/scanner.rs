use tauri::{AppHandle, Emitter, State};
use chrono::Utc;
use uuid::Uuid;
use crate::db::{DbState, queries};
use crate::models::{Game, ScanResult, CoverCandidate};

#[derive(serde::Serialize, Clone)]
struct LogEvent {
    level: String,
    message: String,
}

fn log(app: &AppHandle, level: &str, message: &str) {
    let _ = app.emit("scan-log", LogEvent {
        level: level.to_string(),
        message: message.to_string(),
    });
}

// ── Steam ────────────────────────────────────────────────────────────────────

#[cfg(windows)]
fn get_steam_root() -> Option<String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey("Software\\Valve\\Steam")
        .ok()
        .and_then(|k| k.get_value::<String, _>("SteamPath").ok())
}

#[cfg(not(windows))]
fn get_steam_root() -> Option<String> {
    dirs::home_dir()
        .map(|h| h.join(".steam/steam").to_string_lossy().to_string())
}

fn parse_vdf_value(line: &str) -> Option<String> {
    // Extract quoted value from a VDF line like:  "key"   "value"
    // Use split() not splitn(4) — splitn keeps the trailing quote in the last part
    let parts: Vec<&str> = line.split('"').collect();
    parts.get(3).map(|s| s.to_string())
}

fn get_steam_library_paths(steam_root: &str) -> Vec<String> {
    let mut paths = vec![steam_root.to_string()];
    let vdf_path = std::path::Path::new(steam_root)
        .join("steamapps")
        .join("libraryfolders.vdf");

    if let Ok(content) = std::fs::read_to_string(&vdf_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.contains("\"path\"") {
                if let Some(val) = parse_vdf_value(trimmed) {
                    paths.push(val);
                }
            }
        }
    }
    paths
}

fn scan_steam_library(library_path: &str) -> Vec<(String, String, String)> {
    // Returns (app_id, name, install_dir)
    let apps_dir = std::path::Path::new(library_path).join("steamapps");
    let mut games = vec![];

    let entries = match std::fs::read_dir(&apps_dir) {
        Ok(e) => e,
        Err(_) => return games,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let fname = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        if fname.starts_with("appmanifest_") && fname.ends_with(".acf") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                let mut app_id = String::new();
                let mut name = String::new();
                let mut install_dir = String::new();

                for line in content.lines() {
                    let t = line.trim();
                    if t.starts_with("\"appid\"") {
                        app_id = parse_vdf_value(t).unwrap_or_default();
                    } else if t.starts_with("\"name\"") {
                        name = parse_vdf_value(t).unwrap_or_default();
                    } else if t.starts_with("\"installdir\"") {
                        install_dir = parse_vdf_value(t).unwrap_or_default();
                    }
                }

                if !app_id.is_empty() && !name.is_empty() {
                    let full_dir = apps_dir
                        .join("common")
                        .join(&install_dir)
                        .to_string_lossy()
                        .to_string();
                    games.push((app_id, name, full_dir));
                }
            }
        }
    }
    games
}

// ── Epic ─────────────────────────────────────────────────────────────────────

fn get_epic_manifests_path() -> String {
    #[cfg(windows)]
    {
        r"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests".to_string()
    }
    #[cfg(not(windows))]
    {
        dirs::home_dir()
            .map(|h| {
                h.join(".config/Epic/EpicGamesLauncher/Data/Manifests")
                    .to_string_lossy()
                    .to_string()
            })
            .unwrap_or_default()
    }
}

struct EpicManifest {
    app_name: String,
    display_name: String,
    install_dir: String,
    launch_exe: Option<String>, // relative path to main exe from install_dir
}

fn scan_epic_manifests(manifests_path: &str) -> Vec<EpicManifest> {
    let mut games = vec![];
    let dir = std::path::Path::new(manifests_path);
    if !dir.exists() {
        return games;
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return games,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("item") {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    let app_name = json["AppName"].as_str().unwrap_or("").to_string();
                    let display_name = json["DisplayName"].as_str().unwrap_or("").to_string();
                    let install_loc = json["InstallLocation"].as_str().unwrap_or("").to_string();
                    let is_dlc = json["bIsIncompleteInstall"].as_bool().unwrap_or(false);
                    let launch_exe = json["LaunchExecutable"].as_str()
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string());

                    if !app_name.is_empty() && !display_name.is_empty() && !is_dlc {
                        games.push(EpicManifest { app_name, display_name, install_dir: install_loc, launch_exe });
                    }
                }
            }
        }
    }
    games
}

// ── Steam exe finder ──────────────────────────────────────────────────────

/// Find the main game executable for a game install directory.
/// Priority: name-matched exe → launcher exe → largest exe (>5MB) → shipping exe (last resort).
/// Shipping exes (UE4/UE5) can't be launched standalone so they're deprioritized.
fn find_steam_game_exe(install_dir: &str, game_name: &str) -> Option<String> {
    let skip_exe_words = [
        "unins", "setup", "install", "update", "crash", "report", "vc_redist",
        "dxsetup", "dotnet", "directx", "unity", "ue4prereq", "ue5prereq",
        "bootstrap", "redist", "prereq", "vcredist", "oalinst", "physx",
        "easyanticheat", "battleye", "be_service", "launcher_old",
        "ue4-", "ue5-", "crashpad", "cefprocess", "webhelper", "nacl64",
        "subsidiaryapp", "steamworkshelper", "touchup", "cleanup", "7za",
        "unreal", "epicwebhelper", "wine",
    ];
    // Skip directories that never contain the game executable
    let skip_dirs = [
        "saves", "save", "logs", "log", "screenshots", "video", "videos",
        "music", "audio", "cinematics", "movies", "temp", "cache",
        "crashreporter", "redist", "vcredist", "directx", "dotnet",
        "prerequisites", "__pycache__", ".git", "support", "_commonredist",
        "__installer", "mono", "tools", "sdk", "editor",
    ];

    // Normalize game name to alphanumeric only for fuzzy matching
    let name_norm: String = game_name.to_lowercase()
        .chars().filter(|c| c.is_alphanumeric()).collect();

    let mut best_named:    Option<(std::path::PathBuf, u64)> = None; // P1: name match
    let mut best_launcher: Option<(std::path::PathBuf, u64)> = None; // P2: "launcher" in name
    let mut best_largest:  Option<(std::path::PathBuf, u64)> = None; // P3: largest exe >5MB
    let mut best_shipping: Option<(std::path::PathBuf, u64)> = None; // P4: UE shipping (last resort)
    let mut best_root:     Option<(std::path::PathBuf, u64)> = None; // P2.5: exe in root dir

    for entry in walkdir::WalkDir::new(install_dir)
        .max_depth(6)
        .into_iter()
        .filter_entry(|e| {
            // Prune known non-game subdirectories to speed up the walk
            if e.file_type().is_dir() && e.depth() > 0 {
                let n = e.file_name().to_string_lossy().to_lowercase();
                !skip_dirs.iter().any(|&s| n == s)
            } else {
                true
            }
        })
        .flatten()
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("exe") { continue; }

        let fname = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
        if skip_exe_words.iter().any(|s| fname.contains(s)) { continue; }

        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        // Ignore tiny executables (<500KB) — they're usually stubs or helpers
        if size < 500_000 { continue; }

        // Shipping exes (UE4/UE5) — lowest priority, they can't be launched standalone
        if fname.ends_with("-win64-shipping.exe") || fname.ends_with("-win32-shipping.exe") {
            if best_shipping.as_ref().map_or(true, |(_, s)| size > *s) {
                best_shipping = Some((path.to_path_buf(), size));
            }
            continue; // don't let shipping exe win other categories
        }

        // Priority 1: exe stem contains the game name (or vice-versa)
        let stem_norm: String = path.file_stem().unwrap_or_default()
            .to_string_lossy().to_lowercase()
            .chars().filter(|c| c.is_alphanumeric()).collect();
        if !stem_norm.is_empty() && !name_norm.is_empty()
            && (stem_norm.contains(&name_norm) || name_norm.contains(&stem_norm))
        {
            if best_named.as_ref().map_or(true, |(_, s)| size > *s) {
                best_named = Some((path.to_path_buf(), size));
            }
        }

        // Priority 2: "launcher" in name (e.g. FortniteLauncher.exe, GameLauncher.exe)
        if fname.contains("launcher") && !fname.contains("epicgames") {
            if best_launcher.as_ref().map_or(true, |(_, s)| size > *s) {
                best_launcher = Some((path.to_path_buf(), size));
            }
        }

        // Priority 2.5: exe directly in root install dir (depth 1)
        if entry.depth() <= 1 && size > 1_000_000 {
            if best_root.as_ref().map_or(true, |(_, s)| size > *s) {
                best_root = Some((path.to_path_buf(), size));
            }
        }

        // Priority 3: largest exe overall (must be >5MB to avoid helpers)
        if size > 5_000_000 {
            if best_largest.as_ref().map_or(true, |(_, s)| size > *s) {
                best_largest = Some((path.to_path_buf(), size));
            }
        }
    }

    best_named.or(best_launcher).or(best_root).or(best_largest).or(best_shipping)
        .map(|(p, _)| p.to_string_lossy().to_string())
}

// ── HTTP cover download helper ─────────────────────────────────────────────

/// Download an image from `url` into the local covers cache directory.
/// Logs the outcome via the app handle. Returns the local file path or None.
fn download_image_to_cache(url: &str, filename: &str, app: &AppHandle) -> Option<String> {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ZGameLib")
        .join("covers");

    std::fs::create_dir_all(&data_dir).ok()?;

    let dest = data_dir.join(filename);
    if dest.exists() {
        log(app, "info", &format!("  (cached) {}", filename));
        return Some(dest.to_string_lossy().to_string());
    }

    match ureq::get(url).call() {
        Ok(response) => {
            let ct = response.content_type().to_string();
            if !ct.starts_with("image/") {
                log(app, "warn", &format!("  CDN rejected: content-type=\"{}\" (not an image)", ct));
                return None;
            }
            let mut bytes = Vec::new();
            use std::io::Read;
            if response.into_reader().read_to_end(&mut bytes).is_err() || bytes.is_empty() {
                log(app, "warn", "  CDN: read failed or empty response");
                return None;
            }
            if std::fs::write(&dest, &bytes).is_err() {
                log(app, "warn", "  CDN: failed to write file to disk");
                return None;
            }
            Some(dest.to_string_lossy().to_string())
        }
        Err(e) => {
            log(app, "warn", &format!("  CDN request failed: {}", e));
            None
        }
    }
}

/// Search Steam's public API for a game by name and download the best matching cover.
/// Used to find covers for Epic/GOG games that don't have their own CDN.
fn search_steam_cover_for_name(game_name: &str, app: &AppHandle) -> Option<String> {
    let url = format!(
        "https://steamcommunity.com/actions/SearchApps/{}",
        game_name.trim()
    );
    let response = ureq::get(&url).call().ok()?;
    let mut body = String::new();
    use std::io::Read;
    response.into_reader().read_to_string(&mut body).ok()?;
    let results: Vec<serde_json::Value> = serde_json::from_str(&body).ok()?;
    let first = results.first()?;
    let app_id = first["appid"].as_str()?;
    let portrait_url = format!(
        "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/library_600x900.jpg",
        app_id
    );
    download_image_to_cache(
        &portrait_url,
        &format!("steam_{}_600x900.jpg", app_id),
        app,
    )
}

// ── Tauri Commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn scan_steam_games(app: AppHandle, state: State<DbState>) -> Result<ScanResult, String> {
    let steam_root = match get_steam_root() {
        Some(r) => r,
        None => {
            log(&app, "error", "Steam not found (registry key missing)");
            return Err("Steam not found".to_string());
        }
    };
    log(&app, "info", &format!("Steam root: {}", steam_root));
    let library_paths = get_steam_library_paths(&steam_root);
    log(&app, "info", &format!("Found {} library path(s)", library_paths.len()));

    // Phase 1: Collect all game data — NO mutex, NO network I/O
    let raw_games: Vec<(String, String, String)> = library_paths.iter()
        .flat_map(|p| scan_steam_library(p))
        .collect();
    let total = raw_games.len();
    log(&app, "info", &format!("Total Steam games found: {}", total));

    // Phase 2: Find exe + cover — NO mutex, may do filesystem walk and HTTP
    struct SteamEntry {
        app_id: String,
        name: String,
        install_dir: String,
        exe_path: Option<String>,
        cover: Option<String>,
    }

    let mut entries: Vec<SteamEntry> = Vec::with_capacity(total);
    for (app_id, name, install_dir) in raw_games {
        log(&app, "info", &format!("--- [{}] {}", app_id, name));
        log(&app, "info", &format!("  dir: {}", install_dir));

        // Find the game's main exe (UE4/UE5 shipping > name match > largest)
        let exe_path = find_steam_game_exe(&install_dir, &name);
        match &exe_path {
            Some(p) => log(&app, "ok", &format!("  exe: {}", p)),
            None => log(&app, "warn", "  exe: not found"),
        }

        // Cover: local image files → Steam CDN portrait → Steam CDN header → exe icon
        let cover = if let Some(local) = find_cover_in_dir_internal(&install_dir) {
            log(&app, "ok", &format!("  cover: local file ({})", local));
            Some(local)
        } else {
            let portrait_url = format!(
                "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/library_600x900.jpg",
                app_id
            );
            log(&app, "info", &format!("  CDN portrait: {}", portrait_url));
            let portrait = download_image_to_cache(
                &portrait_url,
                &format!("steam_{}_600x900.jpg", app_id),
                &app,
            );
            if portrait.is_some() {
                log(&app, "ok", "  cover: CDN portrait (600x900) ✓");
                portrait
            } else {
                let header_url = format!(
                    "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/header.jpg",
                    app_id
                );
                log(&app, "info", &format!("  CDN header: {}", header_url));
                let header = download_image_to_cache(
                    &header_url,
                    &format!("steam_{}_header.jpg", app_id),
                    &app,
                );
                if header.is_some() {
                    log(&app, "ok", "  cover: CDN header ✓");
                    header
                } else {
                    match &exe_path {
                        Some(exe) => {
                            log(&app, "info", "  trying exe icon fallback...");
                            let icon = extract_exe_icon_internal(exe);
                            match &icon {
                                Some(_) => log(&app, "ok", "  cover: exe icon ✓"),
                                None => log(&app, "warn", "  cover: none (all methods failed)"),
                            }
                            icon
                        }
                        None => {
                            log(&app, "warn", "  cover: none (no exe, CDN failed)");
                            None
                        }
                    }
                }
            }
        };

        entries.push(SteamEntry { app_id, name, install_dir, exe_path, cover });
    }

    // Phase 3: Lock mutex once, do all DB operations
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut added = 0;
    let mut skipped = 0;

    for entry in entries {
        if let Some((existing_id, _)) = queries::get_steam_game_cover(&conn, &entry.app_id) {
            // Always update cover (may have a better local path now)
            if let Some(ref cover) = entry.cover {
                let _ = queries::update_cover_path(&conn, &existing_id, cover);
            }
            // Fill in exe_path if the record doesn't have one yet
            if let Some(ref exe) = entry.exe_path {
                let _ = conn.execute(
                    "UPDATE games SET exe_path = ?1 WHERE id = ?2 AND (exe_path IS NULL OR exe_path = '')",
                    rusqlite::params![exe, existing_id],
                );
            }
            skipped += 1;
            continue;
        }
        let game = Game {
            id: Uuid::new_v4().to_string(),
            name: entry.name,
            platform: "steam".to_string(),
            exe_path: entry.exe_path,
            install_dir: Some(entry.install_dir),
            cover_path: entry.cover,
            description: None,
            rating: None,
            status: "none".to_string(),
            is_favorite: false,
            playtime_mins: 0,
            last_played: None,
            date_added: now.clone(),
            steam_app_id: Some(entry.app_id),
            epic_app_name: None,
            tags: vec![],
            sort_order: 0,
        };
        if queries::insert_game(&conn, &game).is_ok() {
            added += 1;
        }
    }

    log(&app, "ok", &format!("Steam scan done: {} added, {} skipped", added, skipped));
    Ok(ScanResult { added, skipped, total })
}

#[tauri::command]
pub fn scan_epic_games(app: AppHandle, state: State<DbState>) -> Result<ScanResult, String> {
    let manifests_path = get_epic_manifests_path();
    log(&app, "info", &format!("Epic manifests path: {}", manifests_path));

    // Phase 1: Parse manifests — NO mutex
    let raw = scan_epic_manifests(&manifests_path);
    let total = raw.len();
    log(&app, "info", &format!("Total Epic games found: {}", total));

    // Phase 2: Find covers — NO mutex, exe icon extraction runs here
    struct EpicEntry {
        app_name: String,
        display_name: String,
        install_dir: String,
        exe_path: Option<String>,
        cover: Option<String>,
    }

    let mut entries: Vec<EpicEntry> = Vec::with_capacity(total);
    for m in raw {
        log(&app, "info", &format!("--- {}", m.display_name));

        // Resolve full exe path from install_dir + launch_exe
        let exe_path = m.launch_exe.as_ref().map(|rel| {
            std::path::Path::new(&m.install_dir).join(rel).to_string_lossy().to_string()
        });
        match &exe_path {
            Some(p) => log(&app, "ok", &format!("  exe: {}", p)),
            None => log(&app, "warn", "  exe: LaunchExecutable missing in manifest"),
        }

        // Try image files in install dir → Steam CDN (search by name) → exe icon
        let cover = if let Some(local) = find_cover_in_dir_internal(&m.install_dir) {
            log(&app, "ok", &format!("  cover: local file ({})", local));
            Some(local)
        } else {
            // Try to find cover from Steam CDN by searching the game name
            log(&app, "info", &format!("  searching Steam CDN for \"{}\"...", m.display_name));
            let steam_cover = search_steam_cover_for_name(&m.display_name, &app);
            if steam_cover.is_some() {
                log(&app, "ok", "  cover: Steam CDN (name search) ✓");
                steam_cover
            } else {
                match &exe_path {
                    Some(exe) => {
                        log(&app, "info", "  trying exe icon...");
                        let icon = extract_exe_icon_internal(exe);
                        match &icon {
                            Some(_) => log(&app, "ok", "  cover: exe icon ✓"),
                            None => log(&app, "warn", "  cover: none"),
                        }
                        icon
                    }
                    None => {
                        log(&app, "warn", "  cover: none (no exe)");
                        None
                    }
                }
            }
        };

        entries.push(EpicEntry {
            app_name: m.app_name,
            display_name: m.display_name,
            install_dir: m.install_dir,
            exe_path,
            cover,
        });
    }

    // Phase 3: Lock mutex once, do all DB operations
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut added = 0;
    let mut skipped = 0;

    for entry in entries {
        if let Some((existing_id, existing_cover)) = queries::get_epic_game_cover(&conn, &entry.app_name) {
            // Update cover if the existing record has none
            if existing_cover.is_none() {
                if let Some(ref cover) = entry.cover {
                    let _ = queries::update_cover_path(&conn, &existing_id, cover);
                }
            }
            skipped += 1;
            continue;
        }
        let game = Game {
            id: Uuid::new_v4().to_string(),
            name: entry.display_name,
            platform: "epic".to_string(),
            exe_path: entry.exe_path,
            install_dir: Some(entry.install_dir),
            cover_path: entry.cover,
            description: None,
            rating: None,
            status: "none".to_string(),
            is_favorite: false,
            playtime_mins: 0,
            last_played: None,
            date_added: now.clone(),
            steam_app_id: None,
            epic_app_name: Some(entry.app_name),
            tags: vec![],
            sort_order: 0,
        };
        if queries::insert_game(&conn, &game).is_ok() {
            added += 1;
        }
    }

    log(&app, "ok", &format!("Epic scan done: {} added, {} skipped", added, skipped));
    Ok(ScanResult { added, skipped, total })
}

// ── GOG ───────────────────────────────────────────────────────────────────────

#[cfg(windows)]
fn get_gog_games_from_registry() -> Vec<(String, String, String, String)> {
    // Returns (product_id, name, exe_path, install_path)
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ};
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let mut games = vec![];
    let paths = [
        "SOFTWARE\\WOW6432Node\\GOG.com\\Games",
        "SOFTWARE\\GOG.com\\Games",
    ];
    for registry_path in &paths {
        if let Ok(gog_key) = hklm.open_subkey_with_flags(registry_path, KEY_READ) {
            for subkey_name in gog_key.enum_keys().flatten() {
                if let Ok(sub) = gog_key.open_subkey_with_flags(&subkey_name, KEY_READ) {
                    let name: String = sub.get_value("GAMENAME").unwrap_or_default();
                    let exe: String = sub.get_value("EXE").unwrap_or_default();
                    let path: String = sub.get_value("PATH").unwrap_or_default();
                    let product_id: String = sub.get_value("PRODUCTID")
                        .or_else(|_| sub.get_value("id"))
                        .unwrap_or_else(|_| subkey_name.clone());
                    if !name.is_empty() && !path.is_empty() {
                        games.push((product_id, name, exe, path));
                    }
                }
            }
            if !games.is_empty() { break; }
        }
    }
    games
}

#[cfg(not(windows))]
fn get_gog_games_from_registry() -> Vec<(String, String, String, String)> { vec![] }

fn get_gog_cover(product_id: &str, app: &AppHandle) -> Option<String> {
    let url = format!("https://api.gog.com/products/{}?expand=description", product_id);
    let response = ureq::get(&url).call().ok()?;
    let mut body = String::new();
    use std::io::Read;
    response.into_reader().read_to_string(&mut body).ok()?;
    let json: serde_json::Value = serde_json::from_str(&body).ok()?;
    let logo = json["images"]["logo2x"].as_str()
        .or_else(|| json["images"]["logo"].as_str())?;
    let full_url = if logo.starts_with("//") { format!("https:{}", logo) } else { logo.to_string() };
    download_image_to_cache(&full_url, &format!("gog_{}.jpg", product_id), app)
}

#[tauri::command]
pub fn scan_gog_games(app: AppHandle, state: State<DbState>) -> Result<ScanResult, String> {
    let raw = get_gog_games_from_registry();
    let total = raw.len();
    log(&app, "info", &format!("GOG: found {} game(s) in registry", total));

    struct GogEntry { product_id: String, name: String, exe_path: Option<String>, install_dir: String, cover: Option<String> }
    let mut entries = Vec::with_capacity(total);

    for (product_id, name, exe, install_dir) in raw {
        log(&app, "info", &format!("--- [{}] {}", product_id, name));
        let exe_path = if !exe.is_empty() && std::path::Path::new(&exe).exists() {
            Some(exe)
        } else {
            find_steam_game_exe(&install_dir, &name) // reuse exe finder
        };
        match &exe_path {
            Some(p) => log(&app, "ok", &format!("  exe: {}", p)),
            None => log(&app, "warn", "  exe: not found"),
        }
        let cover = if let Some(local) = find_cover_in_dir_internal(&install_dir) {
            log(&app, "ok", &format!("  cover: local ({})", local));
            Some(local)
        } else {
            log(&app, "info", &format!("  fetching GOG cover for product {}", product_id));
            let c = get_gog_cover(&product_id, &app);
            if c.is_some() {
                log(&app, "ok", "  cover: GOG CDN ✓");
                c
            } else {
                // Fallback: search Steam CDN by game name
                log(&app, "info", &format!("  GOG CDN failed, searching Steam CDN for \"{}\"...", name));
                let sc = search_steam_cover_for_name(&name, &app);
                match &sc {
                    Some(_) => log(&app, "ok", "  cover: Steam CDN (name search) ✓"),
                    None => log(&app, "warn", "  cover: not found"),
                }
                sc
            }
        };
        entries.push(GogEntry { product_id, name, exe_path, install_dir, cover });
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut added = 0;
    let mut skipped = 0;

    for entry in entries {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM games WHERE install_dir = ?1 AND platform = 'gog'",
            rusqlite::params![entry.install_dir],
            |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;

        if exists { skipped += 1; continue; }

        let game = Game {
            id: uuid::Uuid::new_v4().to_string(),
            name: entry.name,
            platform: "gog".to_string(),
            exe_path: entry.exe_path,
            install_dir: Some(entry.install_dir),
            cover_path: entry.cover,
            description: None, rating: None,
            status: "none".to_string(),
            is_favorite: false, playtime_mins: 0,
            last_played: None, date_added: now.clone(),
            steam_app_id: None, epic_app_name: None,
            tags: vec![], sort_order: 0,
        };
        if queries::insert_game(&conn, &game).is_ok() { added += 1; }
    }

    log(&app, "ok", &format!("GOG scan done: {} added, {} skipped", added, skipped));
    Ok(ScanResult { added, skipped, total })
}

// ── Cover search ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn search_game_covers(query: String) -> Result<Vec<CoverCandidate>, String> {
    let url = format!("https://steamcommunity.com/actions/SearchApps/{}", query.trim());
    let response = ureq::get(&url).call().map_err(|e| e.to_string())?;
    let mut body = String::new();
    use std::io::Read;
    response.into_reader().read_to_string(&mut body).map_err(|e| e.to_string())?;
    let results: Vec<serde_json::Value> = serde_json::from_str(&body).unwrap_or_default();
    let candidates = results.into_iter().take(16)
        .filter_map(|v| {
            let app_id = v["appid"].as_str()?.to_string();
            let name = v["name"].as_str()?.to_string();
            Some(CoverCandidate {
                name,
                app_id: app_id.clone(),
                cover_url: format!(
                    "https://cdn.cloudflare.steamstatic.com/steam/apps/{}/library_600x900.jpg",
                    app_id
                ),
            })
        })
        .collect();
    Ok(candidates)
}

// ── Screenshot gallery ────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_game_screenshots(steam_app_id: String) -> Result<Vec<String>, String> {
    let steam_root = match get_steam_root() {
        Some(r) => r,
        None => return Ok(vec![]),
    };
    let userdata = std::path::Path::new(&steam_root).join("userdata");
    let mut shots: Vec<std::path::PathBuf> = vec![];

    if let Ok(users) = std::fs::read_dir(&userdata) {
        for user in users.flatten() {
            let dir = user.path()
                .join("760").join("remote")
                .join(&steam_app_id).join("screenshots");
            if !dir.exists() { continue; }
            if let Ok(files) = std::fs::read_dir(&dir) {
                for f in files.flatten() {
                    let p = f.path();
                    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                    if matches!(ext.as_str(), "jpg" | "jpeg" | "png") {
                        shots.push(p);
                    }
                }
            }
        }
    }

    // Newest first
    shots.sort_by(|a, b| {
        let ta = std::fs::metadata(a).and_then(|m| m.modified()).ok();
        let tb = std::fs::metadata(b).and_then(|m| m.modified()).ok();
        tb.cmp(&ta)
    });

    Ok(shots.into_iter().map(|p| p.to_string_lossy().to_string()).collect())
}

#[tauri::command]
pub fn scan_all_games(app: AppHandle, state: State<DbState>) -> Result<ScanResult, String> {
    log(&app, "info", "=== Scanning Steam ===");
    let steam = scan_steam_games(app.clone(), state.clone())
        .unwrap_or(ScanResult { added: 0, skipped: 0, total: 0 });
    log(&app, "info", "=== Scanning Epic ===");
    let epic = scan_epic_games(app.clone(), state.clone())
        .unwrap_or(ScanResult { added: 0, skipped: 0, total: 0 });
    log(&app, "info", "=== Scanning GOG ===");
    let gog = scan_gog_games(app.clone(), state)
        .unwrap_or(ScanResult { added: 0, skipped: 0, total: 0 });
    log(&app, "ok", &format!(
        "=== All done: {} added, {} skipped, {} total ===",
        steam.added + epic.added + gog.added,
        steam.skipped + epic.skipped + gog.skipped,
        steam.total + epic.total + gog.total,
    ));
    Ok(ScanResult {
        added: steam.added + epic.added + gog.added,
        skipped: steam.skipped + epic.skipped + gog.skipped,
        total: steam.total + epic.total + gog.total,
    })
}

/// Scan a folder recursively for .exe files and bulk-add them as custom games.
/// Looks one or two levels deep for executables, using the parent folder name as the game name.
#[tauri::command]
pub fn scan_folder_for_games(app: AppHandle, state: State<DbState>, folder_path: String) -> Result<ScanResult, String> {
    let root = std::path::Path::new(&folder_path);
    if !root.exists() || !root.is_dir() {
        log(&app, "error", &format!("Folder does not exist: {}", folder_path));
        return Err("Folder does not exist".to_string());
    }
    log(&app, "info", &format!("Scanning folder: {}", folder_path));

    // Common non-game executables to skip
    let skip_names: Vec<&str> = vec![
        "unins", "setup", "install", "update", "crash", "report", "vc_redist",
        "dxsetup", "dotnet", "directx", "unity", "ue4prereq", "launch_", "bootstrap",
    ];

    // ── Phase 1: Walk filesystem — collect candidates, NO mutex ──────────────
    struct GameCandidate {
        game_name: String,
        exe_path: String,
        sub_path: String,
    }

    let mut candidates: Vec<GameCandidate> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(root) {
        for entry in entries.flatten() {
            let sub_path = entry.path();
            if !sub_path.is_dir() {
                continue;
            }
            let game_name = sub_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            let mut best_exe: Option<std::path::PathBuf> = None;
            let mut best_size: u64 = 0;

            // Scan one level deep
            if let Ok(sub_entries) = std::fs::read_dir(&sub_path) {
                for sub_entry in sub_entries.flatten() {
                    let file = sub_entry.path();
                    if file.extension().and_then(|e| e.to_str()) == Some("exe") {
                        let fname_lower = file.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                        if skip_names.iter().any(|s| fname_lower.contains(s)) {
                            continue;
                        }
                        let size = file.metadata().map(|m| m.len()).unwrap_or(0);
                        if size > best_size {
                            best_size = size;
                            best_exe = Some(file);
                        }
                    }
                }
            }

            // Also scan one level deeper (common pattern: GameFolder/bin/game.exe)
            if best_exe.is_none() {
                if let Ok(sub_entries) = std::fs::read_dir(&sub_path) {
                    for sub_entry in sub_entries.flatten() {
                        let deep_path = sub_entry.path();
                        if !deep_path.is_dir() { continue; }
                        if let Ok(deep_entries) = std::fs::read_dir(&deep_path) {
                            for deep_entry in deep_entries.flatten() {
                                let file = deep_entry.path();
                                if file.extension().and_then(|e| e.to_str()) == Some("exe") {
                                    let fname_lower = file.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
                                    if skip_names.iter().any(|s| fname_lower.contains(s)) { continue; }
                                    let size = file.metadata().map(|m| m.len()).unwrap_or(0);
                                    if size > best_size {
                                        best_size = size;
                                        best_exe = Some(file);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if let Some(exe) = best_exe {
                candidates.push(GameCandidate {
                    game_name,
                    exe_path: exe.to_string_lossy().to_string(),
                    sub_path: sub_path.to_string_lossy().to_string(),
                });
            }
        }
    }

    let total = candidates.len();
    log(&app, "info", &format!("Found {} game candidate(s)", total));

    // ── Phase 2: Find covers — NO mutex, exe icon extraction runs here ────────
    struct GameWithCover {
        game_name: String,
        exe_path: String,
        sub_path: String,
        cover: Option<String>,
    }

    let mut games_with_covers: Vec<GameWithCover> = Vec::with_capacity(total);
    for c in candidates {
        log(&app, "info", &format!("--- {}", c.game_name));
        log(&app, "info", &format!("  exe: {}", c.exe_path));
        let cover = if let Some(local) = find_cover_in_dir_internal(&c.sub_path) {
            log(&app, "ok", &format!("  cover: local file ({})", local));
            Some(local)
        } else {
            log(&app, "info", "  no local cover, trying exe icon...");
            let icon = extract_exe_icon_internal(&c.exe_path);
            match &icon {
                Some(_) => log(&app, "ok", "  cover: exe icon ✓"),
                None => log(&app, "warn", "  cover: none"),
            }
            icon
        };
        games_with_covers.push(GameWithCover {
            game_name: c.game_name,
            exe_path: c.exe_path,
            sub_path: c.sub_path,
            cover,
        });
    }

    // ── Phase 3: Lock mutex once, do all DB operations ────────────────────────
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let mut added = 0;
    let mut skipped = 0;

    for g in games_with_covers {
        let already_exists = {
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM games WHERE exe_path = ?1")
                .map_err(|e| e.to_string())?;
            stmt.query_row(rusqlite::params![g.exe_path], |r| r.get::<_, i64>(0))
                .unwrap_or(0) > 0
        };
        if already_exists {
            skipped += 1;
            continue;
        }

        let game = Game {
            id: Uuid::new_v4().to_string(),
            name: g.game_name,
            platform: "custom".to_string(),
            exe_path: Some(g.exe_path),
            install_dir: Some(g.sub_path),
            cover_path: g.cover,
            description: None,
            rating: None,
            status: "none".to_string(),
            is_favorite: false,
            playtime_mins: 0,
            last_played: None,
            date_added: now.clone(),
            steam_app_id: None,
            epic_app_name: None,
            tags: vec![],
            sort_order: 0,
        };
        if queries::insert_game(&conn, &game).is_ok() {
            added += 1;
        }
    }

    log(&app, "ok", &format!("Folder scan done: {} added, {} skipped", added, skipped));
    Ok(ScanResult { added, skipped, total })
}

/// Set a custom cover image for a game by copying the file into the app data directory.
#[tauri::command]
pub fn set_game_cover(state: State<DbState>, game_id: String, image_path: String) -> Result<String, String> {
    let src = std::path::Path::new(&image_path);
    if !src.exists() {
        return Err("Image file not found".to_string());
    }

    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ZGameLib")
        .join("covers");

    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let dest_name = format!("{}.{}", game_id, ext);
    let dest = data_dir.join(&dest_name);

    std::fs::copy(src, &dest).map_err(|e| e.to_string())?;

    let cover_path = dest.to_string_lossy().to_string();

    // Update the game record
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE games SET cover_path = ?1 WHERE id = ?2",
        rusqlite::params![cover_path, game_id],
    ).map_err(|e| e.to_string())?;

    Ok(cover_path)
}

/// Download a remote image URL and return it as a base64 data URI.
/// The result is cached to disk so subsequent calls for the same URL are instant.
#[tauri::command]
pub fn fetch_url_as_base64(url: String) -> Result<String, String> {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ZGameLib")
        .join("url_cache");

    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

    // Derive extension from URL for correct MIME type
    let ext = url.rsplit('.').next().unwrap_or("jpg").to_lowercase();
    let ext = if ext.len() <= 4 && ext.chars().all(|c| c.is_ascii_alphanumeric()) {
        ext
    } else {
        "jpg".to_string()
    };

    let cache_file = data_dir.join(format!("{:x}.{}", md5_simple(&url), ext));

    let data: Vec<u8> = if cache_file.exists() {
        std::fs::read(&cache_file).map_err(|e| e.to_string())?
    } else {
        let response = ureq::get(&url).call().map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        use std::io::Read;
        response.into_reader().read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        let _ = std::fs::write(&cache_file, &bytes);
        bytes
    };

    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/jpeg",
    };

    let mut b64 = String::new();
    {
        use std::io::Write;
        let mut encoder = Base64Encoder::new(&mut b64);
        encoder.write_all(&data).map_err(|e| e.to_string())?;
    }
    Ok(format!("data:{};base64,{}", mime, b64))
}

/// Internal helper — extract exe icon without Tauri State dependency
#[cfg(windows)]
fn extract_exe_icon_internal(exe_path: &str) -> Option<String> {
    use std::process::Command;
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ZGameLib")
        .join("icons");

    std::fs::create_dir_all(&data_dir).ok()?;

    let hash = format!("{:x}", md5_simple(exe_path));
    let dest = data_dir.join(format!("{}.png", hash));

    if dest.exists() {
        return Some(dest.to_string_lossy().to_string());
    }

    let ps_script = format!(
        r#"Add-Type -AssemblyName System.Drawing; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('{}'); if ($icon) {{ $bmp = $icon.ToBitmap(); $bmp.Save('{}', [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $icon.Dispose() }}"#,
        exe_path.replace("'", "''"),
        dest.to_string_lossy().replace("'", "''")
    );

    Command::new("powershell.exe")
        .args(["-ExecutionPolicy", "Bypass", "-Command", &ps_script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;

    if dest.exists() {
        Some(dest.to_string_lossy().to_string())
    } else {
        None
    }
}

#[cfg(not(windows))]
fn extract_exe_icon_internal(_exe_path: &str) -> Option<String> {
    None
}

/// Extract the icon from an exe file using Windows shell API and save as PNG.
#[tauri::command]
pub fn extract_exe_icon(exe_path: String) -> Result<String, String> {
    extract_exe_icon_internal(&exe_path).ok_or_else(|| "Failed to extract icon".to_string())
}

fn md5_simple(input: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.bytes() {
        hash ^= byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

/// Search a game's install directory for cover/poster images.
/// Returns the path to the best image found, or None.
fn find_cover_in_dir_internal(dir: &str) -> Option<String> {
    let dir_path = std::path::Path::new(dir);
    if !dir_path.exists() || !dir_path.is_dir() {
        return None;
    }

    let image_exts = ["jpg", "jpeg", "png", "webp", "bmp"];
    let priority_names = [
        "poster", "cover", "icon", "header", "capsule", "banner",
        "thumbnail", "art", "logo", "key_art", "keyart",
    ];

    let mut best_match: Option<(std::path::PathBuf, u32)> = None; // (path, priority)

    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
            if !image_exts.contains(&ext.as_str()) {
                continue;
            }

            let fname = path.file_stem().unwrap_or_default().to_string_lossy().to_lowercase();

            // Check priority names
            let mut priority = 100u32;
            for (i, name) in priority_names.iter().enumerate() {
                if fname.contains(name) {
                    priority = i as u32;
                    break;
                }
            }

            // Prefer larger images if same priority
            if let Some((_, best_prio)) = &best_match {
                if priority < *best_prio {
                    best_match = Some((path, priority));
                } else if priority == *best_prio {
                    let new_size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let old_size = best_match.as_ref()
                        .and_then(|(p, _)| p.metadata().ok().map(|m| m.len()))
                        .unwrap_or(0);
                    if new_size > old_size {
                        best_match = Some((path, priority));
                    }
                }
            } else {
                best_match = Some((path, priority));
            }
        }
    }

    best_match.map(|(p, _)| p.to_string_lossy().to_string())
}

/// Tauri command: find a cover image in a game's install directory
#[tauri::command]
pub fn find_cover_in_dir(dir_path: String) -> Result<String, String> {
    find_cover_in_dir_internal(&dir_path)
        .ok_or_else(|| "No cover image found in directory".to_string())
}

/// Read a local image file and return it as a base64 data URI.
#[tauri::command]
pub fn read_image_base64(file_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }

    let data = std::fs::read(path).map_err(|e| e.to_string())?;
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => "image/png",
    };

    use std::io::Write;
    let mut b64 = String::new();
    {
        let mut encoder = Base64Encoder::new(&mut b64);
        encoder.write_all(&data).map_err(|e| e.to_string())?;
    }

    Ok(format!("data:{};base64,{}", mime, b64))
}

/// Minimal base64 encoder that writes to a String.
struct Base64Encoder<'a> {
    out: &'a mut String,
    buf: [u8; 3],
    buf_len: usize,
}

impl<'a> Base64Encoder<'a> {
    fn new(out: &'a mut String) -> Self {
        Self { out, buf: [0; 3], buf_len: 0 }
    }

    fn flush_buf(&mut self) {
        const CHARS: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        if self.buf_len == 0 { return; }
        let b = &self.buf;
        match self.buf_len {
            3 => {
                let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | (b[2] as u32);
                self.out.push(CHARS[((n >> 18) & 63) as usize] as char);
                self.out.push(CHARS[((n >> 12) & 63) as usize] as char);
                self.out.push(CHARS[((n >> 6) & 63) as usize] as char);
                self.out.push(CHARS[(n & 63) as usize] as char);
            }
            2 => {
                let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8);
                self.out.push(CHARS[((n >> 18) & 63) as usize] as char);
                self.out.push(CHARS[((n >> 12) & 63) as usize] as char);
                self.out.push(CHARS[((n >> 6) & 63) as usize] as char);
                self.out.push('=');
            }
            1 => {
                let n = (b[0] as u32) << 16;
                self.out.push(CHARS[((n >> 18) & 63) as usize] as char);
                self.out.push(CHARS[((n >> 12) & 63) as usize] as char);
                self.out.push('=');
                self.out.push('=');
            }
            _ => {}
        }
        self.buf_len = 0;
    }
}

impl<'a> std::io::Write for Base64Encoder<'a> {
    fn write(&mut self, data: &[u8]) -> std::io::Result<usize> {
        let mut i = 0;
        while i < data.len() {
            self.buf[self.buf_len] = data[i];
            self.buf_len += 1;
            i += 1;
            if self.buf_len == 3 {
                self.flush_buf();
            }
        }
        Ok(data.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.flush_buf();
        Ok(())
    }
}

impl<'a> Drop for Base64Encoder<'a> {
    fn drop(&mut self) {
        self.flush_buf();
    }
}
