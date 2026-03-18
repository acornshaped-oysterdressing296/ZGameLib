import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/tauri";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { setCoverCache, clearCoverCache } from "@/hooks/useCover";
import type { CoverCandidate } from "@/lib/types";
import { SearchIcon, CloseIcon, CheckIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

interface Props {
  gameId: string;
  gameName: string;
  currentCoverPath: string | null;
  onClose: () => void;
}

export default function CoverSearchModal({ gameId, gameName, currentCoverPath, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const [query, setQuery] = useState(gameName);
  const [results, setResults] = useState<CoverCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchCache = useRef<Map<string, string>>(new Map());

  const search = async () => {
    if (!query.trim()) return;
    setHasSearched(true);
    setLoading(true);
    setResults([]);
    try {
      const res = await api.searchGameCovers(query.trim());
      setResults(res);
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const applyCover = async (candidate: CoverCandidate) => {
    setApplying(candidate.app_id);
    try {
      let newPath = fetchCache.current.get(candidate.cover_url);
      if (!newPath) {
        newPath = await api.fetchUrlAsBase64(candidate.cover_url);
        if (!newPath) throw new Error("Failed to download cover");
        fetchCache.current.set(candidate.cover_url, newPath);
      }
      if (currentCoverPath) clearCoverCache(currentCoverPath);
      setCoverCache(gameId + "_search", newPath);

      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("update_game", {
        payload: { id: gameId, cover_path: newPath }
      });

      const allGames = await api.getAllGames();
      useGameStore.getState().setGames(allGames);
      addToast("Cover updated", "success");
      onClose();
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setApplying(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-[560px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "rgba(10, 8, 18, 0.95)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgb(var(--accent-500) /0.1)",
        }}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <SearchIcon size={16} className="text-accent-400 shrink-0" />
          <h2 className="text-[14px] font-semibold text-white flex-1">Search Cover</h2>
          <button onClick={onClose} className="btn-icon w-7 h-7">
            <CloseIcon size={13} />
          </button>
        </div>

        <div className="px-5 py-3 flex gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="relative flex-1">
            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search by game name…"
              className="input-glass pl-8 text-[13px]"
              autoFocus
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={search}
            disabled={loading || !query.trim()}
            className="btn-primary text-[12px] py-2 px-4 disabled:opacity-40 shrink-0"
          >
            {loading ? (
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <SearchIcon size={13} />
              </motion.span>
            ) : "Search"}
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchIcon size={28} className="text-slate-700 mb-3" />
              {hasSearched ? (
                <>
                  <p className="text-[13px] text-slate-500">No covers found for "{query}"</p>
                  <p className="text-[11px] text-slate-700 mt-1">Try a shorter name or remove subtitles</p>
                </>
              ) : (
                <p className="text-[13px] text-slate-600">Search to find cover art</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <AnimatePresence>
              {results.map((r, i) => (
                <motion.button
                  key={r.app_id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => applyCover(r)}
                  disabled={applying !== null}
                  className={cn(
                    "relative group rounded-xl overflow-hidden aspect-[3/4] cursor-pointer transition-all border-2",
                    applying === r.app_id
                      ? "border-accent-500 scale-95"
                      : "border-transparent hover:border-accent-500/50"
                  )}
                >
                  <CoverImage url={r.cover_url} name={r.name} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-2">
                    <p className="text-[10px] text-white font-medium text-center leading-tight line-clamp-2">{r.name}</p>
                  </div>
                  {applying === r.app_id && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <motion.div
                        className="w-5 h-5 rounded-full border-2 border-accent-400/30 border-t-accent-400"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {results.length > 0 && (
          <div className="px-5 py-2.5 text-[10px] text-slate-700 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <CheckIcon size={10} className="inline mr-1 text-slate-700" />
            Click a cover to apply it
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function CoverImage({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="w-full h-full bg-white/4 flex items-center justify-center">
      <p className="text-[9px] text-slate-600 text-center px-2">{name}</p>
    </div>
  ) : (
    <img
      src={url}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
