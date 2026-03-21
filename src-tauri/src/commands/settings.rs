use tauri::State;
use crate::db::{DbState, queries};
use crate::models::{AppSettings, StatusConfig, ImportResult, Game, Session, Note, FullExport, CollectionGameEntry, SteamSyncResult, PullUninstalledResult, YearInReview, GameSummary};

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
            .and_then(|v| v.parse().ok()).unwrap_or(6),
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
        igdb_client_id: queries::get_setting(&conn, "igdb_client_id").filter(|v| !v.is_empty()),
        igdb_client_secret: queries::get_setting(&conn, "igdb_client_secret").filter(|v| !v.is_empty()),
        custom_themes: queries::get_setting(&conn, "custom_themes").unwrap_or_else(|| "[]".to_string()),
        pagination_enabled: queries::get_setting(&conn, "pagination_enabled")
            .map(|v| v == "true").unwrap_or(false),
        pagination_page_size: queries::get_setting(&conn, "pagination_page_size")
            .and_then(|v| v.parse().ok()).unwrap_or(24),
        steam_api_key: queries::get_setting(&conn, "steam_api_key").filter(|v| !v.is_empty()),
        steam_id_64: queries::get_setting(&conn, "steam_id_64").filter(|v| !v.is_empty()),
        exclude_idle_time: queries::get_setting(&conn, "exclude_idle_time")
            .map(|v| v != "false").unwrap_or(true),
        include_uninstalled_steam: queries::get_setting(&conn, "include_uninstalled_steam")
            .map(|v| v == "true").unwrap_or(false),
        onboarding_completed: queries::get_setting(&conn, "onboarding_completed")
            .map(|v| v == "true").unwrap_or(false),
        onboarding_tour_mode: queries::get_setting(&conn, "onboarding_tour_mode")
            .unwrap_or_default(),
        last_seen_version: queries::get_setting(&conn, "last_seen_version")
            .unwrap_or_default(),
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
    let grid_columns = settings.grid_columns.clamp(0, 8);
    queries::set_setting(&conn, "grid_columns", &grid_columns.to_string()).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "auto_scan", if settings.auto_scan { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "show_playtime_on_cards", if settings.show_playtime_on_cards { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "minimize_on_launch", if settings.minimize_on_launch { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "start_minimized", if settings.start_minimized { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "close_to_tray", if settings.close_to_tray { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "autostart", if settings.autostart { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "playtime_reminders", if settings.playtime_reminders { "true" } else { "false" }).map_err(|e| e.to_string())?;
    if let Some(ref v) = settings.igdb_client_id {
        queries::set_setting(&conn, "igdb_client_id", v).map_err(|e| e.to_string())?;
    }
    if let Some(ref v) = settings.igdb_client_secret {
        queries::set_setting(&conn, "igdb_client_secret", v).map_err(|e| e.to_string())?;
    }
    queries::set_setting(&conn, "custom_themes", &settings.custom_themes).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "pagination_enabled", if settings.pagination_enabled { "true" } else { "false" }).map_err(|e| e.to_string())?;
    let page_size = settings.pagination_page_size.clamp(6, 200);
    queries::set_setting(&conn, "pagination_page_size", &page_size.to_string()).map_err(|e| e.to_string())?;
    if let Some(ref v) = settings.steam_api_key {
        queries::set_setting(&conn, "steam_api_key", v).map_err(|e| e.to_string())?;
    }
    if let Some(ref v) = settings.steam_id_64 {
        queries::set_setting(&conn, "steam_id_64", v).map_err(|e| e.to_string())?;
    }
    queries::set_setting(&conn, "exclude_idle_time", if settings.exclude_idle_time { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "include_uninstalled_steam", if settings.include_uninstalled_steam { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "onboarding_completed", if settings.onboarding_completed { "true" } else { "false" }).map_err(|e| e.to_string())?;
    queries::set_setting(&conn, "onboarding_tour_mode", &settings.onboarding_tour_mode).map_err(|e| e.to_string())?;

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

    let (games, sessions, notes, collections, collection_games) = if raw.is_array() {
        let g: Vec<Game> = serde_json::from_value(raw).unwrap_or_default();
        (g, vec![], vec![], vec![], vec![])
    } else {
        let export: FullExport = serde_json::from_str(&json).map_err(|e| e.to_string())?;
        (export.games, export.sessions, export.notes, export.collections, export.collection_games)
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

    for collection in collections {
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM collections WHERE id = ?1",
            rusqlite::params![collection.id], |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;
        if exists { continue; }
        let _ = conn.execute(
            "INSERT INTO collections (id, name, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![collection.id, collection.name, collection.created_at],
        );
    }

    for cg in collection_games {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (?1, ?2)",
            rusqlite::params![cg.collection_id, cg.game_id],
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

    let collections = crate::db::queries::get_all_collections(&conn).unwrap_or_default();
    let mut cg_stmt = conn.prepare(
        "SELECT collection_id, game_id FROM collection_games ORDER BY collection_id ASC"
    ).map_err(|e| e.to_string())?;
    let collection_games: Vec<CollectionGameEntry> = cg_stmt.query_map([], |r| {
        Ok(CollectionGameEntry { collection_id: r.get(0)?, game_id: r.get(1)? })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    drop(cg_stmt);

    let export = FullExport { version: 3, games, sessions, notes, collections, collection_games };
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
    let mut csv = String::from("id,name,platform,status,rating,playtime_mins,date_added,is_favorite,tags,genre,developer,publisher,release_year\n");
    for g in &games {
        let tags = g.tags.join("|");
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{},{},{}\n",
            csv_escape(&g.id),
            csv_escape(&g.name),
            csv_escape(&g.platform),
            csv_escape(&g.status),
            g.rating.map(|r| r.to_string()).unwrap_or_default(),
            g.playtime_mins,
            csv_escape(&g.date_added),
            g.is_favorite,
            csv_escape(&tags),
            csv_escape(g.genre.as_deref().unwrap_or("")),
            csv_escape(g.developer.as_deref().unwrap_or("")),
            csv_escape(g.publisher.as_deref().unwrap_or("")),
            g.release_year.map(|y| y.to_string()).unwrap_or_default(),
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
    let target = std::path::Path::new(&path);
    let parent = target.parent().ok_or("Invalid path")?;
    if !parent.exists() {
        return Err("Parent directory does not exist".to_string());
    }
    let canonical_parent = parent.canonicalize().map_err(|e| e.to_string())?;
    let file_name = target.file_name().ok_or("Invalid path: no file name")?;
    let canonical_target = canonical_parent.join(file_name);

    let allowed = allowed_write_dirs();
    let allowed_canonical: Vec<_> = allowed.iter()
        .filter_map(|d| d.canonicalize().ok())
        .collect();

    if !allowed_canonical.iter().any(|base| canonical_target.starts_with(base)) {
        return Err("Write to this location is not permitted".to_string());
    }

    std::fs::write(&canonical_target, content).map_err(|e| e.to_string())
}

fn allowed_write_dirs() -> Vec<std::path::PathBuf> {
    let mut dirs = Vec::new();
    if let Some(appdata) = std::env::var_os("APPDATA") {
        dirs.push(std::path::PathBuf::from(appdata));
    }
    if let Some(localappdata) = std::env::var_os("LOCALAPPDATA") {
        dirs.push(std::path::PathBuf::from(localappdata));
    }
    if let Some(profile) = std::env::var_os("USERPROFILE") {
        let home = std::path::PathBuf::from(profile);
        dirs.push(home.join("Documents"));
        dirs.push(home.join("Desktop"));
        dirs.push(home.join("Downloads"));
        dirs.push(home.join("OneDrive"));
    }
    dirs
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

#[tauri::command]
pub fn save_setting(state: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::set_setting(&conn, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_year_in_review(state: State<DbState>, year: i32) -> Result<YearInReview, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let year_start = format!("{}-01-01", year);
    let year_end = format!("{}-01-01", year + 1);

    let (total_sessions, total_hours, longest_session_mins) = {
        let mut stmt = conn.prepare(
            "SELECT COUNT(*), COALESCE(SUM(duration_mins), 0.0), COALESCE(MAX(duration_mins), 0) FROM sessions WHERE started_at >= ?1 AND started_at < ?2"
        ).map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![year_start, year_end], |r| {
            Ok((
                r.get::<_, i64>(0).unwrap_or(0) as usize,
                r.get::<_, f64>(1).unwrap_or(0.0) / 60.0,
                r.get::<_, i64>(2).unwrap_or(0),
            ))
        }).unwrap_or((0, 0.0, 0))
    };

    let most_played = {
        let mut stmt = conn.prepare(
            "SELECT g.id, g.name, g.cover_path, g.platform, g.rating, SUM(s.duration_mins) as tm
             FROM sessions s JOIN games g ON s.game_id = g.id
             WHERE s.started_at >= ?1 AND s.started_at < ?2 AND g.deleted_at IS NULL
             GROUP BY s.game_id ORDER BY tm DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![year_start, year_end], |r| {
            Ok(GameSummary { id: r.get(0)?, name: r.get(1)?, cover_path: r.get(2)?, platform: r.get(3)?, rating: r.get(4)?, playtime_mins: r.get(5)? })
        }).ok()
    };

    let top_rated = {
        let mut stmt = conn.prepare(
            "SELECT g.id, g.name, g.cover_path, g.platform, g.rating, g.playtime_mins
             FROM games g WHERE g.deleted_at IS NULL AND g.rating IS NOT NULL
             AND (g.date_added >= ?1 AND g.date_added < ?2
                  OR EXISTS (SELECT 1 FROM sessions s WHERE s.game_id = g.id AND s.started_at >= ?1 AND s.started_at < ?2))
             ORDER BY g.rating DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![year_start, year_end, year_start, year_end], |r| {
            Ok(GameSummary { id: r.get(0)?, name: r.get(1)?, cover_path: r.get(2)?, platform: r.get(3)?, rating: r.get(4)?, playtime_mins: r.get(5)? })
        }).ok()
    };

    let games_completed: usize = conn.query_row(
        "SELECT COUNT(*) FROM games WHERE status = 'completed' AND last_played >= ?1 AND last_played < ?2 AND deleted_at IS NULL",
        rusqlite::params![year_start, year_end], |r| r.get::<_, i64>(0)
    ).unwrap_or(0) as usize;

    let new_games_added: usize = conn.query_row(
        "SELECT COUNT(*) FROM games WHERE date_added >= ?1 AND date_added < ?2 AND deleted_at IS NULL",
        rusqlite::params![year_start, year_end], |r| r.get::<_, i64>(0)
    ).unwrap_or(0) as usize;

    let platform_breakdown = {
        let mut stmt = conn.prepare(
            "SELECT g.platform, COUNT(DISTINCT s.game_id) FROM sessions s
             JOIN games g ON s.game_id = g.id
             WHERE s.started_at >= ?1 AND s.started_at < ?2 AND g.deleted_at IS NULL
             GROUP BY g.platform"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![year_start, year_end], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
        }).map_err(|e| e.to_string())?;
        let mut map = std::collections::HashMap::new();
        for row in rows.filter_map(|r| r.ok()) {
            map.insert(row.0, row.1 as usize);
        }
        map
    };

    let busiest_month = {
        let mut stmt = conn.prepare(
            "SELECT strftime('%m', started_at) as mo, COUNT(*) as cnt FROM sessions
             WHERE started_at >= ?1 AND started_at < ?2 GROUP BY mo ORDER BY cnt DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;
        stmt.query_row(rusqlite::params![year_start, year_end], |r| r.get::<_, String>(0)).ok()
            .and_then(|m| {
                const MONTHS: [&str; 12] = ["January","February","March","April","May","June",
                                             "July","August","September","October","November","December"];
                m.parse::<usize>().ok().and_then(|n| MONTHS.get(n.saturating_sub(1)).map(|s| s.to_string()))
            })
    };

    let total_unique_games_played: usize = conn.query_row(
        "SELECT COUNT(DISTINCT game_id) FROM sessions WHERE started_at >= ?1 AND started_at < ?2",
        rusqlite::params![year_start, year_end], |r| r.get::<_, i64>(0)
    ).unwrap_or(0) as usize;

    Ok(YearInReview {
        total_sessions,
        total_hours,
        most_played,
        top_rated,
        games_completed,
        new_games_added,
        platform_breakdown,
        longest_session_mins,
        busiest_month,
        total_unique_games_played,
    })
}

#[tauri::command]
pub fn sync_steam_playtime(state: State<DbState>, api_key: String, steam_id: String) -> Result<SteamSyncResult, String> {
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1?key={}&steamid={}&include_played_free_games=1&format=json",
        api_key, steam_id
    );
    let response = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(30))
        .call()
        .map_err(|e| e.to_string())?;
    let body = response.into_string().map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    let games_arr = json["response"]["games"]
        .as_array()
        .ok_or("No games data returned from Steam API")?;

    let steam_map: std::collections::HashMap<String, i64> = games_arr
        .iter()
        .filter_map(|g| {
            let appid = g["appid"].as_i64()?.to_string();
            let playtime = g["playtime_forever"].as_i64().unwrap_or(0);
            Some((appid, playtime))
        })
        .collect();

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, steam_app_id, playtime_mins FROM games WHERE steam_app_id IS NOT NULL AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, i64)> = stmt.query_map([], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, i64>(2)?))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    drop(stmt);

    let mut updated = 0usize;
    let mut skipped = 0usize;

    for (id, app_id, local_playtime) in rows {
        if let Some(&steam_playtime) = steam_map.get(&app_id) {
            if steam_playtime > local_playtime {
                conn.execute(
                    "UPDATE games SET playtime_mins = ?1 WHERE id = ?2",
                    rusqlite::params![steam_playtime, id],
                ).map_err(|e| e.to_string())?;
                updated += 1;
            } else {
                skipped += 1;
            }
        } else {
            skipped += 1;
        }
    }

    Ok(SteamSyncResult { updated, skipped })
}

#[tauri::command]
pub fn pull_uninstalled_steam_games(state: State<DbState>, api_key: String, steam_id: String) -> Result<PullUninstalledResult, String> {
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1?key={}&steamid={}&include_played_free_games=1&include_appinfo=1&format=json",
        api_key, steam_id
    );
    let response = ureq::get(&url)
        .timeout(std::time::Duration::from_secs(30))
        .call()
        .map_err(|e| e.to_string())?;
    let body = response.into_string().map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    let games_arr = json["response"]["games"]
        .as_array()
        .ok_or("No games returned — verify your API key and SteamID64 are correct")?;

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let mut added = 0usize;
    let mut skipped = 0usize;

    for entry in games_arr {
        let appid = match entry["appid"].as_i64() {
            Some(id) => id.to_string(),
            None => { skipped += 1; continue; }
        };
        let name = match entry["name"].as_str() {
            Some(n) if !n.is_empty() => n.to_string(),
            _ => { skipped += 1; continue; }
        };
        let playtime = entry["playtime_forever"].as_i64().unwrap_or(0);

        let exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM games WHERE steam_app_id = ?1 AND deleted_at IS NULL",
            rusqlite::params![appid],
            |r| r.get::<_, i64>(0),
        ).unwrap_or(0) > 0;

        if exists { skipped += 1; continue; }

        let cover = format!("https://cdn.steamstatic.com/steam/apps/{}/library_600x900.jpg", appid);

        let game = Game {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            platform: "steam".to_string(),
            exe_path: None,
            install_dir: None,
            cover_path: Some(cover),
            description: None,
            rating: None,
            status: "none".to_string(),
            is_favorite: false,
            playtime_mins: playtime,
            last_played: None,
            date_added: now.clone(),
            steam_app_id: Some(appid),
            epic_app_name: None,
            tags: vec![],
            sort_order: 0,
            deleted_at: None,
            is_pinned: false,
            custom_fields: std::collections::HashMap::new(),
            hltb_main_mins: None,
            hltb_extra_mins: None,
            genre: None,
            developer: None,
            publisher: None,
            release_year: None,
            igdb_skipped: false,
            not_installed: true,
        };
        if queries::insert_game(&conn, &game).is_ok() {
            added += 1;
        } else {
            skipped += 1;
        }
    }

    Ok(PullUninstalledResult { added, skipped })
}
