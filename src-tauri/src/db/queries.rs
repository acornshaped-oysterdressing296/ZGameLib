use rusqlite::{Connection, params};
use crate::models::{Game, Note};

fn row_to_game(row: &rusqlite::Row) -> rusqlite::Result<Game> {
    let tags_str: String = row.get(16)?;
    let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
    let is_fav: i64 = row.get(8)?;

    Ok(Game {
        id: row.get(0)?,
        name: row.get(1)?,
        platform: row.get(2)?,
        exe_path: row.get(3)?,
        install_dir: row.get(4)?,
        cover_path: row.get(5)?,
        description: row.get(6)?,
        rating: row.get(7)?,
        is_favorite: is_fav != 0,
        status: row.get(9)?,
        playtime_mins: row.get(10)?,
        last_played: row.get(11)?,
        date_added: row.get(12)?,
        steam_app_id: row.get(13)?,
        epic_app_name: row.get(14)?,
        sort_order: row.get(15)?,
        tags,
    })
}

pub fn get_all_games(conn: &Connection) -> anyhow::Result<Vec<Game>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, platform, exe_path, install_dir, cover_path, description,
                rating, is_favorite, status, playtime_mins, last_played, date_added,
                steam_app_id, epic_app_name, sort_order, tags
         FROM games ORDER BY sort_order ASC, name ASC",
    )?;
    let games = stmt
        .query_map([], row_to_game)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(games)
}

pub fn get_game_by_id(conn: &Connection, id: &str) -> anyhow::Result<Option<Game>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, platform, exe_path, install_dir, cover_path, description,
                rating, is_favorite, status, playtime_mins, last_played, date_added,
                steam_app_id, epic_app_name, sort_order, tags
         FROM games WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], row_to_game)?;
    Ok(rows.next().and_then(|r| r.ok()))
}

pub fn insert_game(conn: &Connection, game: &Game) -> anyhow::Result<()> {
    let tags = serde_json::to_string(&game.tags)?;
    conn.execute(
        "INSERT INTO games (id, name, platform, exe_path, install_dir, cover_path, description,
                            rating, is_favorite, status, playtime_mins, last_played, date_added,
                            steam_app_id, epic_app_name, sort_order, tags)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)",
        params![
            game.id, game.name, game.platform, game.exe_path, game.install_dir,
            game.cover_path, game.description, game.rating,
            game.is_favorite as i64, game.status, game.playtime_mins,
            game.last_played, game.date_added, game.steam_app_id, game.epic_app_name,
            game.sort_order, tags
        ],
    )?;
    Ok(())
}

pub fn update_game(conn: &Connection, game: &Game) -> anyhow::Result<()> {
    let tags = serde_json::to_string(&game.tags)?;
    conn.execute(
        "UPDATE games SET name=?2, cover_path=?3, description=?4, rating=?5,
                          is_favorite=?6, status=?7, playtime_mins=?8, last_played=?9,
                          tags=?10, exe_path=?11, install_dir=?12
         WHERE id=?1",
        params![
            game.id, game.name, game.cover_path, game.description, game.rating,
            game.is_favorite as i64, game.status, game.playtime_mins,
            game.last_played, tags, game.exe_path, game.install_dir
        ],
    )?;
    Ok(())
}

pub fn delete_game(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM games WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_steam_game_cover(conn: &Connection, steam_app_id: &str) -> Option<(String, Option<String>)> {
    conn.query_row(
        "SELECT id, cover_path FROM games WHERE steam_app_id = ?1",
        params![steam_app_id],
        |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?)),
    )
    .ok()
}

pub fn get_epic_game_cover(conn: &Connection, epic_app_name: &str) -> Option<(String, Option<String>)> {
    conn.query_row(
        "SELECT id, cover_path FROM games WHERE epic_app_name = ?1",
        params![epic_app_name],
        |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?)),
    )
    .ok()
}

pub fn update_cover_path(conn: &Connection, game_id: &str, cover_path: &str) -> anyhow::Result<()> {
    conn.execute(
        "UPDATE games SET cover_path = ?1 WHERE id = ?2",
        params![cover_path, game_id],
    )?;
    Ok(())
}

pub fn game_exists_by_steam_id(conn: &Connection, steam_app_id: &str) -> bool {
    get_steam_game_cover(conn, steam_app_id).is_some()
}

pub fn game_exists_by_epic_name(conn: &Connection, epic_app_name: &str) -> bool {
    get_epic_game_cover(conn, epic_app_name).is_some()
}

pub fn get_notes_for_game(conn: &Connection, game_id: &str) -> anyhow::Result<Vec<Note>> {
    let mut stmt = conn.prepare(
        "SELECT id, game_id, content, created_at, updated_at FROM notes WHERE game_id = ?1 ORDER BY created_at DESC",
    )?;
    let notes = stmt
        .query_map(params![game_id], |row| {
            Ok(Note {
                id: row.get(0)?,
                game_id: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(notes)
}

pub fn insert_note(conn: &Connection, note: &Note) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO notes (id, game_id, content, created_at, updated_at) VALUES (?1,?2,?3,?4,?5)",
        params![note.id, note.game_id, note.content, note.created_at, note.updated_at],
    )?;
    Ok(())
}

pub fn update_note(conn: &Connection, note: &Note) -> anyhow::Result<()> {
    conn.execute(
        "UPDATE notes SET content=?2, updated_at=?3 WHERE id=?1",
        params![note.id, note.content, note.updated_at],
    )?;
    Ok(())
}

pub fn delete_note(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |r| r.get(0),
    )
    .ok()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )?;
    Ok(())
}
