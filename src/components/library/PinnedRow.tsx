import { motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useCover } from "@/hooks/useCover";
import { COVER_PLACEHOLDER } from "@/lib/utils";
import { PinIcon } from "@/components/ui/Icons";
import type { Game } from "@/lib/types";

function PinnedCard({ game, index }: { game: Game; index: number }) {
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const coverUrl = useCover(game);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => { setSelectedGameId(game.id); setDetailOpen(true); }}
      className="group flex-shrink-0 w-[80px] cursor-pointer"
    >
      <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-bg-elevated border border-accent-500/20 group-hover:border-accent-500/50 transition-all duration-400 card-lift">
        <img
          src={coverUrl || COVER_PLACEHOLDER}
          alt={game.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => { (e.target as HTMLImageElement).src = COVER_PLACEHOLDER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-1.5 right-1.5">
          <div className="w-5 h-5 rounded-full bg-accent-500/80 backdrop-blur-sm flex items-center justify-center">
            <PinIcon size={10} filled className="text-white" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 truncate group-hover:text-slate-200 transition-colors">{game.name}</p>
    </motion.div>
  );
}

export default function PinnedRow() {
  const games = useGameStore((s) => s.games);
  const pinned = games.filter((g) => g.is_pinned);

  if (pinned.length === 0) return null;

  return (
    <div className="px-6 pt-6 pb-2">
      <div className="flex items-center gap-2 mb-4">
        <PinIcon size={14} className="text-accent-500" />
        <h2 className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.15em]">
          Pinned
        </h2>
        <div className="flex-1 h-px bg-white/[0.03]" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {pinned.map((g, i) => (
          <PinnedCard key={g.id} game={g} index={i} />
        ))}
      </div>
    </div>
  );
}
