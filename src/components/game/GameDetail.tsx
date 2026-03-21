import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useGames } from "@/hooks/useGames";
import { useCover, setCoverCache, clearCoverCache } from "@/hooks/useCover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import { useLaunchGame } from "@/lib/useLaunchGame";
import { cn, formatPlaytime, formatDate, COVER_PLACEHOLDER } from "@/lib/utils";
import StarRating from "@/components/ui/StarRating";
import GameNotes from "./GameNotes";
import ModLoaderPanel from "./ModLoaderPanel";
import Badge from "@/components/ui/Badge";
import PlatformBadge from "@/components/ui/PlatformBadge";
import CoverSearchModal from "@/components/modals/CoverSearchModal";
import {
  CloseIcon, HeartIcon, PlayIcon, FolderIcon, TrashIcon,
  CheckIcon, TagIcon, ClockIcon, StarIcon, ImageIcon, SearchIcon,
  CopyIcon, ExternalLinkIcon, PlusIcon,
} from "@/components/ui/Icons";
import type { Session, Collection, Game } from "@/lib/types";

function GenreIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 14H10M9 13V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 14H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 4H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DevIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M8 9L4 12L8 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 9L20 12L16 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 4L10 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function PubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M3 21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 21V7L12 3L19 7V21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="9" y="13" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 15H8.01M12 15H12.01M16 15H16.01M8 19H8.01M12 19H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function InfoCircleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 11V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="7.5" r="0.75" fill="currentColor"/>
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M3 6H21M8 6V4H16V6M19 6L18 20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20L5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IgdbMetadataCard({ game, onClear }: { game: Game; onClear: () => void }) {
  const [showTip, setShowTip] = useState(false);

  const fields: { label: string; value: string | number | null | undefined; icon: ReactNode }[] = [
    { label: "Genre", value: game.genre, icon: <GenreIcon /> },
    { label: "Developer", value: game.developer, icon: <DevIcon /> },
    { label: "Publisher", value: game.publisher, icon: <PubIcon /> },
    { label: "Released", value: game.release_year, icon: <CalIcon /> },
  ].filter((f) => f.value != null && f.value !== "");

  return (
    <div className="rounded-2xl border border-white/[0.06]" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)" }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2.5">
        <span className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-semibold">IGDB Metadata</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClear}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors"
            title="Remove IGDB data"
          >
            <ClearIcon />
          </button>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onClick={() => setShowTip((v) => !v)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors"
            >
              <InfoCircleIcon />
            </button>
            {showTip && (
              <div className="absolute right-0 top-7 z-50 w-[220px] rounded-xl border border-white/[0.08] shadow-2xl p-3 text-[11px] text-slate-400 leading-relaxed" style={{ background: "rgba(12,12,18,0.98)" }}>
                Data sourced from IGDB by game name. If another title shares a similar name, the wrong match may have been returned — double-check and re-fetch if needed.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap border-t border-white/[0.05]">
        {fields.map((f, i) => (
          <div
            key={f.label}
            className="flex items-start gap-2.5 px-4 py-3 min-w-0"
            style={{
              width: fields.length === 1 ? "100%" : "50%",
              borderTop: i >= 2 ? "1px solid rgba(255,255,255,0.05)" : undefined,
              borderLeft: i % 2 === 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
            }}
          >
            <span className="text-slate-500 shrink-0 mt-0.5">{f.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.12em] font-semibold mb-0.5">{f.label}</p>
              <p className="text-[12px] text-slate-200 font-medium leading-snug break-words">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameDetail() {
  const selectedGameId = useGameStore((s) => s.selectedGameId);
  const games = useGameStore((s) => s.games);
  const game = games.find((g) => g.id === selectedGameId) ?? null;
  const isOpen = useUIStore((s) => s.isDetailOpen);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const { update, remove, toggleFavorite } = useGames();
  const openConfirm = useUIStore((s) => s.openConfirm);
  const addToast = useUIStore((s) => s.addToast);
  const activeGameId = useUIStore((s) => s.activeGameId);
  const { launch } = useLaunchGame();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showCoverSearch, setShowCoverSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "screenshots" | "mods" | "history">("info");
  const [screenshots, setScreenshots] = useState<string[] | null>(null);
  const [loadingShots, setLoadingShots] = useState(false);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [coverLightbox, setCoverLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pendingTags, setPendingTags] = useState<Set<string>>(new Set());
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [igdbFetching, setIgdbFetching] = useState(false);
  const pendingTagTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const collectionMenuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const customStatuses = useUIStore((s) => s.customStatuses);
  const qc = useQueryClient();

  const { data: allCollections = [] } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: () => api.getCollections(),
  });

  const { data: gameCollections = [], refetch: refetchGameCollections } = useQuery<Collection[]>({
    queryKey: ["game-collections", selectedGameId],
    queryFn: () => api.getCollectionsForGame(game?.id ?? ""),
    enabled: !!selectedGameId,
  });

  const flashSaved = useCallback(() => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1800);
  }, []);

  useEffect(() => {
    setActiveTab("info");
    setScreenshots(null);
    setLoadingShots(false);
    setSessions(null);
    setLoadingSessions(false);
    setDescExpanded(false);
    setLightboxIndex(null);
    setShowCollectionMenu(false);
    pendingTagTimers.current.forEach((t) => clearTimeout(t));
    pendingTagTimers.current.clear();
    setPendingTags(new Set());
    if (selectedGameId) qc.invalidateQueries({ queryKey: ["games"] });
  }, [selectedGameId, qc]);

  useEffect(() => {
    if (!showCollectionMenu) return;
    const handler = (e: MouseEvent) => {
      if (collectionMenuRef.current && !collectionMenuRef.current.contains(e.target as Node)) {
        setShowCollectionMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCollectionMenu]);

  useEffect(() => {
    if (lightboxIndex === null || !screenshots) return;
    const len = screenshots.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setLightboxIndex((i) => i !== null ? (i - 1 + len) % len : null);
      else if (e.key === "ArrowRight") setLightboxIndex((i) => i !== null ? (i + 1) % len : null);
      else if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, screenshots]);

  useEffect(() => {
    const gameId = game?.id;
    if (!gameId) return;
    const promise = listen<string>("game-session-ended", async (event) => {
      if (event.payload === gameId && sessions !== null) {
        const data = await api.getSessions(gameId).catch(() => null);
        if (data) setSessions(data);
      }
    });
    return () => { promise.then((f) => f()); };
  }, [game?.id, sessions]);

  const dummyGame = { id: "", name: "", platform: "custom" as const, cover_path: null, exe_path: null, install_dir: null, description: null, rating: null, status: "none" as const, is_favorite: false, is_pinned: false, playtime_mins: 0, last_played: null, date_added: "", steam_app_id: null, epic_app_name: null, tags: [], sort_order: 0, deleted_at: null, custom_fields: {} as Record<string, string>, hltb_main_mins: null, hltb_extra_mins: null, genre: null, developer: null, publisher: null, release_year: null };
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

  const handlePlay = () => {
    launch(game, () => {
      setGameStarted(true);
      setTimeout(() => setGameStarted(false), 3000);
    });
  };

  const loadSessions = async () => {
    if (loadingSessions) return;
    setLoadingSessions(true);
    try {
      const data = await api.getSessions(game.id);
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
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
    if (nameVal.trim()) update({ id: game.id, name: nameVal.trim() }, { onSuccess: flashSaved });
    setEditingName(false);
  };

  const saveDesc = () => {
    update({ id: game.id, description: descVal }, { onSuccess: flashSaved });
    setEditingDesc(false);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const t = tagInput.trim().toLowerCase();
      if (!game.tags.includes(t)) update({ id: game.id, tags: [...game.tags, t] });
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setPendingTags((prev) => new Set([...prev, t]));
    const timer = setTimeout(() => {
      update({ id: game.id, tags: game.tags.filter((x) => x !== t) });
      setPendingTags((prev) => { const next = new Set(prev); next.delete(t); return next; });
      pendingTagTimers.current.delete(t);
    }, 5000);
    pendingTagTimers.current.set(t, timer);
    addToast(`Tag "${t}" removed — click to undo`, "info");
  };

  const undoRemoveTag = (t: string) => {
    const timer = pendingTagTimers.current.get(t);
    if (timer) clearTimeout(timer);
    pendingTagTimers.current.delete(t);
    setPendingTags((prev) => { const next = new Set(prev); next.delete(t); return next; });
  };

  const doIgdbFetch = async () => {
    setIgdbFetching(true);
    try {
      const settings = await api.getSettings();
      const clientId = settings.igdb_client_id;
      const clientSecret = settings.igdb_client_secret;
      if (!clientId || !clientSecret) {
        addToast("Set IGDB credentials in Settings → Integrations", "error");
        return;
      }
      const data = await api.fetchIgdbMetadata(game.id, game.name, clientId, clientSecret);
      if (data) {
        const allGames = await api.getAllGames();
        useGameStore.getState().setGames(allGames);
        addToast("IGDB metadata fetched", "success");
      } else {
        addToast("No IGDB data found", "info");
      }
    } catch {
      addToast("Could not fetch IGDB metadata", "error");
    } finally {
      setIgdbFetching(false);
    }
  };

  const handleIgdbFetch = () => {
    if (game.igdb_skipped) {
      openConfirm(
        "This game was flagged after its IGDB data was cleared — the search may return the wrong match again. Fetch anyway?",
        doIgdbFetch
      );
    } else {
      doIgdbFetch();
    }
  };

  const handleClearIgdb = () => {
    openConfirm(
      `Remove IGDB data for "${game.name}"? The game will be flagged — you'll be asked to confirm before any future IGDB fetch.`,
      async () => {
        try {
          await api.clearIgdbData(game.id);
          const allGames = await api.getAllGames();
          useGameStore.getState().setGames(allGames);
          addToast("IGDB data removed", "success");
        } catch {
          addToast("Failed to remove IGDB data", "error");
        }
      }
    );
  };

  const toggleCollection = async (col: Collection) => {
    const inCollection = gameCollections.some((c) => c.id === col.id);
    try {
      if (inCollection) {
        await api.removeGameFromCollection(col.id, game.id);
        addToast(`Removed from "${col.name}"`, "success");
      } else {
        await api.addGameToCollection(col.id, game.id);
        addToast(`Added to "${col.name}"`, "success");
      }
      refetchGameCollections();
      qc.invalidateQueries({ queryKey: ["collections"] });
    } catch (e) {
      addToast(String(e), "error");
    }
  };

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
      {coverLightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setCoverLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)" }}
        >
          <motion.img
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            src={coverUrl || COVER_PLACEHOLDER}
            alt={game.name}
            className="max-h-[85vh] max-w-[60vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </AnimatePresence>
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
            ref={panelRef}
            data-tour="game-detail"
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
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key !== "Tab") return;
              const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
              const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(sel) ?? []).filter((el) => !el.hasAttribute("disabled"));
              if (!focusable.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
              } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
              }
            }}
          >
            <div className="relative h-60 shrink-0 overflow-hidden group/cover cursor-pointer" onClick={() => setCoverLightbox(true)}>
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
                <div className="flex flex-col items-center gap-3" onClick={(e) => { e.stopPropagation(); handleChangeCover(); }}>
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
                <PlatformBadge platform={game.platform} />
              </div>
            </div>

            <div
              className="flex shrink-0 px-6 items-center"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {[
                { key: "info" as const, label: "Info" },
                ...(game.steam_app_id ? [{ key: "screenshots" as const, label: screenshots !== null ? `Screenshots (${screenshots.length})` : "Screenshots" }] : []),
                ...(game.install_dir ? [{ key: "mods" as const, label: "Mods" }] : []),
                { key: "history" as const, label: sessions !== null ? `History (${sessions.length})` : "History" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  data-tour={`detail-tab-${tab.key}`}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "screenshots" && screenshots === null) loadScreenshots();
                    if (tab.key === "history" && sessions === null) loadSessions();
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
              <AnimatePresence>
                {showSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="ml-auto text-[11px] text-emerald-400 font-medium pr-1 shrink-0"
                  >
                    Saved ✓
                  </motion.span>
                )}
              </AnimatePresence>
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
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] text-slate-600">{screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""}</p>
                      <button
                        onClick={() => {
                          const folder = screenshots[0].replace(/[\\/][^\\/]+$/, "");
                          api.openUrl(folder).catch(() => {});
                        }}
                        className="btn-ghost text-[11px] py-1 px-2.5"
                      >
                        <FolderIcon size={11} />
                        Open Folder
                      </button>
                    </div>
                    <div className="columns-2 gap-2">
                      {screenshots.map((path, i) => (
                        <ScreenshotThumb key={i} path={path} onOpen={() => setLightboxIndex(i)} />
                      ))}
                    </div>
                    <AnimatePresence>
                      {lightboxIndex !== null && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
                          style={{ background: "rgba(0,0,0,0.92)" }}
                          onClick={() => setLightboxIndex(null)}
                        >
                          <span
                            className="absolute top-4 right-4 text-[11px] text-slate-500 font-mono"
                          >
                            {lightboxIndex + 1} / {screenshots.length}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? (i - 1 + screenshots.length) % screenshots.length : null); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-white font-bold text-lg"
                            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
                          >
                            {"<"}
                          </button>
                          <ScreenshotLightboxImg path={screenshots[lightboxIndex]} onClick={(e) => e.stopPropagation()} />
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => i !== null ? (i + 1) % screenshots.length : null); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-white font-bold text-lg"
                            style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
                          >
                            {">"}
                          </button>
                          <button
                            onClick={() => setLightboxIndex(null)}
                            className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                          >
                            <CloseIcon size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            )}

            {activeTab === "mods" && game.install_dir && (
              <div className="flex-1 overflow-y-auto p-6">
                <ModLoaderPanel installDir={game.install_dir} exePath={game.exe_path} />
              </div>
            )}

            {activeTab === "history" && (
              <div className="flex-1 overflow-y-auto p-6">
                {loadingSessions && (
                  <div className="flex justify-center py-12">
                    <div className="w-5 h-5 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin" />
                  </div>
                )}
                {!loadingSessions && sessions !== null && sessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClockIcon size={28} className="text-slate-700 mb-3" />
                    <p className="text-[13px] text-slate-600">No sessions recorded yet</p>
                    <p className="text-[11px] text-slate-700 mt-1">Sessions are tracked when you launch games</p>
                  </div>
                )}
                {!loadingSessions && sessions && sessions.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-1">
                      {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
                    </p>
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="glass rounded-xl px-4 py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-[12px] text-slate-300 font-medium">
                            {new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {new Date(s.started_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ClockIcon size={11} className="text-accent-500" />
                          <span className="text-[12px] text-slate-400 font-medium">
                            {s.duration_mins < 60
                              ? `${s.duration_mins}m`
                              : `${Math.floor(s.duration_mins / 60)}h ${s.duration_mins % 60}m`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={async () => {
                    try {
                      const data = await api.fetchHltbData(game.id, game.name);
                      if (data) {
                        useGameStore.getState().updateGame({ ...game, hltb_main_mins: data.main_mins, hltb_extra_mins: data.extra_mins });
                        addToast("HLTB data fetched", "success");
                      } else {
                        addToast("No HLTB data found", "info");
                      }
                    } catch {
                      addToast("Could not fetch HLTB data", "error");
                    }
                  }}
                  data-tour="hltb-btn"
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-accent-400 glass transition-all duration-200"
                  title="Fetch HowLongToBeat estimate"
                >
                  <ClockIcon size={15} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleIgdbFetch}
                  disabled={igdbFetching}
                  data-tour="igdb-btn"
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-accent-400 glass transition-all duration-200 disabled:opacity-40"
                  title="Fetch IGDB metadata"
                >
                  {igdbFetching ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin" />
                  ) : (
                    <SearchIcon size={15} />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => toggleFavorite(game.id)}
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                    game.is_favorite
                      ? "text-pink-400 bg-pink-500/15 border border-pink-500/25 glow-inner"
                      : "text-slate-600 hover:text-pink-400 glass"
                  )}
                >
                  <HeartIcon size={16} filled={game.is_favorite} />
                </motion.button>
              </div>

              <div className="flex gap-2">
                <motion.button
                  data-tour="play-btn"
                  whileHover={{ scale: activeGameId === game.id ? 1 : 1.02 }}
                  whileTap={{ scale: activeGameId === game.id ? 1 : 0.98 }}
                  onClick={activeGameId === game.id ? undefined : handlePlay}
                  className={cn(
                    "btn-primary flex-1 justify-center py-3 transition-all",
                    activeGameId === game.id && "bg-green-600 hover:bg-green-600 cursor-default",
                    gameStarted && activeGameId !== game.id && "bg-green-600 hover:bg-green-500",
                  )}
                  style={{ boxShadow: activeGameId === game.id ? "0 0 25px rgba(34,197,94,0.3)" : gameStarted ? "0 0 25px rgba(34,197,94,0.3)" : "0 0 25px rgb(var(--accent-500) /0.2)" }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {activeGameId === game.id ? (
                      <motion.span key="playing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" /></span>
                        Playing
                      </motion.span>
                    ) : gameStarted ? (
                      <motion.span key="started" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center gap-1.5">
                        <CheckIcon size={14} />
                        Game Started
                      </motion.span>
                    ) : (
                      <motion.span key="play" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex items-center gap-1.5">
                        <PlayIcon size={14} />
                        Play
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => api.openGameFolder(game.id).catch(() => {})}
                  className="btn-icon w-10 h-10"
                  title="Open game folder"
                >
                  <FolderIcon size={15} />
                </motion.button>
                <div className="relative shrink-0" ref={collectionMenuRef}>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowCollectionMenu((v) => !v)}
                    className={cn("btn-icon w-10 h-10", showCollectionMenu && "text-accent-400 border-accent-500/30 bg-accent-500/10")}
                    title="Add to Collection"
                  >
                    <PlusIcon size={15} />
                  </motion.button>
                  <AnimatePresence>
                    {showCollectionMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-2 right-0 min-w-[180px] glass rounded-xl border border-white/8 shadow-xl z-50 overflow-hidden"
                      >
                        <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-semibold px-3 pt-2.5 pb-1.5">Collections</p>
                        {allCollections.length === 0 ? (
                          <p className="text-[12px] text-slate-600 px-3 pb-3">No collections yet</p>
                        ) : (
                          <div className="flex flex-col pb-1.5">
                            {allCollections.map((col) => {
                              const active = gameCollections.some((c) => c.id === col.id);
                              return (
                                <button
                                  key={col.id}
                                  onClick={() => toggleCollection(col)}
                                  className={cn(
                                    "flex items-center gap-2.5 px-3 py-2 text-[12px] text-left transition-colors hover:bg-white/5",
                                    active ? "text-accent-300" : "text-slate-400"
                                  )}
                                >
                                  <span className={cn("w-3.5 h-3.5 rounded flex items-center justify-center border", active ? "bg-accent-600/40 border-accent-500/50" : "border-white/15")}>
                                    {active && <CheckIcon size={9} />}
                                  </span>
                                  {col.name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleDelete}
                  className="btn-icon w-10 h-10 text-red-500/50 hover:text-red-400"
                  style={{ borderColor: "rgba(239,68,68,0.06)" }}
                  title="Remove game"
                >
                  <TrashIcon size={15} />
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

              {(game.hltb_main_mins || game.hltb_extra_mins) && (
                <div className="col-span-2 flex items-center gap-3 py-2 px-3 rounded-xl glass">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em]">HLTB</span>
                  {game.hltb_main_mins && (
                    <span className="text-[12px] text-slate-400">Main: <span className="text-slate-200 font-medium">{Math.round(game.hltb_main_mins / 60 * 10) / 10}h</span></span>
                  )}
                  {game.hltb_extra_mins && (
                    <span className="text-[12px] text-slate-400 ml-2">+Extra: <span className="text-slate-200 font-medium">{Math.round(game.hltb_extra_mins / 60 * 10) / 10}h</span></span>
                  )}
                </div>
              )}

              {(game.genre || game.developer || game.publisher || game.release_year) && (
                <IgdbMetadataCard game={game} onClear={handleClearIgdb} />
              )}

              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-2.5">Your Rating</p>
                <StarRating value={game.rating} onChange={(v) => update({ id: game.id, rating: v }, { onSuccess: flashSaved })} size="md" />
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
                  {customStatuses.map((s) => (
                    <motion.button
                      key={s.key}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => update({ id: game.id, status: s.key as import("@/lib/types").GameStatus })}
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
                    {game.tags.map((t) => {
                      const pending = pendingTags.has(t);
                      return (
                        <motion.button
                          key={t}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: pending ? 0.45 : 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => pending ? undoRemoveTag(t) : removeTag(t)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[11px] transition-all duration-200 group flex items-center gap-1",
                            pending
                              ? "glass text-slate-600 border-red-500/15 line-through"
                              : "glass text-slate-400 hover:text-red-400 hover:border-red-500/25"
                          )}
                          title={pending ? "Click to undo" : "Click to remove"}
                        >
                          {t}
                          <span className={cn("text-[9px]", pending ? "text-accent-500 no-underline" : "text-slate-700 group-hover:text-red-400")}>
                            {pending ? "↩" : "x"}
                          </span>
                        </motion.button>
                      );
                    })}
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
                  <div>
                    <motion.p
                      whileHover={{ borderColor: "rgb(var(--accent-500) /0.2)" }}
                      onClick={() => { setDescVal(game.description ?? ""); setEditingDesc(true); }}
                      className={cn(
                        "text-[13px] cursor-text leading-relaxed rounded-xl p-4 glass transition-all duration-300 min-h-[64px]",
                        game.description ? "text-slate-300" : "text-slate-700 italic"
                      )}
                    >
                      {game.description
                        ? (!descExpanded && game.description.length > 200
                            ? game.description.slice(0, 200) + "…"
                            : game.description)
                        : "Click to add a description..."}
                    </motion.p>
                    {game.description && game.description.length > 200 && (
                      <button
                        onClick={() => setDescExpanded((v) => !v)}
                        className="mt-1 text-[11px] text-accent-400 hover:text-accent-300 transition-colors"
                      >
                        {descExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.15em]">Custom Fields</span>
                  <button
                    onClick={() => {
                      const key = prompt("Field name:");
                      if (!key?.trim()) return;
                      update({ id: game.id, custom_fields: { ...game.custom_fields, [key.trim()]: "" } });
                    }}
                    className="text-[10px] text-slate-600 hover:text-accent-400 transition-colors"
                  >
                    + Add
                  </button>
                </div>
                {Object.entries(game.custom_fields).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] text-slate-500 w-24 shrink-0 truncate">{key}</span>
                    <input
                      defaultValue={val}
                      onBlur={(e) => {
                        if (e.target.value !== val) {
                          update({ id: game.id, custom_fields: { ...game.custom_fields, [key]: e.target.value } });
                        }
                      }}
                      className="input-glass text-[11px] py-1 flex-1"
                    />
                    <button
                      onClick={() => {
                        const next = { ...game.custom_fields };
                        delete next[key];
                        update({ id: game.id, custom_fields: next });
                      }}
                      className="text-slate-700 hover:text-red-400 transition-colors shrink-0"
                    >
                      <TrashIcon size={11} />
                    </button>
                  </div>
                ))}
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

  function ScreenshotThumb({ path, onOpen }: { path: string; onOpen?: () => void }) {
    const [hovered, setHovered] = useState(false);
    const dataUrl = useScreenshotUrl(path);
    const addToast = useUIStore((s) => s.addToast);

    const folderPath = path.replace(/[\\/][^\\/]+$/, "");

    const copyPath = async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(path);
      addToast("Path copied", "success");
    };

    const openFile = (e: React.MouseEvent) => {
      e.stopPropagation();
      api.openUrl(path).catch(() => {});
    };

    const openFolder = (e: React.MouseEvent) => {
      e.stopPropagation();
      api.openUrl(folderPath).catch(() => {});
    };

    const exportScreenshot = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!dataUrl) return;
      const a = document.createElement("a");
      const fileName = path.split(/[\\/]/).pop() ?? "screenshot.jpg";
      a.href = dataUrl;
      a.download = fileName;
      a.click();
    };

    return (
      <>
        <div
          className="break-inside-avoid rounded-xl overflow-hidden mb-2 border border-white/5 hover:border-accent-500/30 transition-colors relative group"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <motion.div whileHover={{ scale: 1.02 }} onClick={() => onOpen?.()} className="cursor-zoom-in">
            {dataUrl ? (
              <img src={dataUrl} alt="" className="w-full h-auto block" />
            ) : (
              <div className="w-full aspect-video bg-white/3 animate-pulse" />
            )}
          </motion.div>
          <AnimatePresence>
            {hovered && dataUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 p-1.5"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
              >
                <button onClick={copyPath} title="Copy path" className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors">
                  <CopyIcon size={11} />
                </button>
                <button onClick={openFile} title="Open file" className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors">
                  <ExternalLinkIcon size={11} />
                </button>
                <button onClick={openFolder} title="Open folder" className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors">
                  <FolderIcon size={11} />
                </button>
                <button onClick={exportScreenshot} title="Export / download" className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors">
                  <ImageIcon size={11} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onOpen?.(); }} title="View fullscreen" className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors">
                  <SearchIcon size={11} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  }
}

function ScreenshotLightboxImg({ path, onClick }: { path: string; onClick: (e: React.MouseEvent) => void }) {
  const dataUrl = useScreenshotUrl(path);
  if (!dataUrl) return <div className="w-64 h-40 animate-pulse bg-white/5 rounded-xl" />;
  return (
    <motion.img
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      src={dataUrl}
      alt=""
      className="max-w-full max-h-full rounded-xl object-contain"
      onClick={onClick}
    />
  );
}

function useScreenshotUrl(path: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.readImageBase64(path)
      .then((data) => { if (!cancelled) setUrl(data); })
      .catch(() => { if (!cancelled) setUrl(""); });
    return () => { cancelled = true; };
  }, [path]);
  return url || null;
}
