import { AnimatePresence, motion, Reorder } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useFilteredGames, useScan } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import GameCard from "./GameCard";
import GameListRow from "./GameListRow";
import BatchActionBar from "./BatchActionBar";
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
      style={{ gridTemplateColumns: columns === 0 ? "repeat(auto-fill, minmax(180px, 1fr))" : `repeat(${columns}, minmax(0, 1fr))` }}
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

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 py-6 px-4">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </motion.button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-[12px] text-slate-600">…</span>
        ) : (
          <motion.button
            key={p}
            whileTap={{ scale: 0.92 }}
            onClick={() => onPage(p as number)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-medium transition-all duration-150"
            style={
              p === page
                ? {
                    background: "linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-700)))",
                    border: "1px solid rgba(var(--accent-400), 0.3)",
                    color: "white",
                    boxShadow: "0 0 16px rgba(var(--accent-500), 0.25)",
                  }
                : {
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#94a3b8",
                  }
            }
          >
            {p}
          </motion.button>
        )
      )}

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </motion.button>
    </div>
  );
}

export default function GameGrid({ isLoading = false }: { isLoading?: boolean }) {
  const games = useFilteredGames();
  const { scan } = useScan();
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
  const gridColumns = appSettings?.grid_columns ?? 6;
  const paginationEnabled = appSettings?.pagination_enabled ?? false;
  const pageSize = appSettings?.pagination_page_size ?? 24;

  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, filters, paginationEnabled, pageSize]);

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
    const onboardingDone = appSettings?.onboarding_completed ?? false;

    if (onboardingDone) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center py-20 gap-6 text-center px-6"
        >
          <div className="relative">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl glass-strong flex items-center justify-center"
              style={{ boxShadow: "0 0 40px rgb(var(--accent-500) / 0.15), 0 16px 40px rgba(0,0,0,0.3)", border: "1px solid rgb(var(--accent-500) / 0.15)" }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-accent-400"><rect x="3" y="7" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 14H10M9 11H10M14 14H15M14 11H15M12 7V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </motion.div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-300 mb-1">Your library is empty</h3>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">Get started by scanning for games or adding one manually.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-md">
            {[
              { label: "Scan Steam / Epic / GOG", desc: "Auto-detect installed games", onClick: () => scan() },
              { label: "Add a game manually", desc: "Pick an exe or folder", onClick: () => setAddGameOpen(true) },
              { label: "Browse Steam library", desc: "Import owned games", onClick: () => setAddGameOpen(true) },
            ].map((card, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={card.onClick}
                className="flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="text-[12px] font-medium text-slate-300">{card.label}</span>
                <span className="text-[10px] text-slate-600">{card.desc}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      );
    }

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

  const totalPages = paginationEnabled ? Math.max(1, Math.ceil(games.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const visibleGames = paginationEnabled ? games.slice((safePage - 1) * pageSize, safePage * pageSize) : games;

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
        {visibleGames.map((g) => (
          <Reorder.Item key={g.id} value={g} className="list-none">
            <GameListRow game={g} />
          </Reorder.Item>
        ))}
        {paginationEnabled && totalPages > 1 && (
          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        )}
      </Reorder.Group>
    );
  }

  if (viewMode === "list") {
    return (
      <>
        <div className="flex flex-col gap-0.5 p-4 page-enter">
          <div className="flex items-center gap-4 px-4 py-2.5 text-[10px] text-slate-700 font-semibold uppercase tracking-[0.15em]"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            <div className="w-5 shrink-0" />
            <div className="w-10 shrink-0" />
            <div className="flex-1">Name</div>
            <div className="hidden lg:block w-40">Tags</div>
            <div className="hidden md:block w-20 text-right">Playtime</div>
            <div className="w-14 text-right">Rating</div>
            <div className="w-24" />
          </div>
          <AnimatePresence mode="popLayout">
            {visibleGames.map((g) => (
              <GameListRow key={g.id} game={g} />
            ))}
          </AnimatePresence>
        </div>
        {paginationEnabled && totalPages > 1 && (
          <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
        )}
        <BatchActionBar />
      </>
    );
  }

  return (
    <>
      <div
        data-tour="game-grid"
        className="p-6 grid gap-4"
        style={{ gridTemplateColumns: gridColumns === 0 ? "repeat(auto-fill, minmax(180px, 1fr))" : `repeat(${gridColumns}, minmax(0, 1fr))` }}
      >
        {visibleGames.map((g, idx) => (
          <motion.div
            key={g.id}
            data-tour={idx === 0 ? "game-card-first" : undefined}
            variants={itemVariants}
            initial="hidden"
            animate="show"
          >
            <GameCard game={g} />
          </motion.div>
        ))}
      </div>
      {paginationEnabled && totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} onPage={setPage} />
      )}
      <BatchActionBar />
    </>
  );
}
