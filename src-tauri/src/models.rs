use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub exe_path: Option<String>,
    pub install_dir: Option<String>,
    pub cover_path: Option<String>,
    pub description: Option<String>,
    pub rating: Option<f64>,
    pub status: String,
    pub is_favorite: bool,
    pub playtime_mins: i64,
    pub last_played: Option<String>,
    pub date_added: String,
    pub steam_app_id: Option<String>,
    pub epic_app_name: Option<String>,
    pub tags: Vec<String>,
    pub sort_order: i64,
    pub deleted_at: Option<String>,
    pub is_pinned: bool,
    #[serde(default)]
    pub custom_fields: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub hltb_main_mins: Option<i64>,
    #[serde(default)]
    pub hltb_extra_mins: Option<i64>,
    #[serde(default)]
    pub genre: Option<String>,
    #[serde(default)]
    pub developer: Option<String>,
    #[serde(default)]
    pub publisher: Option<String>,
    #[serde(default)]
    pub release_year: Option<i64>,
    #[serde(default)]
    pub igdb_skipped: bool,
    #[serde(default)]
    pub not_installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub created_at: String,
    #[serde(default)]
    pub game_count: i64,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub game_id: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGamePayload {
    pub name: String,
    pub platform: String,
    pub exe_path: Option<String>,
    pub install_dir: Option<String>,
    pub cover_path: Option<String>,
    pub steam_app_id: Option<String>,
    pub epic_app_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateGamePayload {
    pub id: String,
    pub name: Option<String>,
    pub cover_path: Option<String>,
    pub description: Option<String>,
    pub rating: Option<f64>,
    pub status: Option<String>,
    pub is_favorite: Option<bool>,
    pub playtime_mins: Option<i64>,
    pub tags: Option<Vec<String>>,
    pub exe_path: Option<String>,
    pub install_dir: Option<String>,
    pub custom_fields: Option<std::collections::HashMap<String, String>>,
    pub genre: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub release_year: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgdbMetadata {
    pub genre: Option<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub release_year: Option<i64>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HltbData {
    pub main_mins: Option<i64>,
    pub extra_mins: Option<i64>,
    pub complete_mins: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub game_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub duration_mins: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub added: usize,
    pub skipped: usize,
    pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub added: usize,
    pub skipped: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullExport {
    pub version: u32,
    pub games: Vec<Game>,
    pub sessions: Vec<Session>,
    pub notes: Vec<Note>,
    #[serde(default)]
    pub collections: Vec<Collection>,
    #[serde(default)]
    pub collection_games: Vec<CollectionGameEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollectionGameEntry {
    pub collection_id: String,
    pub game_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyPlaytime {
    pub week: String,
    pub mins: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryGrowthEntry {
    pub month: String,
    pub steam: i64,
    pub epic: i64,
    pub gog: i64,
    pub custom: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoverCandidate {
    pub name: String,
    pub app_id: String,
    pub cover_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusConfig {
    pub key: String,
    pub label: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub default_view: String,
    pub steam_path: Option<String>,
    pub epic_path: Option<String>,
    pub custom_statuses: Vec<StatusConfig>,
    pub grid_columns: u32,
    pub auto_scan: bool,
    pub show_playtime_on_cards: bool,
    pub minimize_on_launch: bool,
    pub start_minimized: bool,
    pub close_to_tray: bool,
    pub autostart: bool,
    pub playtime_reminders: bool,
    pub igdb_client_id: Option<String>,
    pub igdb_client_secret: Option<String>,
    #[serde(default)]
    pub custom_themes: String,
    #[serde(default)]
    pub pagination_enabled: bool,
    #[serde(default = "default_page_size")]
    pub pagination_page_size: u32,
    #[serde(default)]
    pub steam_api_key: Option<String>,
    #[serde(default)]
    pub steam_id_64: Option<String>,
    #[serde(default = "default_true")]
    pub exclude_idle_time: bool,
    #[serde(default)]
    pub include_uninstalled_steam: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullUninstalledResult {
    pub added: usize,
    pub skipped: usize,
}

fn default_page_size() -> u32 { 24 }

fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SteamSyncResult {
    pub updated: usize,
    pub skipped: usize,
}
