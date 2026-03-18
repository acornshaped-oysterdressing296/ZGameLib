import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useCover } from "@/hooks/useCover";
import { api } from "@/lib/tauri";
import { cn, formatPlaytime } from "@/lib/utils";
import type { Game } from "@/lib/types";
import { SpinIcon, PlayIcon, SearchIcon, SteamIcon, EpicIcon, GogIcon, CustomGameIcon, HeartIcon, LibraryIcon, SparkleIcon, CloseIcon, CheckIcon } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";
import PlatformBadge from "@/components/ui/PlatformBadge";

const SEG_PALETTE = [
  ["#7c3aed", "#6d28d9"], ["#2563eb", "#1d4ed8"], ["#db2777", "#be185d"],
  ["#059669", "#047857"], ["#d97706", "#b45309"], ["#dc2626", "#b91c1c"],
  ["#0891b2", "#0e7490"], ["#65a30d", "#4d7c0f"], ["#ea580c", "#c2410c"],
  ["#8b5cf6", "#7c3aed"], ["#3b82f6", "#2563eb"], ["#ec4899", "#db2777"],
  ["#10b981", "#059669"], ["#f59e0b", "#d97706"], ["#ef4444", "#dc2626"],
  ["#06b6d4", "#0891b2"], ["#84cc16", "#65a30d"], ["#f97316", "#ea580c"],
  ["#a855f7", "#9333ea"], ["#14b8a6", "#0d9488"],
];

const SIZE = 420;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 182;
const INNER_R = 46;

function polar(angleDeg: number, radius = R) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function segmentPath(startDeg: number, endDeg: number): string {
  const s = polar(startDeg);
  const e = polar(endDeg);
  const si = polar(startDeg, INNER_R);
  const ei = polar(endDeg, INNER_R);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${si.x},${si.y} L${s.x},${s.y} A${R},${R},0,${large},1,${e.x},${e.y} L${ei.x},${ei.y} A${INNER_R},${INNER_R},0,${large},0,${si.x},${si.y} Z`;
}

function Wheel({ pool, rotation, isSpinning }: {
  pool: Game[];
  rotation: ReturnType<typeof useMotionValue<number>>;
  isSpinning: boolean;
}) {
  const n = pool.length;
  const segAngle = n > 0 ? 360 / n : 0;
  const fontSize = n <= 6 ? 11 : n <= 12 ? 9 : n <= 20 ? 7.5 : 6;
  const maxChars = n <= 6 ? 16 : n <= 12 ? 12 : n <= 20 ? 8 : 6;
  const textR = R * 0.62;

  return (
    <div className="relative select-none" style={{ width: SIZE, height: SIZE }}>
      <div
        className="absolute -inset-6 rounded-full transition-all duration-700"
        style={{
          background: isSpinning
            ? "radial-gradient(circle, rgb(var(--accent-500) /0.3) 0%, rgb(var(--accent-600) /0.1) 50%, transparent 70%)"
            : "radial-gradient(circle, rgb(var(--accent-500) /0.1) 0%, transparent 65%)",
          filter: "blur(30px)",
        }}
      />

      {isSpinning && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -16,
            border: "2px solid rgb(var(--accent-500) /0.4)",
            borderRadius: "50%",
          }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.svg
        width={SIZE}
        height={SIZE}
        style={{ rotate: rotation, transformOrigin: `${CX}px ${CY}px` }}
        className="relative z-10"
      >
        <defs>
          {pool.map((_, i) => {
            const [c1, c2] = SEG_PALETTE[i % SEG_PALETTE.length];
            const start = i * segAngle;
            const mid = start + segAngle / 2;
            const s = polar(mid, INNER_R);
            const e = polar(mid, R);
            return (
              <linearGradient key={i} id={`seg-${i}`} x1={s.x} y1={s.y} x2={e.x} y2={e.y} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={c2} />
                <stop offset="100%" stopColor={c1} />
              </linearGradient>
            );
          })}
          <radialGradient id="innerShadow" cx="50%" cy="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </radialGradient>
          <filter id="segShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>

        {n === 0 && (
          <>
            <circle cx={CX} cy={CY} r={R} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="8 4" />
            <circle cx={CX} cy={CY} r={INNER_R} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </>
        )}

        {pool.map((game, i) => {
          const start = i * segAngle;
          const end = (i + 1) * segAngle;
          const mid = start + segAngle / 2;
          const tp = polar(mid, textR);
          const name = game.name.length > maxChars ? game.name.slice(0, maxChars - 1) + "\u2026" : game.name;
          return (
            <g key={game.id}>
              <path d={segmentPath(start, end)} fill={`url(#seg-${i})`} stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
              {n <= 30 && (
                <text
                  x={tp.x} y={tp.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={fontSize} fontWeight="700" fill="white" opacity="0.95"
                  style={{ fontFamily: "inherit", pointerEvents: "none" }}
                  transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}
                >
                  {name}
                </text>
              )}
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={R} fill="url(#innerShadow)" />
      </motion.svg>

      <svg width={SIZE} height={SIZE} className="absolute inset-0 z-20 pointer-events-none">
        <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="rgb(var(--accent-500) /0.2)" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="rgb(var(--accent-500) /0.07)" strokeWidth="1" />

        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * 360;
          const isMajor = i % 5 === 0;
          const inner = polar(a, R + 5);
          const outer = polar(a, R + (isMajor ? 16 : 10));
          return (
            <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={isMajor ? "rgb(var(--accent-500) /0.45)" : "rgb(var(--accent-500) /0.15)"}
              strokeWidth={isMajor ? "2" : "1"} strokeLinecap="round" />
          );
        })}

        <defs>
          <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent-300))" />
            <stop offset="100%" stopColor="rgb(var(--accent-600))" />
          </linearGradient>
          <filter id="pointerGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <polygon
          points={`${CX},${CY - R - 8} ${CX - 11},${CY - R + 18} ${CX + 11},${CY - R + 18}`}
          fill="url(#pointerGrad)"
          filter="drop-shadow(0 2px 10px rgb(var(--accent-500) /0.9))"
        />
        <polygon
          points={`${CX},${CY - R - 8} ${CX - 11},${CY - R + 18} ${CX + 11},${CY - R + 18}`}
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"
        />

        <circle cx={CX} cy={CY} r={INNER_R + 3} fill="none" stroke="rgb(var(--accent-500) /0.35)" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={INNER_R} fill="rgb(7,6,11)" />
        <circle cx={CX} cy={CY} r={INNER_R - 4} fill="none" stroke="rgb(var(--accent-500) /0.15)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={6} fill="rgb(var(--accent-500))" opacity="0.8" />

        <text x={CX} y={CY - 12} textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fontWeight="800" fill="rgb(var(--accent-400) /0.8)"
          style={{ fontFamily: "inherit", letterSpacing: "0.05em" }}>
          ZGAME
        </text>
        <text x={CX} y={CY + 2} textAnchor="middle" dominantBaseline="middle"
          fontSize="7" fontWeight="600" fill="rgb(var(--accent-500) /0.4)"
          style={{ fontFamily: "inherit", letterSpacing: "0.12em" }}>
          SPIN
        </text>
      </svg>
    </div>
  );
}

function StarRow({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i < rating ? "rgb(var(--accent-400))" : "rgba(255,255,255,0.1)" }}
        />
      ))}
      <span className="text-[10px] text-slate-500 ml-1">{rating}/10</span>
    </div>
  );
}

function CoverThumb({ game }: { game: Game }) {
  const url = useCover(game);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <div className="w-full h-full bg-white/5 rounded" />;
  return <img src={url} alt="" className="w-full h-full object-cover rounded" onError={() => setFailed(true)} />;
}

function WinnerCard({ game, onPlayAgain, onExclude }: {
  game: Game;
  onPlayAgain: () => void;
  onExclude: () => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const coverUrl = useCover(game);
  const [imgFailed, setImgFailed] = useState(false);

  const handlePlay = async () => {
    try {
      if (game.platform === "steam" && game.steam_app_id) await api.launchSteamGame(game.steam_app_id, game.id);
      else if (game.platform === "epic" && game.epic_app_name) await api.launchEpicGame(game.epic_app_name, game.id);
      else await api.launchGame(game.id);
    } catch (err) { addToast(String(err), "error"); }
  };

  const platformLabel = game.platform === "steam" ? "Steam" : game.platform === "epic" ? "Epic" : game.platform === "gog" ? "GOG" : "Custom";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgb(var(--accent-600) /0.12), rgb(var(--accent-400) /0.06), rgb(var(--accent-600) /0.12))",
        border: "1px solid rgb(var(--accent-500) /0.3)",
        boxShadow: "0 0 60px rgb(var(--accent-600) /0.2), 0 20px 40px rgba(0,0,0,0.3)",
      }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-500/5 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      />

      <div className="relative flex items-center gap-5 p-5">
        <div className="w-[72px] h-[96px] rounded-xl overflow-hidden shrink-0 border border-white/10"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {coverUrl && !imgFailed ? (
            <img src={coverUrl} alt={game.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-accent-900/20">
              <SpinIcon size={20} className="text-accent-500/40" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, delay: 0.3 }}>
              <SparkleIcon size={14} className="text-accent-400" />
            </motion.div>
            <span className="text-[10px] font-bold text-accent-400 uppercase tracking-[0.16em]">Winner</span>
          </div>
          <p className="text-[18px] font-bold text-white leading-tight truncate mb-1.5">{game.name}</p>
          <PlatformBadge platform={game.platform} />
          <div className="mt-2 flex flex-col gap-1">
            <StarRow rating={game.rating} />
            {game.playtime_mins > 0 && (
              <p className="text-[10px] text-slate-600">{formatPlaytime(game.playtime_mins)} played</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handlePlay}
            className="btn-primary text-[12px] py-2.5 px-5"
            style={{ boxShadow: "0 0 20px rgb(var(--accent-600) /0.3)" }}
          >
            <PlayIcon size={13} />
            Play
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onPlayAgain}
            className="btn-ghost text-[12px] py-2 px-4"
          >
            <SpinIcon size={12} />
            Again
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onExclude}
            className="text-[11px] text-slate-600 hover:text-red-400 transition-colors py-1 px-2 rounded-lg hover:bg-red-500/10 text-center"
          >
            <CloseIcon size={11} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryRow({ game, time }: { game: Game; time: Date }) {
  const url = useCover(game);
  const [failed, setFailed] = useState(false);
  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="w-7 h-9 rounded-md overflow-hidden shrink-0 border border-white/10">
        {url && !failed
          ? <img src={url} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
          : <div className="w-full h-full bg-white/5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-300 truncate font-medium">{game.name}</p>
        <p className="text-[10px] text-slate-600">{timeStr}</p>
      </div>
      <SparkleIcon size={10} className="text-accent-500/40 shrink-0" />
    </motion.div>
  );
}

type QuickFilter = "all" | "steam" | "epic" | "gog" | "custom" | "favorites";

export default function Spin() {
  const allGames = useGameStore((s) => s.games);
  const addToast = useUIStore((s) => s.addToast);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Game | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [excludeLastWinner, setExcludeLastWinner] = useState(false);
  const [history, setHistory] = useState<{ game: Game; time: Date }[]>([]);
  const [spinCount, setSpinCount] = useState(0);

  const rotation = useMotionValue(0);

  const selectorGames = useMemo(() => {
    let list = [...allGames];
    if (quickFilter === "steam") list = list.filter((g) => g.platform === "steam");
    else if (quickFilter === "epic") list = list.filter((g) => g.platform === "epic");
    else if (quickFilter === "gog") list = list.filter((g) => g.platform === "gog");
    else if (quickFilter === "custom") list = list.filter((g) => g.platform === "custom");
    else if (quickFilter === "favorites") list = list.filter((g) => g.is_favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    return list;
  }, [allGames, quickFilter, search]);

  const applyQuickFilter = (f: QuickFilter) => {
    setQuickFilter(f);
    let list = allGames;
    if (f === "steam") list = list.filter((g) => g.platform === "steam");
    else if (f === "epic") list = list.filter((g) => g.platform === "epic");
    else if (f === "gog") list = list.filter((g) => g.platform === "gog");
    else if (f === "custom") list = list.filter((g) => g.platform === "custom");
    else if (f === "favorites") list = list.filter((g) => g.is_favorite);
    setSelected(new Set(list.map((g) => g.id)));
  };

  const toggleGame = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(selectorGames.map((g) => g.id)));
  const clearAll = () => setSelected(new Set());

  const pool = useMemo(() => {
    let games = allGames.filter((g) => selected.has(g.id));
    if (excludeLastWinner && history.length > 0) {
      games = games.filter((g) => g.id !== history[0].game.id);
    }
    return games;
  }, [allGames, selected, excludeLastWinner, history]);

  const handleSpin = useCallback(() => {
    if (isSpinning || pool.length < 2) return;
    setIsSpinning(true);
    setWinner(null);
    setShowConfetti(false);

    const winnerIndex = Math.floor(Math.random() * pool.length);
    const segAngle = 360 / pool.length;
    const extraAngle = (360 - (winnerIndex * segAngle + segAngle / 2) + 360) % 360;
    const spins = 6 + Math.floor(Math.random() * 4);
    const targetRotation = rotation.get() + spins * 360 + extraAngle;

    animate(rotation, targetRotation, {
      duration: 6 + Math.random() * 1.5,
      ease: [0.08, 0.82, 0.12, 1.0],
    }).then(() => {
      const won = pool[winnerIndex];
      setWinner(won);
      setIsSpinning(false);
      setShowConfetti(true);
      setSpinCount((c) => c + 1);
      setHistory((prev) => [{ game: won, time: new Date() }, ...prev].slice(0, 8));
      setTimeout(() => setShowConfetti(false), 4000);
    });
  }, [isSpinning, pool, rotation]);

  const handleExcludeWinner = () => {
    if (!winner) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(winner.id);
      return next;
    });
    setWinner(null);
  };

  const quickFilters: { key: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <LibraryIcon size={12} /> },
    { key: "steam", label: "Steam", icon: <SteamIcon size={12} /> },
    { key: "epic", label: "Epic", icon: <EpicIcon size={12} /> },
    { key: "gog", label: "GOG", icon: <GogIcon size={12} /> },
    { key: "custom", label: "Custom", icon: <CustomGameIcon size={12} /> },
    { key: "favorites", label: "Favs", icon: <HeartIcon size={12} /> },
  ];

  const platformDot = (p: string) =>
    p === "steam" ? "#38bdf8" : p === "epic" ? "#94a3b8" : p === "gog" ? "#a78bfa" : "#4ade80";

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-4 px-6 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(135deg, rgb(var(--accent-500) /0.3), rgb(var(--accent-800) /0.2))",
            border: "1px solid rgb(var(--accent-500) /0.25)",
            boxShadow: "0 0 20px rgb(var(--accent-500) /0.15)",
          }}
        >
          <SpinIcon size={18} className="text-accent-400" />
        </div>
        <div>
          <h1 className="text-[16px] font-bold text-white tracking-tight">Game Spin</h1>
          <p className="text-[11px] text-slate-600">Can&apos;t decide? Let fate choose your next game</p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {spinCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <SpinIcon size={11} className="text-accent-400" />
              <span className="text-[11px] text-slate-400"><span className="text-accent-300 font-bold">{spinCount}</span> spin{spinCount !== 1 ? "s" : ""}</span>
            </div>
          )}
          {pool.length >= 2 && (
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {pool.slice(0, 5).map((g) => (
                  <div key={g.id} className="w-6 h-6 rounded-md overflow-hidden border border-black/40" title={g.name}>
                    <CoverThumb game={g} />
                  </div>
                ))}
                {pool.length > 5 && (
                  <div className="w-6 h-6 rounded-md bg-accent-900/50 border border-accent-500/30 flex items-center justify-center text-[9px] font-bold text-accent-300">
                    +{pool.length - 5}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-600">
                <span className="text-accent-400 font-semibold">{pool.length}</span> games
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 shrink-0 flex flex-col overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="p-3 flex flex-wrap gap-1.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {quickFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => applyQuickFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                  quickFilter === f.key
                    ? "text-white bg-accent-600/25 border-accent-500/30"
                    : "text-slate-500 border-white/5 hover:text-slate-300 hover:bg-white/4"
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <div className="px-3 py-2.5 flex items-center gap-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="relative flex-1">
              <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search games..."
                className="input-glass w-full text-[12px] pl-7 py-1.5"
              />
            </div>
            <button
              onClick={selected.size > 0 ? clearAll : selectAll}
              className="text-[10px] text-accent-400 hover:text-accent-300 transition-colors whitespace-nowrap px-1 font-medium"
            >
              {selected.size > 0 ? "Clear" : "All"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-1.5">
            {selectorGames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <SearchIcon size={20} className="text-slate-700 mb-2" />
                <p className="text-[12px] text-slate-700">No games found</p>
              </div>
            ) : (
              selectorGames.map((game) => {
                const isSelected = selected.has(game.id);
                const isLastWinner = excludeLastWinner && history.length > 0 && game.id === history[0].game.id;
                return (
                  <button
                    key={game.id}
                    onClick={() => toggleGame(game.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 group",
                      isLastWinner ? "opacity-40" : "",
                      isSelected
                        ? "bg-accent-600/15 border border-accent-500/20"
                        : "border border-transparent hover:bg-white/3"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-md shrink-0 flex items-center justify-center border transition-all",
                      isSelected ? "bg-accent-600 border-accent-500" : "border-white/15 bg-white/3"
                    )}>
                      {isSelected && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={cn(
                      "text-[12px] truncate flex-1 transition-colors",
                      isSelected ? "text-slate-200" : "text-slate-400 group-hover:text-slate-300"
                    )}>{game.name}</span>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: platformDot(game.platform) }} />
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-3 shrink-0 flex flex-col gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-600">
                <span className="text-slate-400 font-medium">{selected.size}</span> selected
              </p>
            </div>
            <button
              onClick={() => setExcludeLastWinner((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] transition-all border w-full",
                excludeLastWinner
                  ? "text-accent-300 bg-accent-600/15 border-accent-500/25"
                  : "text-slate-500 border-white/5 hover:text-slate-300 hover:bg-white/4"
              )}
            >
              <div className={cn(
                "w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all shrink-0",
                excludeLastWinner ? "bg-accent-600 border-accent-500" : "border-white/15"
              )}>
                {excludeLastWinner && <CheckIcon size={9} className="text-white" />}
              </div>
              Exclude last winner
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-auto relative">
          {showConfetti && <Confetti />}

          <div className="relative">
            <Wheel pool={pool} rotation={rotation} isSpinning={isSpinning} />

            {pool.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                  <SpinIcon size={36} className="text-slate-800" />
                </motion.div>
                <p className="text-[13px] text-slate-600 font-medium mt-4">No games selected</p>
                <p className="text-[11px] text-slate-700 mt-1">Pick games from the left panel</p>
              </div>
            )}
            {pool.length === 1 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <p className="text-[12px] text-slate-600">Add at least 2 games to spin</p>
              </div>
            )}
          </div>

          <motion.button
            whileHover={!isSpinning && pool.length >= 2 ? { scale: 1.06, y: -2 } : {}}
            whileTap={!isSpinning && pool.length >= 2 ? { scale: 0.96 } : {}}
            onClick={handleSpin}
            disabled={isSpinning || pool.length < 2}
            className={cn(
              "relative px-12 py-4 rounded-2xl text-[15px] font-bold transition-all overflow-hidden",
              pool.length >= 2 && !isSpinning ? "text-white cursor-pointer" : "text-slate-600 cursor-not-allowed"
            )}
            style={pool.length >= 2 && !isSpinning ? {
              background: "linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-400)), rgb(var(--accent-600)))",
              backgroundSize: "200% 100%",
              boxShadow: "0 0 50px rgb(var(--accent-600) /0.4), 0 8px 32px rgba(0,0,0,0.3)",
            } : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {pool.length >= 2 && !isSpinning && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
              />
            )}
            <span className="relative flex items-center gap-3">
              <motion.span
                animate={isSpinning ? { rotate: 360 } : {}}
                transition={isSpinning ? { duration: 0.6, repeat: Infinity, ease: "linear" } : {}}
              >
                <SpinIcon size={18} />
              </motion.span>
              {isSpinning ? "Spinning..." : "Spin the Wheel"}
            </span>
          </motion.button>

          <div className="w-full max-w-lg flex flex-col gap-3">
            <AnimatePresence mode="wait">
              {winner && (
                <WinnerCard
                  key={winner.id}
                  game={winner}
                  onPlayAgain={() => { setWinner(null); setTimeout(handleSpin, 100); }}
                  onExclude={handleExcludeWinner}
                />
              )}
            </AnimatePresence>

            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-1.5"
              >
                <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-[0.14em] px-1">Recent spins</p>
                <div className="flex flex-col gap-1">
                  {history.slice(0, 5).map((h, i) => (
                    <HistoryRow key={`${h.game.id}-${i}`} game={h.game} time={h.time} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 2,
      color: SEG_PALETTE[i % SEG_PALETTE.length][0],
      size: 5 + Math.random() * 8,
      rotation: Math.random() * 360,
      shape: i % 3,
    })),
  []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: "110vh", opacity: 0, rotate: p.rotation + 900, scale: 0.5 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === 0 ? "50%" : p.shape === 1 ? "2px" : "0",
            transform: p.shape === 2 ? `rotate(45deg)` : undefined,
            left: 0,
          }}
        />
      ))}
    </div>
  );
}
