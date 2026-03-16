import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useGames } from "@/hooks/useGames";
import { useCover, setCoverCache, clearCoverCache } from "@/hooks/useCover";
import { api } from "@/lib/tauri";
import { cn, formatPlaytime, formatDate, PLATFORM_COLORS } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import GameNotes from "./GameNotes";
import ModLoaderPanel from "./ModLoaderPanel";
import Badge from "@/components/ui/Badge";
import CoverSearchModal from "@/components/modals/CoverSearchModal";
import {
  CloseIcon, HeartIcon, PlayIcon, FolderIcon, TrashIcon,
  CheckIcon, TagIcon, ClockIcon, StarIcon, ImageIcon, SearchIcon
} from "@/components/ui/Icons";

const COVER_PLACEHOLDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23111118'/%3E%3Cstop offset='100%25' stop-color='%230a0a0f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='300' height='400'/%3E%3Ccircle cx='150' cy='180' r='50' fill='none' stroke='%231a1a2e' stroke-width='2'/%3E%3Cpath d='M135 160 L135 200 L175 180Z' fill='%231a1a2e'/%3E%3C/svg%3E`;


export default function GameDetail() {
  const selectedGameId = useGameStore((s) => s.selectedGameId);
  const games = useGameStore((s) => s.games);
  const game = games.find((g) => g.id === selectedGameId) ?? null;
  const isOpen = useUIStore((s) => s.isDetailOpen);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const { update, remove, toggleFavorite } = useGames();
  const openConfirm = useUIStore((s) => s.openConfirm);
  const addToast = useUIStore((s) => s.addToast);

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showCoverSearch, setShowCoverSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "screenshots" | "mods">("info");
  const [screenshots, setScreenshots] = useState<string[] | null>(null);
  const [loadingShots, setLoadingShots] = useState(false);

  const dummyGame = { id: "", name: "", platform: "custom" as const, cover_path: null, exe_path: null, install_dir: null, description: null, rating: null, status: "none" as const, is_favorite: false, playtime_mins: 0, last_played: null, date_added: "", steam_app_id: null, epic_app_name: null, tags: [], sort_order: 0 };
  const coverUrl = useCover(game ?? dummyGame);

  if (!game) return null;

  const close = () => setDetailOpen(false);

  const handleChangeCover = async () => {
    const selected = await open({
      filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "gif"] }],
    });
    if (typeof selected === "string") {
      try {
        const newPath = await api.setGameCover(game.id, selected);
        if (game.cover_path) clearCoverCache(game.cover_path);
        const dataUri = await api.readImageBase64(newPath);
        setCoverCache(newPath, dataUri);
        const allGames = await api.getAllGames();
        useGameStore.getState().setGames(allGames);
        addToast("Cover image updated", "success");
      } catch (e) {
        addToast(String(e), "error");
      }
    }
  };

  const handlePlay = async () => {
    try {
      if (game.platform === "steam" && game.steam_app_id) await api.launchSteamGame(game.steam_app_id, game.id);
      else if (game.platform === "epic" && game.epic_app_name) await api.launchEpicGame(game.epic_app_name, game.id);
      else await api.launchGame(game.id);
    } catch (e) { addToast(String(e), "error"); }
  };

  const loadScreenshots = async () => {
    if (!game.steam_app_id || loadingShots) return;
    setLoadingShots(true);
    try {
      const shots = await api.getGameScreenshots(game.steam_app_id);
      setScreenshots(shots);
    } catch {
      setScreenshots([]);
    } finally {
      setLoadingShots(false);
    }
  };

  const handleDelete = () => {
    openConfirm(`Remove "${game.name}" from library?`, () => {
      remove(game.id);
      close();
    });
  };

  const saveName = () => {
    if (nameVal.trim()) update({ id: game.id, name: nameVal.trim() });
    setEditingName(false);
  };

  const saveDesc = () => {
    update({ id: game.id, description: descVal });
    setEditingDesc(false);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const t = tagInput.trim().toLowerCase();
      if (!game.tags.includes(t)) update({ id: game.id, tags: [...game.tags, t] });
      setTagInput("");
    }
  };

  const removeTag = (t: string) => update({ id: game.id, tags: game.tags.filter((x) => x !== t) });

  return (
    <>
    {showCoverSearch && (
      <CoverSearchModal
        gameId={game.id}
        gameName={game.name}
        currentCoverPath={game.cover_path}
        onClose={() => setShowCoverSearch(false)}
      />
    )}
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="fixed inset-0 z-30"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 w-[500px] z-40 flex flex-col overflow-hidden"
            style={{
              background: "rgba(10, 8, 16, 0.92)",
              backdropFilter: "blur(40px) saturate(200%)",
              borderLeft: "1px solid rgba(255,255,255,0.04)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5), 0 0 40px rgb(var(--accent-500) /0.05)",
            }}
          >
            <div className="relative h-60 shrink-0 overflow-hidden group/cover cursor-pointer" onClick={handleChangeCover}>
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                src={coverUrl || COVER_PLACEHOLDER}
                alt={game.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = COVER_PLACEHOLDER; }}
              />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(to bottom, rgba(10,8,16,0.2) 0%, rgba(10,8,16,0.5) 50%, rgba(10,8,16,1) 100%)"
              }} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 z-10"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                    <ImageIcon size={18} />
                    Change Cover
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowCoverSearch(true); }}
                    className="flex items-center gap-1.5 text-[11px] text-accent-300 hover:text-white transition-colors bg-accent-600/30 px-3 py-1 rounded-lg border border-accent-500/30"
                  >
                    <SearchIcon size={11} />
                    Search Online
                  </button>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); close(); }}
                className="absolute top-4 right-4 btn-icon z-20"
              >
                <CloseIcon size={14} />
              </motion.button>
              <div className="absolute top-4 left-4 z-20">
                <Badge className={PLATFORM_COLORS[game.platform]}>{game.platform}</Badge>
              </div>
            </div>

            <div
              className="flex shrink-0 px-6"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {[
                { key: "info" as const, label: "Info" },
                ...(game.steam_app_id ? [{ key: "screenshots" as const, label: "Screenshots" }] : []),
                ...(game.install_dir ? [{ key: "mods" as const, label: "Mods" }] : []),
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "screenshots" && screenshots === null) loadScreenshots();
                  }}
                  className={cn(
                    "px-4 py-3 text-[12px] font-medium border-b-2 transition-all -mb-px",
                    activeTab === tab.key
                      ? "text-accent-400 border-accent-500"
                      : "text-slate-600 border-transparent hover:text-slate-400"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "screenshots" && (
              <div className="flex-1 overflow-y-auto p-4">
                {loadingShots && (
                  <div className="flex justify-center py-12">
                    <div className="w-5 h-5 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin" />
                  </div>
                )}
                {!loadingShots && screenshots !== null && screenshots.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ImageIcon size={28} className="text-slate-700 mb-3" />
                    <p className="text-[13px] text-slate-600">No screenshots found</p>
                    <p className="text-[11px] text-slate-700 mt-1">Take screenshots in-game with F12</p>
                  </div>
                )}
                {!loadingShots && screenshots && screenshots.length > 0 && (
                  <div className="columns-2 gap-2 space-y-2">
                    {screenshots.map((path, i) => (
                      <ScreenshotThumb key={i} path={path} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "mods" && game.install_dir && (
              <div className="flex-1 overflow-y-auto p-6">
                <ModLoaderPanel installDir={game.install_dir} exePath={game.exe_path} />
              </div>
            )}

            {activeTab === "info" && (
            <div className="flex flex-col gap-5 p-6 flex-1 overflow-y-auto">
              <div className="flex items-start gap-3">
                {editingName ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      autoFocus
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveName()}
                      onBlur={saveName}
                      className="input-glass flex-1 text-lg font-bold"
                    />
                  </div>
                ) : (
                  <h2
                    className="text-xl font-bold text-white flex-1 cursor-text hover:text-accent-200 transition-colors leading-tight"
                    onClick={() => { setNameVal(game.name); setEditingName(true); }}
                  >
                    {game.name}
                  </h2>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleFavorite(game.id)}
                  className={cn(
                    "shrink-0 p-2.5 rounded-xl transition-all duration-300",
                    game.is_favorite
                      ? "text-pink-400 bg-pink-500/15 border border-pink-500/25 glow-inner"
                      : "text-slate-600 hover:text-pink-400 glass"
                  )}
                >
                  <HeartIcon size={18} filled={game.is_favorite} />
                </motion.button>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlay}
                  className="btn-primary flex-1 justify-center py-3"
                  style={{ boxShadow: "0 0 25px rgb(var(--accent-500) /0.2)" }}
                >
                  <PlayIcon size={14} />
                  Play
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => api.openGameFolder(game.id).catch(() => {})}
                  className="btn-ghost px-4"
                >
                  <FolderIcon size={14} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleDelete}
                  className="btn-ghost px-4 text-red-500/60 hover:text-red-400"
                  style={{ borderColor: "rgba(239,68,68,0.08)" }}
                >
                  <TrashIcon size={14} />
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <ClockIcon size={13} className="text-accent-400" />, label: "Playtime", value: formatPlaytime(game.playtime_mins) },
                  { icon: <StarIcon size={13} filled className="text-accent-400" />, label: "Rating", value: game.rating !== null ? `${game.rating}/10` : "Unrated" },
                  { icon: <span className="text-[11px]">+</span>, label: "Added", value: formatDate(game.date_added) },
                ].map((s, i) => (
                  <div key={i} className="glass rounded-xl p-3 text-center group hover:border-accent-500/20 transition-all duration-300">
                    <div className="flex items-center justify-center gap-1 mb-1.5 text-slate-500">
                      {s.icon}
                    </div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{s.label}</p>
                    <p className="text-[13px] font-semibold text-slate-200">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-2.5">Your Rating</p>
                <StarRating value={game.rating} onChange={(v) => update({ id: game.id, rating: v })} size="md" />
              </div>

              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-2.5">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={() => update({ id: game.id, status: "none" })}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all duration-300",
                      game.status === "none"
                        ? "bg-accent-600/20 border-accent-500/40 text-accent-300 glow-sm"
                        : "glass text-slate-500 hover:text-slate-300 hover:border-white/12"
                    )}
                  >
                    Unset
                  </motion.button>
                  {useUIStore.getState().customStatuses.map((s) => (
                    <motion.button
                      key={s.key}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => update({ id: game.id, status: s.key })}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all duration-300 flex items-center gap-1.5",
                        game.status === s.key
                          ? "bg-accent-600/20 border-accent-500/40 text-accent-300 glow-sm"
                          : "glass text-slate-500 hover:text-slate-300 hover:border-white/12"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-2.5 flex items-center gap-1.5">
                  <TagIcon size={11} className="text-slate-600" /> Tags
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <AnimatePresence>
                    {game.tags.map((t) => (
                      <motion.button
                        key={t}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeTag(t)}
                        className="glass px-3 py-1 rounded-full text-[11px] text-slate-400 hover:text-red-400 hover:border-red-500/25 transition-all duration-200 group flex items-center gap-1"
                      >
                        {t}
                        <span className="text-slate-700 group-hover:text-red-400 text-[9px]">x</span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="Add tag (Enter)"
                  className="input-glass text-[12px] py-2"
                />
              </div>

              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-2.5">Description</p>
                {editingDesc ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      autoFocus
                      value={descVal}
                      onChange={(e) => setDescVal(e.target.value)}
                      rows={4}
                      className="input-glass resize-none text-[13px] leading-relaxed"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingDesc(false)} className="btn-ghost text-[12px] py-1.5">Cancel</button>
                      <button onClick={saveDesc} className="btn-primary text-[12px] py-1.5">Save</button>
                    </div>
                  </div>
                ) : (
                  <motion.p
                    whileHover={{ borderColor: "rgb(var(--accent-500) /0.2)" }}
                    onClick={() => { setDescVal(game.description ?? ""); setEditingDesc(true); }}
                    className={cn(
                      "text-[13px] cursor-text leading-relaxed rounded-xl p-4 glass transition-all duration-300 min-h-[64px]",
                      game.description ? "text-slate-300" : "text-slate-700 italic"
                    )}
                  >
                    {game.description || "Click to add a description..."}
                  </motion.p>
                )}
              </div>

              <GameNotes gameId={game.id} />

              {(game.steam_app_id || game.epic_app_name || game.install_dir) && (
                <div className="glass rounded-xl p-4 space-y-1.5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-2">Info</p>
                  {game.steam_app_id && (
                    <p className="text-[11px] text-slate-600 flex gap-2">
                      <span className="text-slate-500 shrink-0">Steam ID</span>
                      <span className="text-slate-400 truncate">{game.steam_app_id}</span>
                    </p>
                  )}
                  {game.epic_app_name && (
                    <p className="text-[11px] text-slate-600 flex gap-2">
                      <span className="text-slate-500 shrink-0">Epic</span>
                      <span className="text-slate-400 truncate">{game.epic_app_name}</span>
                    </p>
                  )}
                  {game.install_dir && (
                    <p className="text-[11px] text-slate-600 flex gap-2">
                      <span className="text-slate-500 shrink-0">Path</span>
                      <span className="text-slate-400 truncate font-mono text-[10px]">{game.install_dir}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );

  function ScreenshotThumb({ path }: { path: string }) {
    const [enlarged, setEnlarged] = useState(false);
    const dataUrl = useScreenshotUrl(path);
    return (
      <>
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => setEnlarged(true)}
          className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer mb-2 border border-white/5 hover:border-accent-500/30 transition-colors"
        >
          {dataUrl ? (
            <img src={dataUrl} alt="" className="w-full h-auto block" />
          ) : (
            <div className="w-full aspect-video bg-white/3 animate-pulse" />
          )}
        </motion.div>
        <AnimatePresence>
          {enlarged && dataUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6"
              style={{ background: "rgba(0,0,0,0.9)" }}
              onClick={() => setEnlarged(false)}
            >
              <img src={dataUrl} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
}

function useScreenshotUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  if (url === null) {
    api.readImageBase64(path).then(setUrl).catch(() => setUrl(""));
  }
  return url || null;
}
