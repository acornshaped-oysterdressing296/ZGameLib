import { motion } from "framer-motion";
import { cn, formatPlaytime, COVER_PLACEHOLDER } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useCover } from "@/hooks/useCover";
import type { Game } from "@/lib/types";
import { useGameStore } from "@/store/useGameStore";
import { useGames } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import { useLaunchGame } from "@/lib/useLaunchGame";
import Badge from "@/components/ui/Badge";
import PlatformBadge from "@/components/ui/PlatformBadge";
import GameContextMenu from "@/components/ui/GameContextMenu";
import { HeartIcon, PlayIcon, FolderIcon, StarIcon, FireIcon, CheckIcon } from "@/components/ui/Icons";

export default function GameListRow({ game }: { game: Game }) {
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const addToast = useUIStore((s) => s.addToast);
  const customStatuses = useUIStore((s) => s.customStatuses);
  const { toggleFavorite } = useGames();
  const { launch } = useLaunchGame();
  const coverUrl = useCover(game);
  const selectedIds = useGameStore((s) => s.selectedIds);
  const toggleSelected = useGameStore((s) => s.toggleSelected);
  const isSelected = selectedIds.includes(game.id);

  return (
    <GameContextMenu game={game}>
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      onClick={() => { setSelectedGameId(game.id); setDetailOpen(true); }}
      className={cn("group flex items-center gap-4 px-4 py-2.5 cursor-pointer rounded-xl border transition-all duration-300 hover:bg-white/[0.02]", isSelected ? "border-accent-500/40 bg-accent-500/5" : "border-transparent hover:border-accent-500/15")}
    >
      <div
        className={cn("shrink-0 flex items-center justify-center w-5 h-5 transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
        onClick={(e) => { e.stopPropagation(); toggleSelected(game.id); }}
      >
        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors", isSelected ? "bg-accent-500 border-accent-500" : "border-white/30 bg-black/40")}>
          {isSelected && <CheckIcon size={10} className="text-white" />}
        </div>
      </div>
      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/[0.04]">
        <img
          src={coverUrl || COVER_PLACEHOLDER}
          alt={game.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = COVER_PLACEHOLDER; }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-200 truncate group-hover:text-white transition-colors">
          {game.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <PlatformBadge platform={game.platform} />
          {game.not_installed && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-slate-800/80 border border-slate-600/40 text-slate-400">Not Installed</span>
          )}
          {game.status !== "none" && (() => {
            const sc = customStatuses.find(s => s.key === game.status);
            return sc ? (
              <span className="text-[10px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.color }} />
                <span style={{ color: sc.color }}>{sc.label}</span>
              </span>
            ) : null;
          })()}
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-1 min-w-0 max-w-[160px] flex-wrap">
        {game.tags.slice(0, 3).map((t) => (
          <Badge key={t} className="text-[10px]">{t}</Badge>
        ))}
      </div>

      <span className="hidden md:block text-[12px] text-slate-600 w-20 text-right shrink-0 tabular-nums">
        {formatPlaytime(game.playtime_mins)}
      </span>

      <div className="flex items-center gap-1 w-14 justify-end shrink-0">
        {game.rating !== null ? (
          <>
            {game.rating >= 8 && (
              <motion.span
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <FireIcon size={15} className="text-amber-400" />
              </motion.span>
            )}
            <StarIcon size={10} filled className="text-accent-400" />
            <span className="text-[12px] text-slate-300 font-medium tabular-nums">{game.rating}</span>
          </>
        ) : (
          <span className="text-[12px] text-slate-700">--</span>
        )}
      </div>

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
          onClick={(e) => { e.stopPropagation(); launch(game); }}
          className="btn-icon w-7 h-7 hover:text-cyan-400"
        >
          <PlayIcon size={11} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={async (e) => { e.stopPropagation(); try { await api.openGameFolder(game.id); } catch (e: any) { addToast(e?.message ?? "Failed to open folder", "error"); } }}
          className="btn-icon w-7 h-7 hover:text-accent-400"
        >
          <FolderIcon size={12} />
        </motion.button>
      </div>
    </motion.div>
    </GameContextMenu>
  );
}
