import { useRef } from "react";
import { useGames } from "@/hooks/useGames";
import GameGrid from "@/components/library/GameGrid";
import RecentlyPlayed from "@/components/library/RecentlyPlayed";
import PinnedRow from "@/components/library/PinnedRow";
import GoalBar from "@/components/library/GoalBar";
import PageSearch from "@/components/layout/PageSearch";
import ScrollToTop from "@/components/ui/ScrollToTop";

export default function Library() {
  const { isLoading } = useGames();
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className="h-full flex flex-col">
      <PageSearch />
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <GoalBar />
        <PinnedRow />
        <RecentlyPlayed />
        <GameGrid isLoading={isLoading} />
      </div>
      <ScrollToTop scrollRef={scrollRef} />
    </div>
  );
}
