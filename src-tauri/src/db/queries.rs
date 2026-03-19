use rusqlite::{Connection, params};
use crate::models::{Game, Note, Collection};

fn row_to_game(row: &rusqlite::Row) -> rusqlite::Result<Game> {
    let tags_str: String = row.get(16)?;
    let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
    let is_fav: i64 = row.get(8)?;
    let is_pinned: i64 = row.get(17).unwrap_or(0);
    let cf_str: String = row.get(19).unwrap_or_else(|_| "{}".to_string());
    let custom_fields: std::collections::HashMap<String, String> = serde_json::from_str(&cf_str).unwrap_or_default();

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
        deleted_at: row.get(18).unwrap_or(None),
        is_pinned: is_pinned != 0,
        custom_fields,
        hltb_main_mins: row.get(20).unwrap_or(None),
        hltb_extra_mins: row.get(21).unwrap_or(None),
        genre: row.get(22).unwrap_or(None),
        developer: row.get(23).unwrap_or(None),
        publisher: row.get(24).unwrap_or(None),
        release_year: row.get(25).unwrap_or(None),
        igdb_skipped: row.get::<_, i64>(26).unwrap_or(0) != 0,
        not_installed: row.get::<_, i64>(27).unwrap_or(0) != 0,
    })
}

const GAME_SELECT: &str =
    "SELECT id, name, platform, exe_path, install_dir, cover_path, description,
            rating, is_favorite, status, playtime_mins, last_played, date_added,
            steam_app_id, epic_app_name, sort_order, tags,
            COALESCE(is_pinned, 0), deleted_at, COALESCE(custom_fields, '{}'),
            hltb_main_mins, hltb_extra_mins,
            genre, developer, publisher, release_year,
            COALESCE(igdb_skipped, 0), COALESCE(not_installed, 0)
     FROM games";

pub fn get_all_games(conn: &Connection) -> anyhow::Result<Vec<Game>> {
    let mut stmt = conn.prepare(
        &format!("{} WHERE deleted_at IS NULL ORDER BY is_pinned DESC, sort_order ASC, name ASC", GAME_SELECT),
    )?;
    let games = stmt
        .query_map([], row_to_game)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(games)
}

pub fn get_trashed_games(conn: &Connection) -> anyhow::Result<Vec<Game>> {
    let mut stmt = conn.prepare(
        &format!("{} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC", GAME_SELECT),
    )?;
    let games = stmt
        .query_map([], row_to_game)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(games)
}

pub fn soft_delete_game(conn: &Connection, id: &str, deleted_at: &str) -> anyhow::Result<()> {
    conn.execute(
        "UPDATE games SET deleted_at = ?1 WHERE id = ?2",
        params![deleted_at, id],
    )?;
    Ok(())
}

pub fn restore_game(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("UPDATE games SET deleted_at = NULL WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn purge_trash(conn: &Connection) -> anyhow::Result<usize> {
    let count = conn.execute("DELETE FROM games WHERE deleted_at IS NOT NULL", [])?;
    Ok(count)
}

pub fn get_game_by_id(conn: &Connection, id: &str) -> anyhow::Result<Option<Game>> {
    let mut stmt = conn.prepare(
        &format!("{} WHERE id = ?1", GAME_SELECT),
    )?;
    let mut rows = stmt.query_map(params![id], row_to_game)?;
    Ok(rows.next().and_then(|r| r.ok()))
}

pub fn insert_game(conn: &Connection, game: &Game) -> anyhow::Result<()> {
    let tags = serde_json::to_string(&game.tags)?;
    let cf = serde_json::to_string(&game.custom_fields).unwrap_or_else(|_| "{}".to_string());
    conn.execute(
        "INSERT INTO games (id, name, platform, exe_path, install_dir, cover_path, description,
                            rating, is_favorite, status, playtime_mins, last_played, date_added,
                            steam_app_id, epic_app_name, sort_order, tags, is_pinned, custom_fields,
                            hltb_main_mins, hltb_extra_mins, genre, developer, publisher, release_year,
                            not_installed)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26)",
        params![
            game.id, game.name, game.platform, game.exe_path, game.install_dir,
            game.cover_path, game.description, game.rating,
            game.is_favorite as i64, game.status, game.playtime_mins,
            game.last_played, game.date_added, game.steam_app_id, game.epic_app_name,
            game.sort_order, tags, game.is_pinned as i64, cf,
            game.hltb_main_mins, game.hltb_extra_mins,
            game.genre, game.developer, game.publisher, game.release_year,
            game.not_installed as i64
        ],
    )?;
    Ok(())
}

pub fn update_game(conn: &Connection, game: &Game) -> anyhow::Result<()> {
    let tags = serde_json::to_string(&game.tags)?;
    let cf = serde_json::to_string(&game.custom_fields).unwrap_or_else(|_| "{}".to_string());
    conn.execute(
        "UPDATE games SET name=?2, cover_path=?3, description=?4, rating=?5,
                          is_favorite=?6, status=?7, playtime_mins=?8, last_played=?9,
                          tags=?10, exe_path=?11, install_dir=?12, is_pinned=?13,
                          custom_fields=?14, hltb_main_mins=?15, hltb_extra_mins=?16,
                          genre=?17, developer=?18, publisher=?19, release_year=?20,
                          not_installed=?21
         WHERE id=?1",
        params![
            game.id, game.name, game.cover_path, game.description, game.rating,
            game.is_favorite as i64, game.status, game.playtime_mins,
            game.last_played, tags, game.exe_path, game.install_dir,
            game.is_pinned as i64, cf, game.hltb_main_mins, game.hltb_extra_mins,
            game.genre, game.developer, game.publisher, game.release_year,
            game.not_installed as i64
        ],
    )?;
    Ok(())
}

pub fn delete_game(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM games WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_cover_path(conn: &Connection, game_id: &str, cover_path: &str) -> anyhow::Result<()> {
    conn.execute(
        "UPDATE games SET cover_path = ?1 WHERE id = ?2",
        params![cover_path, game_id],
    )?;
    Ok(())
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

pub fn get_all_collections(conn: &Connection) -> anyhow::Result<Vec<Collection>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.created_at, COUNT(cg.game_id) as game_count, c.description
         FROM collections c
         LEFT JOIN collection_games cg ON cg.collection_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC",
    )?;
    let collections = stmt
        .query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                game_count: row.get(3)?,
                description: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(collections)
}

pub fn insert_collection(conn: &Connection, id: &str, name: &str, created_at: &str) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO collections (id, name, created_at) VALUES (?1, ?2, ?3)",
        params![id, name, created_at],
    )?;
    Ok(())
}

pub fn rename_collection(conn: &Connection, id: &str, name: &str) -> anyhow::Result<()> {
    conn.execute("UPDATE collections SET name=?2 WHERE id=?1", params![id, name])?;
    Ok(())
}

pub fn delete_collection(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM collections WHERE id=?1", params![id])?;
    Ok(())
}

pub fn get_collection_games(conn: &Connection, collection_id: &str) -> anyhow::Result<Vec<Game>> {
    let mut stmt = conn.prepare(
        &format!(
            "{} INNER JOIN collection_games cg ON cg.game_id = games.id
             WHERE cg.collection_id = ?1 AND games.deleted_at IS NULL
             ORDER BY games.name ASC",
            GAME_SELECT
        ),
    )?;
    let games = stmt
        .query_map(params![collection_id], row_to_game)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(games)
}

pub fn add_game_to_collection(conn: &Connection, collection_id: &str, game_id: &str) -> anyhow::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (?1, ?2)",
        params![collection_id, game_id],
    )?;
    Ok(())
}

pub fn remove_game_from_collection(conn: &Connection, collection_id: &str, game_id: &str) -> anyhow::Result<()> {
    conn.execute(
        "DELETE FROM collection_games WHERE collection_id=?1 AND game_id=?2",
        params![collection_id, game_id],
    )?;
    Ok(())
}

pub fn get_collections_for_game(conn: &Connection, game_id: &str) -> anyhow::Result<Vec<Collection>> {
    let mut stmt = conn.prepare(
        "SELECT c.id, c.name, c.created_at, 0 as game_count, c.description
         FROM collections c
         INNER JOIN collection_games cg ON cg.collection_id = c.id
         WHERE cg.game_id = ?1
         ORDER BY c.name ASC",
    )?;
    let collections = stmt
        .query_map(params![game_id], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                game_count: row.get(3)?,
                description: row.get(4)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(collections)
}

pub fn update_collection_description(conn: &Connection, id: &str, description: Option<&str>) -> anyhow::Result<()> {
    conn.execute("UPDATE collections SET description=?2 WHERE id=?1", params![id, description])?;
    Ok(())
}

pub fn clear_igdb_data(conn: &Connection, id: &str) -> anyhow::Result<()> {
    conn.execute(
        "UPDATE games SET genre=NULL, developer=NULL, publisher=NULL, release_year=NULL, igdb_skipped=1 WHERE id=?1",
        params![id],
    )?;
    Ok(())
}
