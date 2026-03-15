import { useGameStore } from "@/store/useGameStore";
import { useFilteredGames } from "@/hooks/useGames";
import { useUIStore } from "@/store/useUIStore";
import type { SortKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  SearchIcon, GridIcon, ListIcon, SortAscIcon, SortDescIcon, CloseIcon, TerminalIcon
} from "@/components/ui/Icons";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "rating", label: "Rating" },
  { key: "last_played", label: "Last Played" },
  { key: "date_added", label: "Date Added" },
  { key: "playtime_mins", label: "Playtime" },
];

export default function Topbar() {
  const search = useGameStore((s) => s.search);
  const setSearch = useGameStore((s) => s.setSearch);
  const viewMode = useGameStore((s) => s.viewMode);
  const setViewMode = useGameStore((s) => s.setViewMode);
  const sortKey = useGameStore((s) => s.sortKey);
  const setSortKey = useGameStore((s) => s.setSortKey);
  const sortAsc = useGameStore((s) => s.sortAsc);
  const setSortAsc = useGameStore((s) => s.setSortAsc);
  const filteredGames = useFilteredGames();
  const filteredCount = filteredGames.length;
  const totalCount = useGameStore((s) => s.games.length);
  const logPanelOpen = useUIStore((s) => s.logPanelOpen);
  const setLogPanelOpen = useUIStore((s) => s.setLogPanelOpen);
  const logCount = useUIStore((s) => s.logs.length);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex items-center gap-4 px-6 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      {/* Search */}
      <div className="relative flex-1 max-w-lg group">
        <SearchIcon
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-accent-400 transition-colors duration-300"
        />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games…"
          className="input-glass pl-10 pr-16"
        />
        {search && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all"
          >
            <CloseIcon size={11} />
          </motion.button>
        )}
      </div>

      {/* Game count pill */}
      <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
        <span className="text-[11px] text-slate-400 tabular-nums font-medium">
          {filteredCount === totalCount
            ? `${totalCount} games`
            : `${filteredCount} of ${totalCount}`}
        </span>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-1.5">
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="input-glass py-2 text-[12px] pr-8 w-auto min-w-[120px] cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key} className="bg-[#0d0c14]">
              {o.label}
            </option>
          ))}
        </select>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setSortAsc(!sortAsc)}
          className="btn-icon"
          title={sortAsc ? "Ascending" : "Descending"}
        >
          {sortAsc ? <SortAscIcon size={14} /> : <SortDescIcon size={14} />}
        </motion.button>
      </div>

      {/* Log Panel Toggle */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setLogPanelOpen(!logPanelOpen)}
        className={cn("btn-icon relative", logPanelOpen && "text-emerald-400")}
        title="Scan log"
      >
        <TerminalIcon size={14} />
        {logCount > 0 && !logPanelOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
        )}
      </motion.button>

      {/* View Toggle */}
      <div className="flex items-center glass rounded-xl p-1 gap-0.5">
        {[
          { mode: "grid" as const, Icon: GridIcon },
          { mode: "list" as const, Icon: ListIcon },
        ].map(({ mode, Icon }) => (
          <motion.button
            key={mode}
            whileTap={{ scale: 0.9 }}
            onClick={() => setViewMode(mode)}
            className={cn(
              "p-2 rounded-lg transition-all duration-250 relative",
              viewMode === mode
                ? "text-white"
                : "text-slate-600 hover:text-slate-400"
            )}
          >
            {viewMode === mode && (
              <motion.div
                layoutId="view-toggle"
                className="absolute inset-0 rounded-lg"
                style={{ background: "linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-700)))" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              <Icon size={14} />
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
