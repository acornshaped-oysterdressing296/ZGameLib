pub mod schema;
pub mod queries;

use rusqlite::Connection;
use std::sync::{Arc, Mutex};

pub struct DbState(pub Arc<Mutex<Connection>>);

pub struct IgdbTokenState(pub Mutex<Option<(String, u64)>>);

impl IgdbTokenState {
    pub fn new() -> Self {
        IgdbTokenState(Mutex::new(None))
    }
}

pub fn init_db() -> anyhow::Result<Connection> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    let data_dir = if exe_dir
        .as_ref()
        .map(|d| d.join("portable.flag").exists())
        .unwrap_or(false)
    {
        exe_dir.unwrap()
    } else {
        dirs::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("ZGameLib")
    };

    std::fs::create_dir_all(&data_dir)?;

    let db_path = data_dir.join("zgamelib.db");
    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    schema::create_tables(&conn)?;

    Ok(conn)
}
