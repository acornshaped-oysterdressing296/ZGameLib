use tauri::State;
use chrono::Utc;
use uuid::Uuid;
use crate::db::{DbState, queries};
use crate::models::{Game, Note, Session, CreateGamePayload, UpdateGamePayload, HltbData, WeeklyPlaytime, IgdbMetadata, LibraryGrowthEntry};

#[tauri::command]
pub fn get_all_games(state: State<DbState>) -> Result<Vec<Game>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_all_games(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_game(state: State<DbState>, id: String) -> Result<Option<Game>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_game_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_game(state: State<DbState>, payload: CreateGamePayload) -> Result<Game, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let game = Game {
        id: Uuid::new_v4().to_string(),
        name: payload.name,
        platform: payload.platform,
        exe_path: payload.exe_path,
        install_dir: payload.install_dir,
        cover_path: payload.cover_path,
        description: None,
        rating: None,
        status: "none".to_string(),
        is_favorite: false,
        playtime_mins: 0,
        last_played: None,
        date_added: now,
        steam_app_id: payload.steam_app_id,
        epic_app_name: payload.epic_app_name,
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
        not_installed: false,
    };
    queries::insert_game(&conn, &game).map_err(|e| e.to_string())?;
    Ok(game)
}

#[tauri::command]
pub fn update_game(state: State<DbState>, payload: UpdateGamePayload) -> Result<Game, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut game = queries::get_game_by_id(&conn, &payload.id)
        .map_err(|e| e.to_string())?
        .ok_or("Game not found")?;

    if let Some(ref name) = payload.name {
        if name.len() > 255 { return Err("Name must be 255 characters or fewer".to_string()); }
    }
    if let Some(ref desc) = payload.description {
        if desc.len() > 10_000 { return Err("Description must be 10,000 characters or fewer".to_string()); }
    }
    if let Some(ref tags) = payload.tags {
        if tags.len() > 100 { return Err("Maximum 100 tags allowed".to_string()); }
        if tags.iter().any(|t| t.len() > 50) { return Err("Each tag must be 50 characters or fewer".to_string()); }
    }
    if let Some(ref status) = payload.status {
        const VALID_STATUSES: &[&str] = &["none", "backlog", "playing", "completed", "dropped", "on_hold"];
        if !VALID_STATUSES.contains(&status.as_str()) {
            return Err(format!("Invalid status '{}'. Must be one of: none, backlog, playing, completed, dropped, on_hold", status));
        }
    }

    if let Some(name) = payload.name { game.name = name; }
    if let Some(cover) = payload.cover_path { game.cover_path = Some(cover); }
    if let Some(desc) = payload.description { game.description = Some(desc); }
    if let Some(rating) = payload.rating { game.rating = Some(rating); }
    if let Some(status) = payload.status { game.status = status; }
    if let Some(fav) = payload.is_favorite { game.is_favorite = fav; }
    if let Some(pt) = payload.playtime_mins { game.playtime_mins = pt; }
    if let Some(tags) = payload.tags { game.tags = tags; }
    if let Some(exe) = payload.exe_path { game.exe_path = Some(exe); }
    if let Some(dir) = payload.install_dir { game.install_dir = Some(dir); }
    if let Some(cf) = payload.custom_fields { game.custom_fields = cf; }
    if let Some(v) = payload.genre { game.genre = if v.is_empty() { None } else { Some(v) }; }
    if let Some(v) = payload.developer { game.developer = if v.is_empty() { None } else { Some(v) }; }
    if let Some(v) = payload.publisher { game.publisher = if v.is_empty() { None } else { Some(v) }; }
    if let Some(v) = payload.release_year { game.release_year = Some(v); }

    queries::update_game(&conn, &game).map_err(|e| e.to_string())?;
    Ok(game)
}

#[tauri::command]
pub fn delete_game(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    queries::soft_delete_game(&conn, &id, &now).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn permanent_delete_game(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_game(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn restore_game(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::restore_game(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn purge_trash(state: State<DbState>) -> Result<usize, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::purge_trash(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_trashed_games(state: State<DbState>) -> Result<Vec<Game>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_trashed_games(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_pinned(state: State<DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut game = queries::get_game_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    game.is_pinned = !game.is_pinned;
    queries::update_game(&conn, &game).map_err(|e| e.to_string())?;
    Ok(game.is_pinned)
}

#[tauri::command]
pub fn toggle_favorite(state: State<DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut game = queries::get_game_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    game.is_favorite = !game.is_favorite;
    queries::update_game(&conn, &game).map_err(|e| e.to_string())?;
    Ok(game.is_favorite)
}

#[tauri::command]
pub fn check_exe_health(state: State<DbState>, id: String) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let game = queries::get_game_by_id(&conn, &id)
        .map_err(|e| e.to_string())?
        .ok_or("Game not found")?;
    match &game.exe_path {
        Some(p) if !p.is_empty() => Ok(std::path::Path::new(p).exists()),
        _ => Ok(false),
    }
}

#[tauri::command]
pub fn get_notes(state: State<DbState>, game_id: String) -> Result<Vec<Note>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::get_notes_for_game(&conn, &game_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(state: State<DbState>, game_id: String, content: String) -> Result<Note, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();
    let note = Note {
        id: Uuid::new_v4().to_string(),
        game_id,
        content,
        created_at: now.clone(),
        updated_at: now,
    };
    queries::insert_note(&conn, &note).map_err(|e| e.to_string())?;
    Ok(note)
}

#[tauri::command]
pub fn update_note(state: State<DbState>, id: String, content: String) -> Result<Note, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, game_id, content, created_at, updated_at FROM notes WHERE id=?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query_map(rusqlite::params![id], |row| {
        Ok(Note {
            id: row.get(0)?,
            game_id: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut note = rows.next().ok_or("Note not found")?.map_err(|e| e.to_string())?;
    note.content = content;
    note.updated_at = Utc::now().to_rfc3339();
    queries::update_note(&conn, &note).map_err(|e| e.to_string())?;
    Ok(note)
}

#[tauri::command]
pub fn delete_note(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_note(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_games(state: State<DbState>, ids: Vec<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for (i, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE games SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i64, id],
        ).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn fetch_hltb_data(state: State<DbState>, game_id: String, game_name: String) -> Result<Option<HltbData>, String> {
    let raw = match ureq::get("https://howlongtobeat.com/")
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .call()
    {
        Ok(r) => r.into_string().unwrap_or_default(),
        Err(_) => return Ok(None),
    };

    let hash = {
        let needle = "/api/search/";
        raw.find(needle)
            .and_then(|i| {
                let after = &raw[i + needle.len()..];
                let end = after.find('"').unwrap_or(after.len().min(20));
                let h = &after[..end];
                if h.len() >= 8 && h.len() <= 40 { Some(h.to_string()) } else { None }
            })
    };

    let hash = match hash {
        Some(h) => h,
        None => return Ok(None),
    };

    let url = format!("https://howlongtobeat.com/api/search/{}", hash);
    let body = serde_json::json!({
        "searchType": "games",
        "searchTerms": [game_name],
        "searchPage": 1,
        "size": 1,
        "searchOptions": {
            "games": {
                "userId": 0,
                "platform": "",
                "sortCategory": "popular",
                "rangeCategory": "main",
                "rangeTime": {"min": null, "max": null},
                "gameplay": {"perspective": "", "flow": "", "genre": "", "subGenre": ""},
                "rangeYear": {"min": "", "max": ""},
                "modifier": ""
            },
            "users": {"sortCategory": "postcount"},
            "lists": {"sortCategory": "follows"},
            "filter": "",
            "sort": 0,
            "randomizer": 0
        }
    });

    let resp = match ureq::post(&url)
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .set("Referer", "https://howlongtobeat.com/")
        .set("Content-Type", "application/json")
        .send_string(&body.to_string())
    {
        Ok(r) => r.into_string().unwrap_or_default(),
        Err(_) => return Ok(None),
    };

    let json: serde_json::Value = match serde_json::from_str(&resp) {
        Ok(v) => v,
        Err(_) => return Ok(None),
    };

    let entry = match json["data"].as_array().and_then(|a| a.first()) {
        Some(e) => e.clone(),
        None => return Ok(None),
    };

    let secs_to_mins = |v: &serde_json::Value| -> Option<i64> {
        v.as_i64().filter(|&s| s > 0).map(|s| s / 60)
    };

    let data = HltbData {
        main_mins: secs_to_mins(&entry["comp_main"]),
        extra_mins: secs_to_mins(&entry["comp_plus"]),
        complete_mins: secs_to_mins(&entry["comp_100"]),
    };

    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "UPDATE games SET hltb_main_mins = ?1, hltb_extra_mins = ?2 WHERE id = ?3",
            rusqlite::params![data.main_mins, data.extra_mins, game_id],
        );
    }

    Ok(Some(data))
}

#[tauri::command]
pub fn get_sessions(state: State<DbState>, game_id: String) -> Result<Vec<Session>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, game_id, started_at, ended_at, duration_mins FROM sessions WHERE game_id = ?1 ORDER BY started_at DESC LIMIT 50"
    ).map_err(|e| e.to_string())?;
    let sessions = stmt.query_map(rusqlite::params![game_id], |row| {
        Ok(Session {
            id: row.get(0)?,
            game_id: row.get(1)?,
            started_at: row.get(2)?,
            ended_at: row.get(3)?,
            duration_mins: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    Ok(sessions)
}

#[tauri::command]
pub fn get_weekly_playtime(state: State<DbState>) -> Result<Vec<WeeklyPlaytime>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT strftime('%Y-%W', started_at) as week, SUM(duration_mins) as mins FROM sessions GROUP BY week ORDER BY week DESC LIMIT 12"
    ).map_err(|e| e.to_string())?;
    let mut rows: Vec<WeeklyPlaytime> = stmt.query_map([], |row| {
        Ok(WeeklyPlaytime {
            week: row.get(0)?,
            mins: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    rows.reverse();
    Ok(rows)
}

#[tauri::command]
pub fn batch_update_games(
    state: State<DbState>,
    ids: Vec<String>,
    status: Option<String>,
    rating: Option<f64>,
    tags_to_add: Option<Vec<String>>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for id in &ids {
        let mut game = match queries::get_game_by_id(&conn, id).map_err(|e| e.to_string())? {
            Some(g) => g,
            None => continue,
        };
        if let Some(ref s) = status { game.status = s.clone(); }
        if let Some(r) = rating { game.rating = Some(r); }
        if let Some(ref new_tags) = tags_to_add {
            for t in new_tags {
                if !game.tags.contains(t) { game.tags.push(t.clone()); }
            }
        }
        queries::update_game(&conn, &game).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_library_growth(state: State<DbState>) -> Result<Vec<LibraryGrowthEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT strftime('%Y-%m', date_added) as month, platform, COUNT(*) as cnt
         FROM games WHERE deleted_at IS NULL AND date_added IS NOT NULL
         GROUP BY month, platform ORDER BY month ASC"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, i64)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();
    drop(stmt);

    let mut month_map: std::collections::BTreeMap<String, LibraryGrowthEntry> = std::collections::BTreeMap::new();
    for (month, platform, cnt) in rows {
        let entry = month_map.entry(month.clone()).or_insert(LibraryGrowthEntry {
            month,
            steam: 0, epic: 0, gog: 0, custom: 0,
        });
        match platform.as_str() {
            "steam"  => entry.steam  += cnt,
            "epic"   => entry.epic   += cnt,
            "gog"    => entry.gog    += cnt,
            "custom" => entry.custom += cnt,
            _ => {}
        }
    }

    Ok(month_map.into_values().collect())
}

#[tauri::command]
pub fn fetch_igdb_metadata(
    state: State<DbState>,
    game_id: String,
    game_name: String,
    client_id: String,
    client_secret: String,
) -> Result<Option<IgdbMetadata>, String> {
    if client_id.trim().is_empty() || client_secret.trim().is_empty() {
        return Err("IGDB client_id and client_secret are required".to_string());
    }

    let token_url = "https://id.twitch.tv/oauth2/token";
    let token_body = format!(
        "client_id={}&client_secret={}&grant_type=client_credentials",
        client_id.trim(), client_secret.trim()
    );
    let token_resp = ureq::post(token_url)
        .set("Content-Type", "application/x-www-form-urlencoded")
        .timeout(std::time::Duration::from_secs(15))
        .send_string(&token_body)
        .map_err(|e| format!("Failed to get IGDB token: {}", e))?;
    let token_json: serde_json::Value = serde_json::from_str(
        &token_resp.into_string().map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;
    let access_token = token_json["access_token"]
        .as_str()
        .ok_or("Failed to parse access token")?
        .to_string();

    let query = format!(
        "fields name,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,first_release_date,summary; search \"{}\"; limit 5;",
        game_name.replace('"', "")
    );
    let igdb_resp = ureq::post("https://api.igdb.com/v4/games")
        .set("Client-ID", client_id.trim())
        .set("Authorization", &format!("Bearer {}", access_token))
        .set("Content-Type", "text/plain")
        .timeout(std::time::Duration::from_secs(15))
        .send_string(&query)
        .map_err(|e| format!("IGDB request failed: {}", e))?;
    let igdb_games: serde_json::Value = serde_json::from_str(
        &igdb_resp.into_string().map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    let entry = match igdb_games.as_array().and_then(|a| a.first()) {
        Some(e) => e.clone(),
        None => return Ok(None),
    };

    let genre = entry["genres"].as_array()
        .and_then(|a| a.first())
        .and_then(|g| g["name"].as_str())
        .map(|s| s.to_string());

    let mut developer: Option<String> = None;
    let mut publisher: Option<String> = None;
    if let Some(companies) = entry["involved_companies"].as_array() {
        for ic in companies {
            let name = ic["company"]["name"].as_str().map(|s| s.to_string());
            if ic["developer"].as_bool().unwrap_or(false) && developer.is_none() {
                developer = name.clone();
            }
            if ic["publisher"].as_bool().unwrap_or(false) && publisher.is_none() {
                publisher = name;
            }
        }
    }

    let release_year = entry["first_release_date"].as_i64().map(|ts| {
        let dt = chrono::DateTime::<chrono::Utc>::from_timestamp(ts, 0)
            .unwrap_or_else(|| chrono::Utc::now());
        dt.format("%Y").to_string().parse::<i64>().unwrap_or(0)
    });

    let summary = entry["summary"].as_str().map(|s| s.to_string());

    let meta = IgdbMetadata {
        genre: genre.clone(),
        developer: developer.clone(),
        publisher: publisher.clone(),
        release_year,
        summary: summary.clone(),
    };

    {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "UPDATE games SET genre=?1, developer=?2, publisher=?3, release_year=?4 WHERE id=?5",
            rusqlite::params![genre, developer, publisher, release_year, game_id],
        );
        if let Some(ref s) = summary {
            let _ = conn.execute(
                "UPDATE games SET description=?1 WHERE id=?2 AND (description IS NULL OR description = '')",
                rusqlite::params![s, game_id],
            );
        }
    }

    Ok(Some(meta))
}

#[tauri::command]
pub fn clear_igdb_data(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::clear_igdb_data(&conn, &id).map_err(|e| e.to_string())
}
