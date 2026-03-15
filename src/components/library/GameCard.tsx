import { memo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { cn, PLATFORM_COLORS, formatPlaytime } from "@/lib/utils";
import type { Game } from "@/lib/types";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useGames } from "@/hooks/useGames";
import { useCover } from "@/hooks/useCover";
import { api } from "@/lib/tauri";
import Badge from "@/components/ui/Badge";
import { HeartIcon, PlayIcon, FolderIcon, StarIcon, FireIcon, SettingsIcon } from "@/components/ui/Icons";

const COVER_PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23111118'/%3E%3Cstop offset='100%25' stop-color='%230a0a0f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='300' height='400'/%3E%3Ccircle cx='150' cy='180' r='40' fill='none' stroke='%231a1a2e' stroke-width='2'/%3E%3Cpath d='M140 170 L140 190 L165 180Z' fill='%231a1a2e'/%3E%3C/svg%3E`;

function GameCard({ game }: { game: Game }) {
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const addToast = useUIStore((s) => s.addToast);
  const { toggleFavorite } = useGames();
  const coverUrl = useCover(game);
  const [imgFailed, setImgFailed] = useState(false);

  const openDetail = () => {
    setSelectedGameId(game.id);
    setDetailOpen(true);
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(game.id);
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (game.platform === "steam" && game.steam_app_id) {
        await api.launchSteamGame(game.steam_app_id, game.id);
      } else if (game.platform === "epic" && game.epic_app_name) {
        await api.launchEpicGame(game.epic_app_name, game.id);
      } else {
        await api.launchGame(game.id);
      }
    } catch (err) {
      addToast(String(err), "error");
    }
  };

  const handleFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await api.openGameFolder(game.id); } catch (err) { addToast(String(err), "error"); }
  };

  const { data: appSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const showPlaytime = appSettings?.show_playtime_on_cards ?? true;

  const isHighRated = game.rating !== null && game.rating >= 8;
  const customStatuses = useUIStore.getState().customStatuses;
  const statusConfig = customStatuses.find((s) => s.key === game.status);

  return (
    <motion.div
      onClick={openDetail}
      className="group relative cursor-pointer rounded-2xl overflow-hidden card-lift card-shine border border-white/[0.04] hover:border-accent-500/30"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-bg-elevated">
        <img
          src={coverUrl && !imgFailed ? coverUrl : COVER_PLACEHOLDER}
          alt={game.name}
          loading="lazy"
          className={cn(
            "w-full h-full transition-transform duration-700 ease-out group-hover:scale-110",
            coverUrl && !imgFailed ? "object-cover" : "object-contain p-8 opacity-50"
          )}
          onError={() => setImgFailed(true)}
        />

        {/* Multi-gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Quick actions - slide in from right */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 translate-x-12 group-hover:translate-x-0 transition-transform duration-300 ease-out">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleFav}
            className={cn(
              "w-8 h-8 rounded-xl glass-strong flex items-center justify-center transition-all duration-200",
              game.is_favorite ? "text-pink-400 bg-pink-500/20 border-pink-500/30" : "text-slate-400 hover:text-pink-400"
            )}
          >
            <HeartIcon size={13} filled={game.is_favorite} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handlePlay}
            className="w-8 h-8 rounded-xl glass-strong flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <PlayIcon size={12} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleFolder}
            className="w-8 h-8 rounded-xl glass-strong flex items-center justify-center text-slate-400 hover:text-accent-400 transition-colors"
          >
            <FolderIcon size={12} />
          </motion.button>
        </div>

        {/* Platform badge */}
        <div className="absolute top-2.5 left-2.5">
          <Badge className={PLATFORM_COLORS[game.platform]}>
            {game.platform === "steam" ? "Steam" : game.platform === "epic" ? "Epic" : game.platform === "gog" ? "GOG" : "Custom"}
          </Badge>
        </div>

        {/* Favorite indicator (always visible when not hovered) */}
        {game.is_favorite && (
          <div className="absolute top-2.5 right-2.5 group-hover:opacity-0 transition-opacity duration-200">
            <HeartIcon size={14} filled className="text-pink-400 drop-shadow-lg" />
          </div>
        )}

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Rating + high rated flame */}
          {game.rating !== null && (
            <div className="flex items-center gap-1.5 mb-1">
              {isHighRated && <FireIcon size={12} className="text-amber-400" />}
              <div className="flex items-center gap-0.5">
                <StarIcon size={10} filled className="text-accent-400" />
                <span className="text-[11px] font-bold text-white tabular-nums">{game.rating}</span>
              </div>
            </div>
          )}

          <div className="flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight line-clamp-2 drop-shadow-lg">
                {game.name}
              </p>

              {statusConfig && game.status !== "none" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig.color }} />
                  <span className="text-[10px] font-medium tracking-wide" style={{ color: statusConfig.color }}>
                    {statusConfig.label}
                  </span>
                </div>
              )}
              {showPlaytime && game.playtime_mins > 0 && (
                <p className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                  {formatPlaytime(game.playtime_mins)}
                </p>
              )}
            </div>

            {/* Settings / Detail button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); openDetail(); }}
              className="w-7 h-7 rounded-lg glass-strong flex items-center justify-center text-slate-500 hover:text-accent-400 transition-all duration-200 opacity-0 group-hover:opacity-100 shrink-0"
              title="Game details"
            >
              <SettingsIcon size={12} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(GameCard);
