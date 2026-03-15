import { useGames } from "@/hooks/useGames";
import GameGrid from "@/components/library/GameGrid";
import RecentlyPlayed from "@/components/library/RecentlyPlayed";

export default function Library() {
  useGames(); // loads games into store on mount
  return (
    <div className="h-full">
      <RecentlyPlayed />
      <GameGrid />
    </div>
  );
}
