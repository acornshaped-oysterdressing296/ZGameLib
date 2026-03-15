import { create } from "zustand";
import type { Game, SortKey, ViewMode, GameStatus, Platform } from "@/lib/types";

interface Filters {
  platform: Platform | "all";
  status: GameStatus | "all";
  favoritesOnly: boolean;
  minRating: number;
  tags: string[];
}

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

  filteredGames: () => Game[];
}

const defaultFilters: Filters = {
  platform: "all",
  status: "all",
  favoritesOnly: false,
  minRating: 0,
  tags: [],
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

  filteredGames: () => {
    const { games, search, sortKey, sortAsc, filters } = get();
    let result = [...games];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }

    if (filters.platform !== "all") {
      result = result.filter((g) => g.platform === filters.platform);
    }

    if (filters.status !== "all") {
      result = result.filter((g) => g.status === filters.status);
    }

    if (filters.favoritesOnly) {
      result = result.filter((g) => g.is_favorite);
    }

    if (filters.minRating > 0) {
      result = result.filter((g) => g.rating !== null && g.rating >= filters.minRating);
    }

    if (filters.tags.length > 0) {
      result = result.filter((g) =>
        filters.tags.every((t) => g.tags.includes(t))
      );
    }

    result.sort((a, b) => {
      let av: number | string | null = null;
      let bv: number | string | null = null;

      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "rating":
          av = a.rating ?? -1;
          bv = b.rating ?? -1;
          break;
        case "last_played":
          av = a.last_played ?? "";
          bv = b.last_played ?? "";
          break;
        case "date_added":
          av = a.date_added;
          bv = b.date_added;
          break;
        case "playtime_mins":
          av = a.playtime_mins;
          bv = b.playtime_mins;
          break;
      }

      if (av === null || bv === null) return 0;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  },
}));
