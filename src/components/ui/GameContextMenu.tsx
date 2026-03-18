import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PlayIcon, FolderIcon, HeartIcon, CopyIcon, SettingsIcon, PinIcon, TrashIcon } from "@/components/ui/Icons";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useGames } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import type { Game } from "@/lib/types";

interface MenuPosition {
  x: number;
  y: number;
}

interface GameContextMenuProps {
  game: Game;
  children: ReactNode;
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  dividerBefore?: boolean;
}

function ContextMenuPortal({
  position,
  items,
  onClose,
}: {
  position: MenuPosition;
  items: MenuItem[];
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState<MenuPosition>(position);

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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleScroll = () => onClose();
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] py-1.5 glass-strong rounded-xl border border-white/[0.06] shadow-2xl"
      style={{ left: adjusted.x, top: adjusted.y, animation: "ctx-menu-in 0.12s ease-out" }}
    >
      {items.map((item) => (
        <div key={item.label}>
          {item.dividerBefore && <div className="my-1 mx-2 border-t border-white/[0.06]" />}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2 text-[13px] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors duration-150 ${item.className ?? ""}`}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70">
              {item.icon}
            </span>
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

export default function GameContextMenu({ game, children }: GameContextMenuProps) {
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const addToast = useUIStore((s) => s.addToast);
  const { toggleFavorite, togglePinned, remove } = useGames();

  const close = useCallback(() => setMenuPos(null), []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePlay = useCallback(async () => {
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
  }, [game, addToast]);

  const handleOpenFolder = useCallback(async () => {
    try {
      await api.openGameFolder(game.id);
    } catch (err) {
      addToast(String(err), "error");
    }
  }, [game.id, addToast]);

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(game.id);
  }, [game.id, toggleFavorite]);

  const handleTogglePinned = useCallback(() => {
    togglePinned(game.id);
  }, [game.id, togglePinned]);

  const handleCopyName = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(game.name);
      addToast("Name copied to clipboard", "success");
    } catch {
      addToast("Failed to copy name", "error");
    }
  }, [game.name, addToast]);

  const handleViewDetails = useCallback(() => {
    setSelectedGameId(game.id);
    setDetailOpen(true);
  }, [game.id, setSelectedGameId, setDetailOpen]);

  const handleDelete = useCallback(() => {
    remove(game.id);
  }, [game.id, remove]);

  const items: MenuItem[] = [
    { label: "Play", icon: <PlayIcon size={14} />, onClick: handlePlay, className: "hover:text-cyan-400" },
    { label: "Open Folder", icon: <FolderIcon size={14} />, onClick: handleOpenFolder },
    { label: game.is_favorite ? "Unfavorite" : "Favorite", icon: <HeartIcon size={14} filled={game.is_favorite} />, onClick: handleToggleFavorite, className: game.is_favorite ? "text-pink-400" : "" },
    { label: game.is_pinned ? "Unpin" : "Pin", icon: <PinIcon size={14} filled={game.is_pinned} />, onClick: handleTogglePinned, className: game.is_pinned ? "text-accent-400" : "" },
    { label: "Copy Name", icon: <CopyIcon size={14} />, onClick: handleCopyName },
    { label: "View Details", icon: <SettingsIcon size={14} />, onClick: handleViewDetails },
    { label: "Delete", icon: <TrashIcon size={14} />, onClick: handleDelete, className: "text-red-400 hover:text-red-300 hover:bg-red-500/[0.06]", dividerBefore: true },
  ];

  return (
    <div onContextMenu={handleContextMenu} className="contents">
      {children}
      {menuPos && (
        <ContextMenuPortal position={menuPos} items={items} onClose={close} />
      )}
    </div>
  );
}
