import { useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import GameGrid from "@/components/library/GameGrid";
import { HeartIcon } from "@/components/ui/Icons";

export default function Favorites() {
  const setFilter = useGameStore((s) => s.setFilter);

  useEffect(() => {
    setFilter("favoritesOnly", true);
    return () => setFilter("favoritesOnly", false);
  }, [setFilter]);

  return (
    <div className="h-full page-enter">
      <div className="px-6 pt-6 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(219,39,119,0.1))", border: "1px solid rgba(236,72,153,0.12)" }}>
          <HeartIcon size={18} className="text-pink-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Favorites</h1>
          <p className="text-[12px] text-slate-600">Games you love the most</p>
        </div>
      </div>
      <GameGrid />
    </div>
  );
}
