import { motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { timeAgo } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useCover } from "@/hooks/useCover";
import { ClockIcon } from "@/components/ui/Icons";
import type { Game } from "@/lib/types";

const COVER_PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='160' viewBox='0 0 120 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23111118'/%3E%3Cstop offset='100%25' stop-color='%230a0a0f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='120' height='160' rx='6'/%3E%3C/svg%3E`;

function RecentCard({ game, index }: { game: Game; index: number }) {
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const coverUrl = useCover(game);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      onClick={() => { setSelectedGameId(game.id); setDetailOpen(true); }}
      className="group flex-shrink-0 w-[90px] cursor-pointer"
    >
      <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-bg-elevated border border-white/[0.04] group-hover:border-accent-500/30 transition-all duration-400 card-lift card-shine">
        <img
          src={coverUrl || COVER_PLACEHOLDER}
          alt={game.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => { (e.target as HTMLImageElement).src = COVER_PLACEHOLDER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-8 h-8 rounded-full glass-strong flex items-center justify-center">
            <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white ml-0.5" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-2 truncate group-hover:text-slate-300 transition-colors">{game.name}</p>
      <p className="text-[9px] text-slate-700">{timeAgo(game.last_played)}</p>
    </motion.div>
  );
}

export default function RecentlyPlayed() {
  const games = useGameStore((s) => s.games);

  const recent = [...games]
    .filter((g) => g.last_played)
    .sort((a, b) => (b.last_played! > a.last_played! ? 1 : -1))
    .slice(0, 12);

  if (recent.length === 0) return null;

  return (
    <div className="px-6 pt-6 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon size={14} className="text-slate-600" />
        <h2 className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.15em]">
          Recently Played
        </h2>
        <div className="flex-1 h-px bg-white/[0.03]" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {recent.map((g, i) => (
          <RecentCard key={g.id} game={g} index={i} />
        ))}
      </div>
    </div>
  );
}
