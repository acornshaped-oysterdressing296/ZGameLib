import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { cn } from "@/lib/utils";

const GOAL_KEY = "zgamelib-weekly-goal-mins";
const GOAL_ENABLED_KEY = "zgamelib-weekly-goal-enabled";

function getThisWeekPlaytime(games: ReturnType<typeof useGameStore.getState>["games"]): number {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekStr = startOfWeek.toISOString();
  return games
    .filter((g) => g.last_played && g.last_played >= weekStr)
    .reduce((sum, g) => sum + g.playtime_mins, 0);
}

export default function GoalBar() {
  const games = useGameStore((s) => s.games);
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(GOAL_ENABLED_KEY) === "1"; } catch { return false; }
  });
  const [goalMins, setGoalMins] = useState(() => {
    try { return parseInt(localStorage.getItem(GOAL_KEY) ?? "300", 10); } catch { return 300; }
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!enabled) {
    return (
      <button
        onClick={() => { setEnabled(true); try { localStorage.setItem(GOAL_ENABLED_KEY, "1"); } catch {} }}
        className="mx-6 mt-4 mb-0 text-[11px] text-slate-700 hover:text-slate-500 transition-colors text-left"
      >
        + Set weekly playtime goal
      </button>
    );
  }

  const weeklyMins = getThisWeekPlaytime(games);
  const pct = Math.min(100, Math.round((weeklyMins / goalMins) * 100));
  const goalHours = Math.round(goalMins / 60 * 10) / 10;
  const playedHours = Math.round(weeklyMins / 60 * 10) / 10;
  const done = weeklyMins >= goalMins;

  const commitGoal = () => {
    const v = parseInt(draft, 10);
    if (!isNaN(v) && v > 0) {
      const mins = v * 60;
      setGoalMins(mins);
      try { localStorage.setItem(GOAL_KEY, String(mins)); } catch {}
    }
    setEditing(false);
  };

  return (
    <div className="mx-6 mt-4 mb-0 glass rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em]">Weekly Goal</span>
          {done && <span className="text-[10px] text-emerald-400 font-medium">Goal reached! 🎉</span>}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="number"
                min={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitGoal(); if (e.key === "Escape") setEditing(false); }}
                onBlur={commitGoal}
                placeholder={String(Math.round(goalMins / 60))}
                className="w-10 bg-transparent border-b border-accent-500/50 text-[12px] text-slate-200 text-center outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-slate-500">h/wk</span>
            </div>
          ) : (
            <button
              onClick={() => { setDraft(String(Math.round(goalMins / 60))); setEditing(true); }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors tabular-nums"
              title="Edit goal"
            >
              {goalHours}h goal
            </button>
          )}
          <button
            onClick={() => { setEnabled(false); try { localStorage.setItem(GOAL_ENABLED_KEY, "0"); } catch {} }}
            className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors ml-1"
            title="Remove goal"
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", done ? "bg-emerald-500" : "bg-accent-500")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
          {playedHours}h / {goalHours}h
        </span>
        <span className="text-[11px] font-medium tabular-nums shrink-0" style={{ color: done ? "#34d399" : "rgb(var(--accent-400))" }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}
