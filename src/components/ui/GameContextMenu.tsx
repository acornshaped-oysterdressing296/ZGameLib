import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PlayIcon, FolderIcon, HeartIcon, CopyIcon, SettingsIcon, PinIcon, TrashIcon, CheckIcon } from "@/components/ui/Icons";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useGames } from "@/hooks/useGames";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/tauri";
import { useLaunchGame } from "@/lib/useLaunchGame";
import type { Game, Collection } from "@/lib/types";

interface MenuPosition { x: number; y: number; }

interface GameContextMenuProps {
  game: Game;
  children: ReactNode;
  collectionId?: string;
  onRemoveFromCollection?: () => void;
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function ChevronRightIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FolderPlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 7C3 5.9 3.9 5 5 5H9.6C10.1 5 10.6 5.2 10.9 5.6L12 7H19C20.1 7 21 7.9 21 9V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 11V15M10 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CollectionsSubmenu({
  game,
  parentPos,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  game: Game;
  parentPos: { top: number; right: number };
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const qc = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const { data: allCollections = [] } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: () => api.getCollections(),
  });

  const { data: gameCollections = [] } = useQuery<Collection[]>({
    queryKey: ["game-collections", game.id],
    queryFn: () => api.getCollectionsForGame(game.id),
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let x = parentPos.right + 4;
    let y = parentPos.top;
    if (x + rect.width > window.innerWidth - 8) x = parentPos.right - rect.width - 180 - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    setPos({ x, y });
  }, [parentPos]);

  const toggle = async (col: Collection) => {
    const inCol = gameCollections.some((c) => c.id === col.id);
    try {
      if (inCol) {
        await api.removeGameFromCollection(col.id, game.id);
        addToast(`Removed from "${col.name}"`, "success");
      } else {
        await api.addGameToCollection(col.id, game.id);
        addToast(`Added to "${col.name}"`, "success");
      }
      qc.invalidateQueries({ queryKey: ["game-collections", game.id] });
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collection-games"] });
    } catch (e) {
      addToast(String(e), "error");
    }
  };

  return createPortal(
    <div
      ref={ref}
      data-ctx-submenu="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[10000] min-w-[180px] py-1.5 glass-strong rounded-xl border border-white/[0.06] shadow-2xl"
      style={pos ? { left: pos.x, top: pos.y } : { left: -9999, top: -9999 }}
    >
      <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-semibold px-3.5 pt-1 pb-1.5">Collections</p>
      {allCollections.length === 0 ? (
        <p className="text-[12px] text-slate-600 px-3.5 pb-2.5">No collections yet</p>
      ) : (
        allCollections.map((col) => {
          const active = gameCollections.some((c) => c.id === col.id);
          return (
            <button
              key={col.id}
              onClick={() => { toggle(col); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${active ? "bg-accent-600/40 border-accent-500/50 text-accent-300" : "border-white/15"}`}>
                {active && <CheckIcon size={9} />}
              </span>
              <span className="flex-1 text-left truncate">{col.name}</span>
              <span className="text-[10px] text-slate-700 tabular-nums">{col.game_count}</span>
            </button>
          );
        })
      )}
    </div>,
    document.body
  );
}

function ContextMenuPortal({
  position, game, onClose, collectionId, onRemoveFromCollection,
}: {
  position: MenuPosition;
  game: Game;
  onClose: () => void;
  collectionId?: string;
  onRemoveFromCollection?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<MenuPosition>(position);
  const [showCollections, setShowCollections] = useState(false);
  const [collectionsTriggerRect, setCollectionsTriggerRect] = useState<{ top: number; right: number } | null>(null);
  const collectionsTriggerRef = useRef<HTMLButtonElement>(null);
  const hideCollectionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCollections = () => {
    if (hideCollectionsTimer.current) clearTimeout(hideCollectionsTimer.current);
    setShowCollections(true);
    const rect = collectionsTriggerRef.current?.getBoundingClientRect();
    if (rect) setCollectionsTriggerRect({ top: rect.top, right: rect.right });
  };

  const scheduleHideCollections = () => {
    hideCollectionsTimer.current = setTimeout(() => setShowCollections(false), 150);
  };

  const cancelHideCollections = () => {
    if (hideCollectionsTimer.current) clearTimeout(hideCollectionsTimer.current);
  };

  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const addToast = useUIStore((s) => s.addToast);
  const { toggleFavorite, togglePinned, remove } = useGames();
  const { launch } = useLaunchGame();

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = position;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    setAdjusted({ x, y });
  }, [position]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (menuRef.current && !menuRef.current.contains(target as Node)) {
        if (!target.closest?.("[data-ctx-submenu]")) onClose();
      }
    };
    const id = requestAnimationFrame(() => document.addEventListener("mousedown", handleClick));
    return () => { cancelAnimationFrame(id); document.removeEventListener("mousedown", handleClick); };
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);

  const handlePlay = () => { launch(game); };

  const handleOpenFolder = async () => {
    try { await api.openGameFolder(game.id); } catch (err) { addToast(String(err), "error"); }
  };

  const handleCopyName = async () => {
    try { await navigator.clipboard.writeText(game.name); addToast("Name copied to clipboard", "success"); }
    catch { addToast("Failed to copy name", "error"); }
  };

  const rowCls = "w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors duration-150";

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[190px] py-1.5 glass-strong rounded-xl border border-white/[0.06] shadow-2xl"
      style={{ left: adjusted.x, top: adjusted.y, animation: "ctx-menu-in 0.12s ease-out" }}
    >
      <button onClick={() => { handlePlay(); onClose(); }} className={`${rowCls} hover:text-cyan-400`}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><PlayIcon size={14} /></span>
        Play
      </button>
      <button onClick={() => { handleOpenFolder(); onClose(); }} className={rowCls}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><FolderIcon size={14} /></span>
        Open Folder
      </button>
      <button onClick={() => { toggleFavorite(game.id); onClose(); }} className={`${rowCls} ${game.is_favorite ? "text-pink-400" : ""}`}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><HeartIcon size={14} filled={game.is_favorite} /></span>
        {game.is_favorite ? "Unfavorite" : "Favorite"}
      </button>
      <button onClick={() => { togglePinned(game.id); onClose(); }} className={`${rowCls} ${game.is_pinned ? "text-accent-400" : ""}`}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><PinIcon size={14} filled={game.is_pinned} /></span>
        {game.is_pinned ? "Unpin" : "Pin"}
      </button>
      <button onClick={() => { handleCopyName(); onClose(); }} className={rowCls}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><CopyIcon size={14} /></span>
        Copy Name
      </button>
      <button onClick={() => { setSelectedGameId(game.id); setDetailOpen(true); onClose(); }} className={rowCls}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><SettingsIcon size={14} /></span>
        View Details
      </button>

      <div className="my-1 mx-2 border-t border-white/[0.06]" />

      <button
        ref={collectionsTriggerRef}
        onMouseEnter={openCollections}
        onMouseLeave={scheduleHideCollections}
        className={`${rowCls} justify-between`}
      >
        <span className="flex items-center gap-3">
          <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><FolderPlusIcon size={14} /></span>
          Collections
        </span>
        <ChevronRightIcon size={12} />
      </button>
      {showCollections && collectionsTriggerRect && (
        <CollectionsSubmenu
          game={game}
          parentPos={collectionsTriggerRect}
          onClose={onClose}
          onMouseEnter={cancelHideCollections}
          onMouseLeave={scheduleHideCollections}
        />
      )}

      {collectionId && onRemoveFromCollection && (
        <button
          onClick={() => { onRemoveFromCollection(); onClose(); }}
          className={`${rowCls} text-orange-400 hover:text-orange-300 hover:bg-orange-500/[0.06]`}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><TrashIcon size={14} /></span>
          Remove from Collection
        </button>
      )}

      <div className="my-1 mx-2 border-t border-white/[0.06]" />
      <button onClick={() => { remove(game.id); onClose(); }} className={`${rowCls} text-red-400 hover:text-red-300 hover:bg-red-500/[0.06]`}>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70"><TrashIcon size={14} /></span>
        Delete
      </button>
    </div>,
    document.body
  );
}

export default function GameContextMenu({ game, children, collectionId, onRemoveFromCollection }: GameContextMenuProps) {
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const close = useCallback(() => setMenuPos(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div onContextMenu={handleContextMenu} className="contents">
      {children}
      {menuPos && (
        <ContextMenuPortal
          position={menuPos}
          game={game}
          onClose={close}
          collectionId={collectionId}
          onRemoveFromCollection={onRemoveFromCollection}
        />
      )}
    </div>
  );
}
