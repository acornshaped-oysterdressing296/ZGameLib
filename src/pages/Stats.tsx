import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/useGameStore";
import { formatPlaytime } from "@/lib/utils";
import type { Platform, GameStatus, Game } from "@/lib/types";
import { TrophyIcon, StarIcon, HeartIcon, GamepadIcon, ClockIcon, ChartIcon } from "@/components/ui/Icons";
import { useCover } from "@/hooks/useCover";

const PLATFORM_COLORS_HEX: Record<Platform, string> = {
  steam: "#38bdf8",
  epic: "#94a3b8",
  gog: "#c084fc",
  custom: "#a78bfa",
};

const STATUS_HEX: Record<GameStatus, string> = {
  none: "#475569",
  backlog: "#60a5fa",
  playing: "#4ade80",
  completed: "#a78bfa",
  dropped: "#f87171",
  on_hold: "#fbbf24",
};

function TopRatedCover({ game }: { game: Game }) {
  const src = useCover(game);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
    />
  );
}

function StatCard({ icon, label, value, sub, delay, onClick }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; delay: number; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`glass rounded-2xl p-5 hover:border-accent-500/15 transition-all duration-300 group${onClick ? " cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgb(var(--accent-500) /0.1)", border: "1px solid rgb(var(--accent-500) /0.1)" }}>
          {icon}
        </div>
        <span className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white group-hover:text-accent-200 transition-colors">{value}</p>
      {sub && <p className="text-[11px] text-slate-600 mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function Stats() {
  const games = useGameStore((s) => s.games);
  const navigate = useNavigate();
  const { resetFilters, setFilter, setSortKey, setSortAsc } = useGameStore.getState();

  const goToLibrary = (setup?: () => void) => () => {
    resetFilters();
    setSortKey("name");
    setSortAsc(true);
    setup?.();
    navigate("/");
  };

  const totalGames = games.length;
  const totalMins = games.reduce((a, g) => a + g.playtime_mins, 0);
  const rated = games.filter((g) => g.rating !== null);
  const avgRating = rated.length
    ? (rated.reduce((a, g) => a + (g.rating ?? 0), 0) / rated.length).toFixed(1)
    : "--";
  const favorites = games.filter((g) => g.is_favorite).length;
  const completed = games.filter((g) => g.status === "completed").length;

  const platformBreakdown: Record<Platform, number> = {
    steam: games.filter((g) => g.platform === "steam").length,
    epic: games.filter((g) => g.platform === "epic").length,
    gog: games.filter((g) => g.platform === "gog").length,
    custom: games.filter((g) => g.platform === "custom").length,
  };

  const statusBreakdown: Partial<Record<GameStatus, number>> = {};
  for (const g of games) {
    if (g.status !== "none") {
      statusBreakdown[g.status] = (statusBreakdown[g.status] ?? 0) + 1;
    }
  }

  const topRated = [...games]
    .filter((g) => g.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  const ratingDistribution: { rating: number; count: number }[] = [];
  for (let r = 1; r <= 10; r++) {
    const count = games.filter((g) => g.rating === r).length;
    if (count > 0) ratingDistribution.push({ rating: r, count });
  }
  const maxRatingCount = Math.max(...ratingDistribution.map((d) => d.count), 1);

  const completionRate = totalGames > 0 ? Math.round((completed / totalGames) * 100) : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto page-enter overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgb(var(--accent-500) /0.2), rgb(var(--accent-800) /0.15))", border: "1px solid rgb(var(--accent-500) /0.15)" }}>
          <ChartIcon size={18} className="text-accent-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Library Stats</h1>
          <p className="text-[12px] text-slate-600">An overview of your game collection</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <StatCard delay={0} icon={<GamepadIcon size={14} className="text-accent-400" />} label="Total Games" value={totalGames} onClick={goToLibrary()} />
        <StatCard delay={0.05} icon={<ClockIcon size={14} className="text-accent-400" />} label="Total Playtime" value={formatPlaytime(totalMins)} onClick={goToLibrary(() => { setSortKey("playtime_mins"); setSortAsc(false); })} />
        <StatCard delay={0.1} icon={<StarIcon size={14} filled className="text-accent-400" />} label="Avg Rating" value={avgRating} sub={`from ${rated.length} rated`} onClick={goToLibrary(() => { setSortKey("rating"); setSortAsc(false); })} />
        <StatCard delay={0.15} icon={<HeartIcon size={14} className="text-accent-400" />} label="Favorites" value={favorites} onClick={goToLibrary(() => setFilter("favoritesOnly", true))} />
        <StatCard delay={0.2} icon={<TrophyIcon size={14} className="text-accent-400" />} label="Completed" value={completed} onClick={goToLibrary(() => setFilter("status", "completed"))} />
        <StatCard delay={0.25} icon={<StarIcon size={14} className="text-accent-400" />} label="Rated" value={rated.length} sub={`${totalGames > 0 ? Math.round((rated.length / totalGames) * 100) : 0}% of library`} onClick={goToLibrary(() => setFilter("minRating", 1))} />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-8">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-4 flex items-center gap-1.5">
          <span className="w-3 h-px bg-slate-800" />
          Platforms
          <span className="flex-1 h-px bg-slate-800" />
        </p>
        <div className="flex flex-col gap-3">
          {(Object.entries(platformBreakdown) as [Platform, number][]).map(([p, count], i) => (
            <div key={p} className="flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] rounded-lg px-2 py-1 -mx-2 transition-colors" onClick={goToLibrary(() => setFilter("platform", p))}>
              <span className="text-[12px] text-slate-400 w-24 capitalize font-medium">{p === "epic" ? "Epic Games" : p}</span>
              <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalGames ? `${(count / totalGames) * 100}%` : "0%" }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${PLATFORM_COLORS_HEX[p]}, ${PLATFORM_COLORS_HEX[p]}88)`,
                    boxShadow: `0 0 12px ${PLATFORM_COLORS_HEX[p]}30`,
                  }}
                />
              </div>
              <span className="text-[12px] text-slate-500 w-8 text-right font-medium tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {Object.keys(statusBreakdown).length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mb-8">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-4 flex items-center gap-1.5">
            <span className="w-3 h-px bg-slate-800" />
            Status
            <span className="flex-1 h-px bg-slate-800" />
          </p>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(statusBreakdown) as [GameStatus, number][]).map(([s, count]) => (
              <div key={s} className="glass rounded-xl px-5 py-4 flex flex-col items-center min-w-[80px] hover:border-white/8 transition-all duration-300 cursor-pointer" onClick={goToLibrary(() => setFilter("status", s))}>
                <span className="text-2xl font-bold" style={{ color: STATUS_HEX[s] }}>{count}</span>
                <span className="text-[10px] text-slate-600 capitalize mt-1 tracking-wider">{s.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {ratingDistribution.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mb-8">
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-4 flex items-center gap-1.5">
            <span className="w-3 h-px bg-slate-800" />
            Rating Distribution
            <span className="flex-1 h-px bg-slate-800" />
          </p>
          <div className="flex flex-col gap-3">
            {ratingDistribution.map(({ rating, count }, i) => (
              <div key={rating} className="flex items-center gap-4">
                <span className="text-[12px] text-slate-400 w-6 text-right font-bold tabular-nums">{rating}</span>
                <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxRatingCount) * 100}%` }}
                    transition={{ delay: 0.65 + i * 0.08, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, rgb(var(--accent-500)), rgb(var(--accent-500) / 0.5))",
                      boxShadow: "0 0 12px rgb(var(--accent-500) / 0.2)",
                    }}
                  />
                </div>
                <span className="text-[12px] text-slate-500 w-8 text-right font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }} className="mb-8">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-4 flex items-center gap-1.5">
          <span className="w-3 h-px bg-slate-800" />
          Completion Rate
          <span className="flex-1 h-px bg-slate-800" />
        </p>
        <div className="glass rounded-2xl p-6 flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(255 255 255 / 0.03)" strokeWidth="8" />
              <motion.circle
                cx="60" cy="60" r="52" fill="none"
                stroke="rgb(var(--accent-500))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - completionRate / 100) }}
                transition={{ delay: 0.75, duration: 1.2, ease: "easeOut" }}
                style={{ filter: "drop-shadow(0 0 6px rgb(var(--accent-500) / 0.4))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{completionRate}%</span>
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">done</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-slate-300 font-medium">{completed} of {totalGames} games completed</span>
            <span className="text-[11px] text-slate-600">Keep going — every game counts!</span>
          </div>
        </div>
      </motion.div>

      {topRated.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-4 flex items-center gap-1.5">
            <span className="w-3 h-px bg-slate-800" />
            Top Rated
            <span className="flex-1 h-px bg-slate-800" />
          </p>
          <div className="flex flex-col gap-2">
            {topRated.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.75 + i * 0.08 }}
                className="flex items-center gap-4 glass rounded-xl px-4 py-3 hover:border-accent-500/15 transition-all duration-300 group"
              >
                <span className="text-[13px] text-slate-700 w-5 text-right font-bold tabular-nums group-hover:text-accent-400 transition-colors">
                  {i + 1}
                </span>
                <div className="w-9 h-12 rounded-lg overflow-hidden border border-white/[0.04] shrink-0">
                  <TopRatedCover game={g} />
                </div>
                <span className="flex-1 text-[13px] text-slate-200 truncate font-medium">{g.name}</span>
                <div className="flex items-center gap-1.5">
                  <StarIcon size={12} filled className="text-accent-400" />
                  <span className="text-[14px] font-bold text-accent-300 tabular-nums">{g.rating}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
