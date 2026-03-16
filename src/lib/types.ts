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
}

export interface Note {
  id: string;
  game_id: string;
  content: string;
  created_at: string;
  updated_at: string;
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
}

export interface ImportResult {
  added: number;
  skipped: number;
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

export type SortKey = "name" | "rating" | "last_played" | "date_added" | "playtime_mins";
export type ViewMode = "grid" | "list";
