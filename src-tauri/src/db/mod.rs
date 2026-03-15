pub mod schema;
pub mod queries;

use rusqlite::Connection;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn init_db() -> anyhow::Result<Connection> {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("ZGameLib");

    std::fs::create_dir_all(&data_dir)?;

    let db_path = data_dir.join("zgamelib.db");
    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    schema::create_tables(&conn)?;

    Ok(conn)
}
