import { create } from "zustand";
import type { Game, SortKey, ViewMode, GameStatus, Platform } from "@/lib/types";

interface Filters {
  platform: Platform | "all";
  status: GameStatus | "all";
  favoritesOnly: boolean;
  minRating: number;
  tags: string[];
  dateAddedFrom: string | null;
  dateAddedTo: string | null;
  hasCover: boolean | null;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: Filters;
}

const SAVED_FILTERS_KEY = "zgamelib-saved-filters";

interface GameStore {
  games: Game[];
  setGames: (games: Game[]) => void;
  updateGame: (game: Game) => void;
  removeGame: (id: string) => void;
  addGame: (game: Game) => void;

  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;

  search: string;
  setSearch: (s: string) => void;

  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortAsc: boolean;
  setSortAsc: (v: boolean) => void;

  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;

  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;

  hiddenIds: string[];
  showHidden: boolean;
  hideGames: (ids: string[]) => void;
  toggleShowHidden: () => void;
  restoreAllHidden: () => void;

  savedFilters: SavedFilter[];
  saveCurrentFilter: (name: string) => void;
  deleteSavedFilter: (id: string) => void;
  applySavedFilter: (saved: SavedFilter) => void;

  searchScope: "name" | "all";
  setSearchScope: (scope: "name" | "all") => void;
}

const defaultFilters: Filters = {
  platform: "all",
  status: "all",
  favoritesOnly: false,
  minRating: 0,
  tags: [],
  dateAddedFrom: null,
  dateAddedTo: null,
  hasCover: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  games: [],
  setGames: (games) => set({ games }),
  updateGame: (updated) =>
    set((s) => ({ games: s.games.map((g) => (g.id === updated.id ? updated : g)) })),
  removeGame: (id) => set((s) => ({ games: s.games.filter((g) => g.id !== id) })),
  addGame: (game) => set((s) => ({ games: [game, ...s.games] })),

  selectedGameId: null,
  setSelectedGameId: (id) => set({ selectedGameId: id }),

  search: "",
  setSearch: (search) => set({ search }),

  sortKey: "name",
  setSortKey: (sortKey) => set({ sortKey }),
  sortAsc: true,
  setSortAsc: (sortAsc) => set({ sortAsc }),

  viewMode: "grid",
  setViewMode: (viewMode) => set({ viewMode }),

  filters: defaultFilters,
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: defaultFilters }),

  hiddenIds: [],
  showHidden: false,
  hideGames: (ids) => set((s) => ({ hiddenIds: [...new Set([...s.hiddenIds, ...ids])] })),
  toggleShowHidden: () => set((s) => ({ showHidden: !s.showHidden })),
  restoreAllHidden: () => set({ hiddenIds: [], showHidden: false }),

  savedFilters: (() => {
    try { return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) ?? "[]") as SavedFilter[]; } catch { return []; }
  })(),
  saveCurrentFilter: (name) => set((s) => {
    const entry: SavedFilter = { id: crypto.randomUUID(), name, filters: { ...s.filters } };
    const next = [...s.savedFilters, entry];
    try { localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next)); } catch {}
    return { savedFilters: next };
  }),
  deleteSavedFilter: (id) => set((s) => {
    const next = s.savedFilters.filter((f) => f.id !== id);
    try { localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(next)); } catch {}
    return { savedFilters: next };
  }),
  applySavedFilter: (saved) => set({ filters: { ...saved.filters } }),

  searchScope: "name",
  setSearchScope: (searchScope) => set({ searchScope }),
}));
