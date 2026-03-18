import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import type { Platform } from "@/lib/types";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GamepadIcon, LibraryIcon, HeartIcon, ClockIcon, ChartIcon,
  SettingsIcon, SteamIcon, EpicIcon, CustomGameIcon,
  SparkleIcon, SpinIcon, GogIcon, ChevronLeftIcon, ImageIcon,
} from "@/components/ui/Icons";

const STORAGE_KEY = "zgamelib-sidebar-collapsed";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const games = useGameStore((s) => s.games);
  const filters = useGameStore((s) => s.filters);
  const setFilter = useGameStore((s) => s.setFilter);
  const resetFilters = useGameStore((s) => s.resetFilters);
  const customStatuses = useUIStore((s) => s.customStatuses);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  };

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
        key={path}
        onClick={() => { resetFilters(); navigate(path); }}
        title={collapsed ? label : undefined}
        className={cn(
          "w-full flex items-center rounded-xl text-[13px] font-medium transition-all duration-300 relative group",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
          isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
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
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        {isActive && !collapsed && (
          <motion.div
            layoutId="nav-dot"
            className="absolute -left-3 top-0 bottom-0 w-[3px] rounded-r-full bg-accent-500"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
      </button>
    );
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 62 : 240 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="shrink-0 flex flex-col h-full glass-sidebar py-5 px-3 gap-1 overflow-y-auto overflow-x-hidden"
    >
      {/* Header */}
      <div className={cn("flex mb-6", collapsed ? "flex-col items-center gap-2" : "items-center gap-3 px-3")}>
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center glow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(var(--accent-600)) 0%, rgb(var(--accent-400)) 100%)" }}
        >
          <GamepadIcon size={18} className="text-white" />
        </motion.div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-hidden"
            >
              <span className="font-bold text-[15px] text-white tracking-tight whitespace-nowrap">ZGameLib</span>
              <span className="block text-[10px] text-slate-600 -mt-0.5 whitespace-nowrap">Personal Library</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-7 h-7 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 shrink-0"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronLeftIcon size={14} />
          </motion.div>
        </button>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-0.5">
        {navItem("/", <LibraryIcon size={16} />, "Library")}
        {navItem("/favorites", <HeartIcon size={16} />, "Favorites")}
        {navItem("/recent", <ClockIcon size={16} />, "Recently Played")}
        {navItem("/stats", <ChartIcon size={16} />, "Stats")}
        {navItem("/spin", <SpinIcon size={16} />, "Game Spin")}
        {navItem("/settings", <SettingsIcon size={16} />, "Settings")}
      </div>

      {/* Overview / Platform / Status — hidden when collapsed */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1"
          >
            <div className="glass rounded-xl p-3 mt-5 mx-1">
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

            <div className="mt-4 mb-1">
              <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.15em] px-3 mb-2 flex items-center gap-1.5">
                <span className="w-3 h-px bg-slate-800" />
                Platforms
                <span className="flex-1 h-px bg-slate-800" />
              </p>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => { setFilter("platform", "all"); if (location.pathname !== "/") navigate("/"); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300",
                    filters.platform === "all"
                      ? "text-accent-300 bg-accent-500/10 border border-accent-500/20"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border border-transparent"
                  )}
                >
                  <LibraryIcon size={14} />
                  <span className="flex-1 text-left">All</span>
                  <span className={cn("text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md", games.length > 0 ? "text-slate-500 bg-white/4" : "text-slate-700")}>
                    {games.length}
                  </span>
                </button>
                {platformCounts.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setFilter("platform", filters.platform === p.key ? "all" : p.key); if (location.pathname !== "/") navigate("/"); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300",
                      filters.platform === p.key
                        ? "text-accent-300 bg-accent-500/10 border border-accent-500/20"
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border border-transparent"
                    )}
                  >
                    <p.icon size={14} />
                    <span className="flex-1 text-left">{p.label}</span>
                    <span className={cn("text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md", p.count > 0 ? "text-slate-500 bg-white/4" : "text-slate-700")}>
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
                      onClick={() => { setFilter("status", filters.status === s.key ? "all" : s.key as import("@/lib/types").GameStatus); if (location.pathname !== "/") navigate("/"); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300 border",
                        filters.status === s.key
                          ? "text-accent-300 bg-accent-500/10 border-accent-500/20"
                          : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border-transparent"
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 text-left">{s.label}</span>
                      {count > 0 && <span className="text-[11px] text-slate-600 tabular-nums">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 mb-1">
              <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.15em] px-3 mb-2 flex items-center gap-1.5">
                <span className="w-3 h-px bg-slate-800" />
                Cover Art
                <span className="flex-1 h-px bg-slate-800" />
              </p>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => { setFilter("hasCover", filters.hasCover === true ? null : true); if (location.pathname !== "/") navigate("/"); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300 border",
                    filters.hasCover === true
                      ? "text-accent-300 bg-accent-500/10 border-accent-500/20"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border-transparent"
                  )}
                >
                  <ImageIcon size={14} />
                  <span className="flex-1 text-left">Has Cover</span>
                  <span className={cn("text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md", "text-slate-500 bg-white/4")}>
                    {games.filter(g => g.cover_path !== null && g.cover_path !== undefined && g.cover_path !== "").length}
                  </span>
                </button>
                <button
                  onClick={() => { setFilter("hasCover", filters.hasCover === false ? null : false); if (location.pathname !== "/") navigate("/"); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-300 border",
                    filters.hasCover === false
                      ? "text-accent-300 bg-accent-500/10 border-accent-500/20"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/3 border-transparent"
                  )}
                >
                  <ImageIcon size={14} />
                  <span className="flex-1 text-left">Missing Cover</span>
                  <span className={cn("text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md", "text-slate-500 bg-white/4")}>
                    {games.filter(g => !g.cover_path).length}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.aside>
  );
}
