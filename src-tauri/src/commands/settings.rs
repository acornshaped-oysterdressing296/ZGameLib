use tauri::State;
use crate::db::{DbState, queries};
use crate::models::{AppSettings, StatusConfig, ImportResult, Game};

const DEFAULT_STATUSES: &str = r##"[
    {"key":"playing","label":"Playing","color":"#4ade80"},
    {"key":"backlog","label":"Backlog","color":"#60a5fa"},
    {"key":"completed","label":"Completed","color":"#a78bfa"},
    {"key":"dropped","label":"Dropped","color":"#f87171"},
    {"key":"on_hold","label":"On Hold","color":"#fbbf24"}
]"##;

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<AppSettings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let statuses_json = queries::get_setting(&conn, "custom_statuses")
        .unwrap_or_else(|| DEFAULT_STATUSES.to_string());
    let custom_statuses: Vec<StatusConfig> =
        serde_json::from_str(&statuses_json).unwrap_or_default();

    Ok(AppSettings {
        theme: queries::get_setting(&conn, "theme").unwrap_or_else(|| "dark".to_string()),
        default_view: queries::get_setting(&conn, "default_view").unwrap_or_else(|| "grid".to_string()),
        steam_path: queries::get_setting(&conn, "steam_path"),
        epic_path: queries::get_setting(&conn, "epic_path"),
        custom_statuses,
        grid_columns: queries::get_setting(&conn, "grid_columns")
            .and_then(|v| v.parse().ok()).unwrap_or(4),
        auto_scan: queries::get_setting(&conn, "auto_scan")
            .map(|v| v == "true").unwrap_or(false),
        show_playtime_on_cards: queries::get_setting(&conn, "show_playtime_on_cards")
            .map(|v| v != "false").unwrap_or(true),
        minimize_on_launch: queries::get_setting(&conn, "minimize_on_launch")
            .map(|v| v == "true").unwrap_or(false),
        start_minimized: queries::get_setting(&conn, "start_minimized")
            .map(|v| v == "true").unwrap_or(false),
        close_to_tray: queries::get_setting(&conn, "close_to_tray")
            .map(|v| v == "true").unwrap_or(false),
        autostart: queries::get_setting(&conn, "autostart")
            .map(|v| v == "true").unwrap_or(false),
    })
}

#[tauri::command]
pub fn save_settings(state: State<DbState>, settings: AppSettings) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "theme", &settings.theme).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "default_view", &settings.default_view).map_err(|e| e.to_string())?;
    if let Some(sp) = &settings.steam_path {
        queries::set_setting(&conn, "steam_path", sp).map_err(|e| e.to_string())?;
    }
    if let Some(ep) = &settings.epic_path {
        queries::set_setting(&conn, "epic_path", ep).map_err(|e| e.to_string())?;
    }
    let statuses_json = serde_json::to_string(&settings.custom_statuses).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "custom_statuses", &statuses_json).map_err(|e| e.to_string())?;
    let grid_columns = settings.grid_columns.clamp(1, 8);
    queries::set_setting(&conn, "grid_columns", &grid_columns.to_string()).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "auto_scan", if settings.auto_scan { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "show_playtime_on_cards", if settings.show_playtime_on_cards { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "minimize_on_launch", if settings.minimize_on_launch { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "start_minimized", if settings.start_minimized { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "close_to_tray", if settings.close_to_tray { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "autostart", if settings.autostart { "true" } else { "false" }).map_err(|e| e.to_string())?;

    #[cfg(windows)]
    {
        use winreg::{RegKey, enums::HKEY_CURRENT_USER};
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok(run) = hkcu.open_subkey_with_flags(
            "Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            winreg::enums::KEY_SET_VALUE,
        ) {
            if settings.autostart {
                if let Ok(exe) = std::env::current_exe() {
                    let _ = run.set_value("ZGameLib", &exe.to_string_lossy().to_string());
                }
            } else {
                let _ = run.delete_value("ZGameLib");
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn import_library(state: State<DbState>, path: String) -> Result<ImportResult, String> {
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let games: Vec<Game> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut added = 0;
    let mut skipped = 0;

    for mut game in games {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM games WHERE id = ?1",
            rusqlite::params![game.id],
            |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;

        if exists { skipped += 1; continue; }

        game.date_added = now.clone();
        if queries::insert_game(&conn, &game).is_ok() { added += 1; }
    }

    Ok(ImportResult { added, skipped })
}

#[tauri::command]
pub fn export_library(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let games = crate::db::queries::get_all_games(&conn).map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&games).map_err(|e| e.to_string())
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

#[tauri::command]
pub fn export_library_csv(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let games = crate::db::queries::get_all_games(&conn).map_err(|e| e.to_string())?;
    let mut csv = String::from("id,name,platform,status,rating,playtime_mins,date_added,is_favorite,tags\n");
    for g in &games {
        let tags = g.tags.join("|");
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\n",
            csv_escape(&g.id),
            csv_escape(&g.name),
            csv_escape(&g.platform),
            csv_escape(&g.status),
            g.rating.map(|r| r.to_string()).unwrap_or_default(),
            g.playtime_mins,
            csv_escape(&g.date_added),
            g.is_favorite,
            csv_escape(&tags),
        ));
    }
    Ok(csv)
}

#[tauri::command]
pub fn export_games_by_ids(state: State<DbState>, ids: Vec<String>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let games = crate::db::queries::get_all_games(&conn).map_err(|e| e.to_string())?;
    let id_set: std::collections::HashSet<String> = ids.into_iter().collect();
    let filtered: Vec<_> = games.into_iter().filter(|g| id_set.contains(&g.id)).collect();
    serde_json::to_string_pretty(&filtered).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_for_update(ts: u64) -> Result<serde_json::Value, String> {
    let url = format!("https://zsync.eu/zgamelib/version.json?t={}", ts);
    let response = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(15))
        .call()
        .map_err(|e| e.to_string())?;
    let body = response.into_string().map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    Ok(json)
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_portable_mode() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("portable.flag").exists()))
        .unwrap_or(false)
}
