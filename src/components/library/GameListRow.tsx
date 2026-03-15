import { motion } from "framer-motion";
import { cn, formatPlaytime, PLATFORM_COLORS } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useCover } from "@/hooks/useCover";
import type { Game } from "@/lib/types";
import { useGameStore } from "@/store/useGameStore";
import { useGames } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import Badge from "@/components/ui/Badge";
import { HeartIcon, PlayIcon, FolderIcon, StarIcon } from "@/components/ui/Icons";

const COVER_PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='80' viewBox='0 0 60 80'%3E%3Crect fill='%23111118' width='60' height='80' rx='4'/%3E%3Ccircle cx='30' cy='36' r='12' fill='none' stroke='%231a1a2e' stroke-width='1.5'/%3E%3Cpath d='M26 32 L26 40 L36 36Z' fill='%231a1a2e'/%3E%3C/svg%3E`;

export default function GameListRow({ game }: { game: Game }) {
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const addToast = useUIStore((s) => s.addToast);
  const { toggleFavorite } = useGames();
  const coverUrl = useCover(game);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      onClick={() => { setSelectedGameId(game.id); setDetailOpen(true); }}
      className="group flex items-center gap-4 px-4 py-2.5 cursor-pointer rounded-xl border border-transparent hover:border-accent-500/15 transition-all duration-300 hover:bg-white/[0.02]"
    >
      {/* Cover */}
      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/[0.04]">
        <img
          src={coverUrl || COVER_PLACEHOLDER}
          alt={game.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = COVER_PLACEHOLDER; }}
        />
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-200 truncate group-hover:text-white transition-colors">
          {game.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge className={cn("text-[10px]", PLATFORM_COLORS[game.platform])}>
            {game.platform}
          </Badge>
          {game.status !== "none" && (() => {
            const sc = useUIStore.getState().customStatuses.find(s => s.key === game.status);
            return sc ? (
              <span className="text-[10px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                <span style={{ color: sc.color }}>{sc.label}</span>
              </span>
            ) : null;
          })()}
        </div>
      </div>

      {/* Tags */}
      <div className="hidden lg:flex items-center gap-1 min-w-0 max-w-[160px] flex-wrap">
        {game.tags.slice(0, 3).map((t) => (
          <Badge key={t} className="text-[10px]">{t}</Badge>
        ))}
      </div>

      {/* Playtime */}
      <span className="hidden md:block text-[12px] text-slate-600 w-20 text-right shrink-0 tabular-nums">
        {formatPlaytime(game.playtime_mins)}
      </span>

      {/* Rating */}
      <div className="flex items-center gap-1 w-14 justify-end shrink-0">
        {game.rating !== null ? (
          <>
            <StarIcon size={10} filled className="text-accent-400" />
            <span className="text-[12px] text-slate-300 font-medium tabular-nums">{game.rating}</span>
          </>
        ) : (
          <span className="text-[12px] text-slate-700">--</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(game.id); }}
          className={cn(
            "btn-icon w-7 h-7",
            game.is_favorite ? "text-pink-400 border-pink-500/20" : ""
          )}
        >
          <HeartIcon size={12} filled={game.is_favorite} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={async (e) => {
            e.stopPropagation();
            try {
              if (game.platform === "steam" && game.steam_app_id) await api.launchSteamGame(game.steam_app_id, game.id);
              else await api.launchGame(game.id);
            } catch {}
          }}
          className="btn-icon w-7 h-7 hover:text-cyan-400"
        >
          <PlayIcon size={11} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={async (e) => { e.stopPropagation(); try { await api.openGameFolder(game.id); } catch {} }}
          className="btn-icon w-7 h-7 hover:text-accent-400"
        >
          <FolderIcon size={12} />
        </motion.button>
      </div>
    </motion.div>
  );
}
