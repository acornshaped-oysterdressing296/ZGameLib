use tauri::State;
use chrono::Utc;
use uuid::Uuid;
use crate::db::{DbState, queries};
use crate::models::{Game, Note, CreateGamePayload, UpdateGamePayload};

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

    queries::update_game(&conn, &game).map_err(|e| e.to_string())?;
    Ok(game)
}

#[tauri::command]
pub fn delete_game(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    queries::delete_game(&conn, &id).map_err(|e| e.to_string())
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

// Notes

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
    // fetch existing note
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
