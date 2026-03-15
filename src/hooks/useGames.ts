import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import type { UpdateGamePayload, CreateGamePayload } from "@/lib/types";

export function useGames() {
  const setGames = useGameStore((s) => s.setGames);
  const updateGameInStore = useGameStore((s) => s.updateGame);
  const removeFromStore = useGameStore((s) => s.removeGame);
  const addToStore = useGameStore((s) => s.addGame);
  const addToast = useUIStore((s) => s.addToast);
  const qc = useQueryClient();

  const { isLoading } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const [games, settings] = await Promise.all([api.getAllGames(), api.getSettings()]);
      setGames(games);
      if (settings.custom_statuses?.length > 0) {
        useUIStore.getState().setCustomStatuses(settings.custom_statuses);
      }
      return games;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateGamePayload) => api.updateGame(payload),
    onSuccess: (game) => {
      updateGameInStore(game);
      qc.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (e) => addToast(String(e), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteGame(id),
    onSuccess: (_, id) => {
      removeFromStore(id);
      addToast("Game removed from library");
    },
    onError: (e) => addToast(String(e), "error"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateGamePayload) => api.createGame(payload),
    onSuccess: (game) => {
      addToStore(game);
      addToast(`"${game.name}" added to library`);
    },
    onError: (e) => addToast(String(e), "error"),
  });

  const toggleFavMutation = useMutation({
    mutationFn: (id: string) => api.toggleFavorite(id),
    onSuccess: (isFav, id) => {
      const games = useGameStore.getState().games;
      const game = games.find((g) => g.id === id);
      if (game) updateGameInStore({ ...game, is_favorite: isFav });
    },
  });

  return {
    isLoading,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    create: createMutation.mutate,
    toggleFavorite: toggleFavMutation.mutate,
  };
}

export function useScan() {
  const setGames = useGameStore((s) => s.setGames);
  const addToast = useUIStore((s) => s.addToast);
  const setScanning = useUIStore((s) => s.setScanning);
  const qc = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: () => api.scanAll(),
    onMutate: () => setScanning(true),
    onSuccess: (result) => {
      setScanning(false);
      addToast(
        result.added > 0
          ? `Scan complete — ${result.added} new game${result.added !== 1 ? "s" : ""} found`
          : "Scan complete — no new games found",
        result.added > 0 ? "success" : "info"
      );
      qc.invalidateQueries({ queryKey: ["games"] });
    },
    onError: (e) => {
      setScanning(false);
      addToast(String(e), "error");
    },
  });

  return { scan: scanMutation.mutate, isScanning: scanMutation.isPending };
}

export function useFilteredGames() {
  const games = useGameStore((s) => s.games);
  const search = useGameStore((s) => s.search);
  const sortKey = useGameStore((s) => s.sortKey);
  const sortAsc = useGameStore((s) => s.sortAsc);
  const filters = useGameStore((s) => s.filters);

  return useMemo(() => {
    let result = [...games];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (filters.platform !== "all") result = result.filter((g) => g.platform === filters.platform);
    if (filters.status !== "all") result = result.filter((g) => g.status === filters.status);
    if (filters.favoritesOnly) result = result.filter((g) => g.is_favorite);
    if (filters.minRating > 0) result = result.filter((g) => g.rating !== null && g.rating >= filters.minRating);
    if (filters.tags.length > 0) result = result.filter((g) => filters.tags.every((t) => g.tags.includes(t)));

    result.sort((a, b) => {
      let av: number | string = "";
      let bv: number | string = "";
      switch (sortKey) {
        case "name": av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case "rating": av = a.rating ?? -1; bv = b.rating ?? -1; break;
        case "last_played": av = a.last_played ?? ""; bv = b.last_played ?? ""; break;
        case "date_added": av = a.date_added; bv = b.date_added; break;
        case "playtime_mins": av = a.playtime_mins; bv = b.playtime_mins; break;
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [games, search, sortKey, sortAsc, filters]);
}
