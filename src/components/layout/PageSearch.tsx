import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { useFilteredGames } from "@/hooks/useGames";
import type { SortKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  SearchIcon, CloseIcon, GridIcon, ListIcon,
  SortAscIcon, SortDescIcon, EyeIcon, EyeOffIcon,
} from "@/components/ui/Icons";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "rating", label: "Rating" },
  { key: "last_played", label: "Last Played" },
  { key: "date_added", label: "Date Added" },
  { key: "playtime_mins", label: "Playtime" },
  { key: "sort_order", label: "Custom Order" },
];

interface PageSearchProps {
  showSort?: boolean;
  showViewToggle?: boolean;
}

export default function PageSearch({ showSort = true, showViewToggle = true }: PageSearchProps) {
  const setSearch = useGameStore((s) => s.setSearch);
  const [localSearch, setLocalSearch] = useState("");
  const viewMode = useGameStore((s) => s.viewMode);
  const setViewMode = useGameStore((s) => s.setViewMode);
  const sortKey = useGameStore((s) => s.sortKey);
  const setSortKey = useGameStore((s) => s.setSortKey);
  const sortAsc = useGameStore((s) => s.sortAsc);
  const setSortAsc = useGameStore((s) => s.setSortAsc);
  const filteredGames = useFilteredGames();
  const totalCount = useGameStore((s) => s.games.length);
  const hiddenIds = useGameStore((s) => s.hiddenIds);
  const showHidden = useGameStore((s) => s.showHidden);
  const toggleShowHidden = useGameStore((s) => s.toggleShowHidden);
  const searchScope = useGameStore((s) => s.searchScope);
  const setSearchScope = useGameStore((s) => s.setSearchScope);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleTotal = showHidden ? totalCount : totalCount - hiddenIds.length;
  const filteredCount = filteredGames.length;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(localSearch), 150);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") inputRef.current?.blur();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex items-center gap-3 px-6 pt-5 pb-3">
      <div className="relative flex-1 max-w-xs group">
        <SearchIcon
          size={14}
          className="absolute left-3 inset-y-0 my-auto text-slate-600 pointer-events-none group-focus-within:text-accent-400 transition-colors duration-300"
        />
        <input
          ref={inputRef}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search… (/)"
          className="input-glass pl-9 pr-16"
          aria-label="Search games"
        />
        <div className="absolute right-2 inset-y-0 flex items-center gap-1">
          <AnimatePresence>
            {localSearch && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => setLocalSearch("")}
                className="w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/8 transition-all"
                aria-label="Clear search"
              >
                <CloseIcon size={11} />
              </motion.button>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSearchScope(searchScope === "name" ? "all" : "name")}
            title={searchScope === "all" ? "Searching name + description" : "Searching name only (click to include description)"}
            aria-label="Toggle search scope"
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold transition-colors",
              searchScope === "all" ? "text-accent-400" : "text-slate-600 hover:text-slate-400"
            )}
          >
            {searchScope === "all" ? "A+" : "A"}
          </button>
        </div>
      </div>

      <div className="glass rounded-full px-3 py-1.5 flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
        <span className="text-[11px] text-slate-400 tabular-nums font-medium">
          {filteredCount === visibleTotal
            ? `${visibleTotal} games`
            : `${filteredCount} of ${visibleTotal}`}
        </span>
      </div>

      {hiddenIds.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={toggleShowHidden}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all shrink-0 border",
            showHidden
              ? "text-accent-300 border-accent-500/30 bg-accent-500/10"
              : "text-slate-500 border-white/6 bg-white/3 hover:text-slate-300"
          )}
          title={showHidden ? "Hide duplicates" : "Show hidden games"}
        >
          {showHidden ? <EyeOffIcon size={11} /> : <EyeIcon size={11} />}
          {hiddenIds.length} hidden
        </motion.button>
      )}

      <div className="flex-1" />

      {showSort && (
        <div className="flex items-center gap-1.5">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="input-glass py-2 text-[12px] pr-8 w-auto min-w-[110px] cursor-pointer"
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
      )}

      {showViewToggle && (
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
                viewMode === mode ? "text-white" : "text-slate-600 hover:text-slate-400"
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
      )}
    </div>
  );
}
