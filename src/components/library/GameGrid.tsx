import { AnimatePresence, motion, Reorder } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/store/useGameStore";
import { useFilteredGames } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import GameCard from "./GameCard";
import GameListRow from "./GameListRow";
import EmptyState from "@/components/ui/EmptyState";
import { useUIStore } from "@/store/useUIStore";
import { SearchIcon } from "@/components/ui/Icons";

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

function SkeletonGrid({ columns }: { columns: number }) {
  return (
    <div
      className="p-6 grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] rounded-2xl glass-strong animate-pulse"
        />
      ))}
    </div>
  );
}

export default function GameGrid({ isLoading = false }: { isLoading?: boolean }) {
  const games = useFilteredGames();
  const allGamesRaw = useGameStore((s) => s.games);
  const viewMode = useGameStore((s) => s.viewMode);
  const sortKey = useGameStore((s) => s.sortKey);
  const setGames = useGameStore((s) => s.setGames);
  const setAddGameOpen = useUIStore((s) => s.setAddGameOpen);
  const search = useGameStore((s) => s.search);
  const filters = useGameStore((s) => s.filters);
  const resetFilters = useGameStore((s) => s.resetFilters);
  const setSearch = useGameStore((s) => s.setSearch);
  const { data: appSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const gridColumns = appSettings?.grid_columns ?? 4;

  if (isLoading && games.length === 0) {
    return <SkeletonGrid columns={gridColumns} />;
  }

  const hasActiveFilters = search.trim() !== "" || filters.platform !== "all" || filters.status !== "all" || filters.favoritesOnly || filters.minRating > 0 || filters.tags.length > 0 || filters.dateAddedFrom !== null || filters.dateAddedTo !== null;

  if (games.length === 0 && allGamesRaw.length > 0 && hasActiveFilters) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-28 gap-5 text-center"
      >
        <div className="w-20 h-20 rounded-2xl glass-strong flex items-center justify-center">
          <SearchIcon size={32} className="text-slate-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-300">No games match your filters</h3>
          <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
            {search.trim() ? `No results for "${search}"` : "Try adjusting your filters to see more games"}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { resetFilters(); setSearch(""); }}
          className="btn-primary mt-2"
        >
          Clear Filters
        </motion.button>
      </motion.div>
    );
  }

  if (games.length === 0) {
    return (
      <EmptyState
        title="No games found"
        description="Add your first game or run a scan to import your Steam and Epic library."
        action={
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setAddGameOpen(true)}
            className="btn-primary mt-2"
          >
            Add Game
          </motion.button>
        }
      />
    );
  }

  if (sortKey === "sort_order") {
    return (
      <Reorder.Group
        axis="y"
        values={games}
        onReorder={(newOrder) => {
          const ids = newOrder.map((g) => g.id);
          api.reorderGames(ids).catch(() => {});
          const idSet = new Set(ids);
          const updated = newOrder.map((g, i) => ({ ...g, sort_order: i }));
          setGames([...updated, ...allGamesRaw.filter((g) => !idSet.has(g.id))]);
        }}
        className="flex flex-col gap-0.5 p-4"
      >
        {games.map((g) => (
          <Reorder.Item key={g.id} value={g} className="list-none">
            <GameListRow game={g} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-0.5 p-4 page-enter">
        <div className="flex items-center gap-4 px-4 py-2.5 text-[10px] text-slate-700 font-semibold uppercase tracking-[0.15em]"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
          <div className="w-10 shrink-0" />
          <div className="flex-1">Name</div>
          <div className="hidden lg:block w-40">Tags</div>
          <div className="hidden md:block w-20 text-right">Playtime</div>
          <div className="w-14 text-right">Rating</div>
          <div className="w-24" />
        </div>
        <AnimatePresence mode="popLayout">
          {games.map((g) => (
            <GameListRow key={g.id} game={g} />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className="p-6 grid gap-4"
      style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
    >
      {games.map((g) => (
        <motion.div
          key={g.id}
          variants={itemVariants}
          initial="hidden"
          animate="show"
        >
          <GameCard game={g} />
        </motion.div>
      ))}
    </div>
  );
}
