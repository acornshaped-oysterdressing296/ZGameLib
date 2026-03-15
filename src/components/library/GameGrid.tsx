import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useGameStore } from "@/store/useGameStore";
import { useFilteredGames } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import GameCard from "./GameCard";
import GameListRow from "./GameListRow";
import EmptyState from "@/components/ui/EmptyState";
import { useUIStore } from "@/store/useUIStore";

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export default function GameGrid() {
  const games = useFilteredGames();
  const viewMode = useGameStore((s) => s.viewMode);
  const setAddGameOpen = useUIStore((s) => s.setAddGameOpen);
  const { data: appSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const gridColumns = appSettings?.grid_columns ?? 4;

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

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-0.5 p-4 page-enter">
        {/* Header */}
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
