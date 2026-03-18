use tauri::State;
use crate::db::{DbState, queries};
use crate::models::{AppSettings, StatusConfig, ImportResult, Game, Session, Note, FullExport};

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
        playtime_reminders: queries::get_setting(&conn, "playtime_reminders")
            .map(|v| v != "false").unwrap_or(true),
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
    queries::set_setting(&conn, "playtime_reminders", if settings.playtime_reminders { "true" } else { "false" }).map_err(|e| e.to_string())?;

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
    let raw: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    let (games, sessions, notes): (Vec<Game>, Vec<Session>, Vec<Note>) = if raw.is_array() {
        (serde_json::from_value(raw).unwrap_or_default(), vec![], vec![])
    } else {
        let export: FullExport = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        (export.games, export.sessions, export.notes)
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut added = 0;
    let mut skipped = 0;

    const VALID_PLATFORMS: &[&str] = &["steam", "epic", "gog", "custom"];

    for mut game in games {
        if game.name.is_empty() || game.name.len() > 255 { skipped += 1; continue; }
        if let Some(r) = game.rating { if r < 0.0 || r > 10.0 { skipped += 1; continue; } }
        if !VALID_PLATFORMS.contains(&game.platform.as_str()) { skipped += 1; continue; }
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM games WHERE id = ?1",
            rusqlite::params![game.id], |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;
        if exists { skipped += 1; continue; }
        game.date_added = now.clone();
        if queries::insert_game(&conn, &game).is_ok() { added += 1; }
    }

    for note in notes {
        let game_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM games WHERE id = ?1",
            rusqlite::params![note.game_id], |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;
        if !game_exists { continue; }
        let note_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM notes WHERE id = ?1",
            rusqlite::params![note.id], |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;
        if note_exists { continue; }
        let _ = conn.execute(
            "INSERT INTO notes (id, game_id, content, created_at, updated_at) VALUES (?1,?2,?3,?4,?5)",
            rusqlite::params![note.id, note.game_id, note.content, note.created_at, note.updated_at],
        );
    }

    for session in sessions {
        let game_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM games WHERE id = ?1",
            rusqlite::params![session.game_id], |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;
        if !game_exists { continue; }
        let session_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM sessions WHERE id = ?1",
            rusqlite::params![session.id], |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;
        if session_exists { continue; }
        let _ = conn.execute(
            "INSERT INTO sessions (id, game_id, started_at, ended_at, duration_mins) VALUES (?1,?2,?3,?4,?5)",
            rusqlite::params![session.id, session.game_id, session.started_at, session.ended_at, session.duration_mins],
        );
    }

    Ok(ImportResult { added, skipped })
}

#[tauri::command]
pub fn export_library(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let games = crate::db::queries::get_all_games(&conn).map_err(|e| e.to_string())?;
    let mut s_stmt = conn.prepare(
        "SELECT id, game_id, started_at, ended_at, duration_mins FROM sessions ORDER BY started_at ASC"
    ).map_err(|e| e.to_string())?;
    let sessions: Vec<Session> = s_stmt.query_map([], |r| Ok(Session {
        id: r.get(0)?, game_id: r.get(1)?, started_at: r.get(2)?,
        ended_at: r.get(3)?, duration_mins: r.get(4)?,
    })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    drop(s_stmt);
    let mut n_stmt = conn.prepare(
        "SELECT id, game_id, content, created_at, updated_at FROM notes ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;
    let notes: Vec<Note> = n_stmt.query_map([], |r| Ok(Note {
        id: r.get(0)?, game_id: r.get(1)?, content: r.get(2)?,
        created_at: r.get(3)?, updated_at: r.get(4)?,
    })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    drop(n_stmt);
    let export = FullExport { version: 2, games, sessions, notes };
    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
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
