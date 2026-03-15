import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useScan } from "@/hooks/useGames";
import type { Platform } from "@/lib/types";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GamepadIcon, LibraryIcon, HeartIcon, ClockIcon, ChartIcon,
  SettingsIcon, PlusIcon, ScanIcon, SteamIcon, EpicIcon, CustomGameIcon,
  SparkleIcon, SpinIcon, GogIcon
} from "@/components/ui/Icons";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const games = useGameStore((s) => s.games);
  const filters = useGameStore((s) => s.filters);
  const setFilter = useGameStore((s) => s.setFilter);
  const resetFilters = useGameStore((s) => s.resetFilters);
  const setAddGameOpen = useUIStore((s) => s.setAddGameOpen);
  const customStatuses = useUIStore((s) => s.customStatuses);
  const { scan, isScanning } = useScan();

  const platformCounts = [
    { key: "steam" as Platform, label: "Steam", icon: SteamIcon, count: games.filter((g) => g.platform === "steam").length },
    { key: "epic" as Platform, label: "Epic Games", icon: EpicIcon, count: games.filter((g) => g.platform === "epic").length },
    { key: "gog" as Platform, label: "GOG", icon: GogIcon, count: games.filter((g) => g.platform === "gog").length },
    { key: "custom" as Platform, label: "Custom", icon: CustomGameIcon, count: games.filter((g) => g.platform === "custom").length },
  ];

  const navItem = (path: string, icon: React.ReactNode, label: string) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => { resetFilters(); navigate(path); }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 relative group",
          isActive
            ? "text-white"
            : "text-slate-500 hover:text-slate-300"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="nav-active"
            className="absolute inset-0 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgb(var(--accent-500) /0.15) 0%, rgb(var(--accent-800) /0.1) 100%)",
              border: "1px solid rgb(var(--accent-500) /0.2)",
              boxShadow: "0 0 20px rgb(var(--accent-500) /0.08), inset 0 0 20px rgb(var(--accent-500) /0.03)",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3">
          {icon}
          {label}
        </span>
        {isActive && (
          <motion.div
            layoutId="nav-dot"
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent-500"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
      </button>
    );
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full glass-sidebar py-5 px-3 gap-1 overflow-y-auto overflow-x-hidden">
      <div className="flex items-center gap-3 px-3 mb-6">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center glow-sm"
          style={{
            background: "linear-gradient(135deg, rgb(var(--accent-600)) 0%, rgb(var(--accent-400)) 100%)",
          }}
        >
          <GamepadIcon size={18} className="text-white" />
        </motion.div>
        <div>
          <span className="font-bold text-[15px] text-white tracking-tight">ZGameLib</span>
          <span className="block text-[10px] text-slate-600 -mt-0.5">Personal Library</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {navItem("/", <LibraryIcon size={16} />, "Library")}
        {navItem("/favorites", <HeartIcon size={16} />, "Favorites")}
        {navItem("/recent", <ClockIcon size={16} />, "Recently Played")}
        {navItem("/stats", <ChartIcon size={16} />, "Stats")}
        {navItem("/spin", <SpinIcon size={16} />, "Game Spin")}
        {navItem("/settings", <SettingsIcon size={16} />, "Settings")}
      </div>

      <div className="mt-6 mb-1">
        <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.15em] px-3 mb-2 flex items-center gap-1.5">
          <span className="w-3 h-px bg-slate-800" />
          Platforms
          <span className="flex-1 h-px bg-slate-800" />
        </p>
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => {
              setFilter("platform", "all");
              if (location.pathname !== "/") navigate("/");
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300",
              filters.platform === "all"
                ? "text-accent-300 bg-accent-500/10 border border-accent-500/20"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border border-transparent"
            )}
          >
            <LibraryIcon size={14} />
            <span className="flex-1 text-left">All</span>
            <span className={cn(
              "text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md",
              games.length > 0 ? "text-slate-500 bg-white/4" : "text-slate-700"
            )}>
              {games.length}
            </span>
          </button>
          {platformCounts.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setFilter("platform", filters.platform === p.key ? "all" : p.key);
                if (location.pathname !== "/") navigate("/");
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300",
                filters.platform === p.key
                  ? "text-accent-300 bg-accent-500/10 border border-accent-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border border-transparent"
              )}
            >
              <p.icon size={14} />
              <span className="flex-1 text-left">{p.label}</span>
              <span className={cn(
                "text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md",
                p.count > 0 ? "text-slate-500 bg-white/4" : "text-slate-700"
              )}>
                {p.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 mb-1">
        <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.15em] px-3 mb-2 flex items-center gap-1.5">
          <span className="w-3 h-px bg-slate-800" />
          Status
          <span className="flex-1 h-px bg-slate-800" />
        </p>
        <div className="flex flex-col gap-0.5">
          {customStatuses.map((s) => {
            const count = games.filter((g) => g.status === s.key).length;
            return (
              <button
                key={s.key}
                onClick={() => {
                  setFilter("status", filters.status === s.key ? "all" : s.key);
                  if (location.pathname !== "/") navigate("/");
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300 border",
                  filters.status === s.key
                    ? "text-accent-300 bg-accent-500/10 border-accent-500/20"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border-transparent"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-left">{s.label}</span>
                {count > 0 && (
                  <span className="text-[11px] text-slate-600 tabular-nums">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1" />

      <div className="glass rounded-xl p-3 mb-3 mx-1">
        <div className="flex items-center gap-2 mb-2">
          <SparkleIcon size={12} className="text-accent-400" />
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Overview</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-lg font-bold text-white">{games.length}</span>
            <span className="block text-[10px] text-slate-600">Games</span>
          </div>
          <div>
            <span className="text-lg font-bold text-accent-400">{games.filter(g => g.is_favorite).length}</span>
            <span className="block text-[10px] text-slate-600">Favorites</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-1">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setAddGameOpen(true)}
          className="btn-primary justify-center"
        >
          <PlusIcon size={14} />
          Add Game
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => scan()}
          disabled={isScanning}
          className="btn-ghost justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <motion.span
            animate={isScanning ? { rotate: 360 } : {}}
            transition={isScanning ? { duration: 1.5, repeat: Infinity, ease: "linear" } : {}}
          >
            <ScanIcon size={14} />
          </motion.span>
          {isScanning ? "Scanning..." : "Scan Games"}
        </motion.button>
      </div>
    </aside>
  );
}
