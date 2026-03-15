import { motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import GameCard from "@/components/library/GameCard";
import { timeAgo } from "@/lib/utils";
import { ClockIcon } from "@/components/ui/Icons";

export default function RecentlyPlayedPage() {
  const games = useGameStore((s) => s.games);

  const recent = [...games]
    .filter((g) => g.last_played)
    .sort((a, b) => (b.last_played! > a.last_played! ? 1 : -1));

  return (
    <div className="p-6 page-enter overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgb(var(--accent-500) / 0.2), rgb(var(--accent-800) / 0.15))", border: "1px solid rgb(var(--accent-500) / 0.15)" }}>
          <ClockIcon size={18} className="text-accent-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Recently Played</h1>
          <p className="text-[12px] text-slate-600">Games launched from ZGameLib</p>
        </div>
      </div>
      {recent.length === 0 ? (
        <p className="text-slate-700 text-[13px] mt-8 text-center">No games played yet. Launch a game from your library!</p>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {recent.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <GameCard game={g} />
              <p className="text-[10px] text-slate-600 mt-2 px-1 font-medium">{timeAgo(g.last_played)}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
