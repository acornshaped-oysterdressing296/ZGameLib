export type Platform = "steam" | "epic" | "gog" | "custom";
export type GameStatus = "none" | "backlog" | "playing" | "completed" | "dropped" | "on_hold";

export interface Game {
  id: string;
  name: string;
  platform: Platform;
  exe_path: string | null;
  install_dir: string | null;
  cover_path: string | null;
  description: string | null;
  rating: number | null;
  status: GameStatus;
  is_favorite: boolean;
  playtime_mins: number;
  last_played: string | null;
  date_added: string;
  steam_app_id: string | null;
  epic_app_name: string | null;
  tags: string[];
  sort_order: number;
  deleted_at: string | null;
  is_pinned: boolean;
  custom_fields: Record<string, string>;
  hltb_main_mins: number | null;
  hltb_extra_mins: number | null;
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  release_year: number | null;
  igdb_skipped: boolean;
  not_installed: boolean;
}

export interface Collection {
  id: string;
  name: string;
  created_at: string;
  game_count: number;
  description: string | null;
}

export interface Note {
  id: string;
  game_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  game_id: string;
  started_at: string;
  ended_at: string;
  duration_mins: number;
}

export interface CreateGamePayload {
  name: string;
  platform: Platform;
  exe_path?: string;
  install_dir?: string;
  cover_path?: string;
  steam_app_id?: string;
  epic_app_name?: string;
}

export interface UpdateGamePayload {
  id: string;
  name?: string;
  cover_path?: string;
  description?: string;
  rating?: number;
  status?: GameStatus;
  is_favorite?: boolean;
  playtime_mins?: number;
  tags?: string[];
  exe_path?: string;
  install_dir?: string;
  custom_fields?: Record<string, string>;
  genre?: string;
  developer?: string;
  publisher?: string;
  release_year?: number;
}

export interface IgdbMetadata {
  genre: string | null;
  developer: string | null;
  publisher: string | null;
  release_year: number | null;
  summary: string | null;
}

export interface HltbData {
  main_mins: number | null;
  extra_mins: number | null;
  complete_mins: number | null;
}

export interface ScanResult {
  added: number;
  skipped: number;
  total: number;
}

export interface StatusConfig {
  key: string;
  label: string;
  color: string;
}

export interface AppSettings {
  theme: string;
  default_view: string;
  steam_path: string | null;
  epic_path: string | null;
  custom_statuses: StatusConfig[];
  grid_columns: number;
  auto_scan: boolean;
  show_playtime_on_cards: boolean;
  minimize_on_launch: boolean;
  start_minimized: boolean;
  close_to_tray: boolean;
  autostart: boolean;
  playtime_reminders: boolean;
  igdb_client_id: string | null;
  igdb_client_secret: string | null;
  custom_themes: string;
  pagination_enabled: boolean;
  pagination_page_size: number;
  steam_api_key: string | null;
  steam_id_64: string | null;
  exclude_idle_time: boolean;
  include_uninstalled_steam: boolean;
  onboarding_completed: boolean;
  onboarding_tour_mode: string;
  last_seen_version: string;
}

export interface PullUninstalledResult {
  added: number;
  skipped: number;
}

export interface CustomTheme {
  id: string;
  name: string;
  accent: string;
  bg: string;
  sidebar: string;
}

export interface ImportResult {
  added: number;
  skipped: number;
}

export interface FetchCoversResult {
  updated: number;
  failed: number;
}

export interface CoverCandidate {
  name: string;
  app_id: string;
  cover_url: string;
}

export interface UpdateInfo {
  version: string;
  notes: string;
  url: string;
  published: string;
}

export interface WeeklyPlaytime {
  week: string;
  mins: number;
}

export interface LibraryGrowthEntry {
  month: string;
  steam: number;
  epic: number;
  gog: number;
  custom: number;
}

export interface SteamSyncResult {
  updated: number;
  skipped: number;
}

export type FilterField = "platform" | "status" | "rating" | "playtime" | "tags" | "date_added" | "is_favorite" | "has_cover" | "not_installed";
export type FilterOperator = "=" | "!=" | ">=" | "<=" | "contains" | "not_contains";
export interface FilterRule {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}
export type FilterLogic = "and" | "or";

export type SortKey = "name" | "rating" | "last_played" | "date_added" | "playtime_mins" | "sort_order";
export type ViewMode = "grid" | "list";

export interface GameSummary {
  id: string;
  name: string;
  cover_path: string | null;
  platform: string;
  rating: number | null;
  playtime_mins: number;
}

export interface YearInReview {
  total_sessions: number;
  total_hours: number;
  most_played: GameSummary | null;
  top_rated: GameSummary | null;
  games_completed: number;
  new_games_added: number;
  platform_breakdown: Record<string, number>;
  longest_session_mins: number;
  busiest_month: string | null;
  total_unique_games_played: number;
}

export interface ModInfo {
  name: string;
  file_name: string;
  size_bytes: number;
}

export interface ModLoaderStatus {
  bepinex_installed: boolean;
  melonloader_installed: boolean;
  mods_folder: string | null;
  mods: ModInfo[];
}

