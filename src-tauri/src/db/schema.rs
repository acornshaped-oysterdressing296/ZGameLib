use rusqlite::Connection;

pub fn create_tables(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS games (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            platform      TEXT NOT NULL,
            exe_path      TEXT,
            install_dir   TEXT,
            cover_path    TEXT,
            description   TEXT,
            rating        REAL,
            status        TEXT NOT NULL DEFAULT 'none',
            is_favorite   INTEGER NOT NULL DEFAULT 0,
            playtime_mins INTEGER NOT NULL DEFAULT 0,
            last_played   TEXT,
            date_added    TEXT NOT NULL,
            steam_app_id  TEXT UNIQUE,
            epic_app_name TEXT UNIQUE,
            tags          TEXT NOT NULL DEFAULT '[]',
            sort_order    INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS notes (
            id         TEXT PRIMARY KEY,
            game_id    TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            content    TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id            TEXT PRIMARY KEY,
            game_id       TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            started_at    TEXT NOT NULL,
            ended_at      TEXT NOT NULL,
            duration_mins INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_games_platform    ON games(platform);
        CREATE INDEX IF NOT EXISTS idx_games_is_fav      ON games(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_games_status      ON games(status);
        CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played);
        CREATE INDEX IF NOT EXISTS idx_notes_game_id     ON notes(game_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_game_id  ON sessions(game_id);
        ",
    )?;
    let _ = conn.execute("ALTER TABLE games ADD COLUMN deleted_at TEXT", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN custom_fields TEXT NOT NULL DEFAULT '{}'", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN hltb_main_mins INTEGER", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN hltb_extra_mins INTEGER", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN genre TEXT", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN developer TEXT", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN publisher TEXT", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN release_year INTEGER", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN igdb_skipped INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE games ADD COLUMN not_installed INTEGER NOT NULL DEFAULT 0", []);

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS collections (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS collection_games (
            collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            game_id       TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            PRIMARY KEY (collection_id, game_id)
        );

        CREATE INDEX IF NOT EXISTS idx_collection_games_cid ON collection_games(collection_id);
        CREATE INDEX IF NOT EXISTS idx_collection_games_gid ON collection_games(game_id);
        ",
    )?;
    let _ = conn.execute("ALTER TABLE collections ADD COLUMN description TEXT", []);

    Ok(())
}
