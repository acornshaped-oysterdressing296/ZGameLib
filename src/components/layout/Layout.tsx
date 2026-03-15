import { Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";
import { useGameStore } from "@/store/useGameStore";
import { useScan } from "@/hooks/useGames";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastContainer from "@/components/ui/Toast";
import AddGameModal from "@/components/modals/AddGameModal";
import GameDetail from "@/components/game/GameDetail";
import ConfirmModal from "@/components/modals/ConfirmModal";
import LogPanel from "@/components/ui/LogPanel";

function AppBehavior() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const { scan } = useScan();
  const hasAutoScanned = useRef(false);

  // Apply theme
  useEffect(() => {
    if (data?.theme) {
      document.documentElement.setAttribute("data-theme", data.theme);
    }
  }, [data?.theme]);

  // Auto-scan on startup (once)
  useEffect(() => {
    if (data?.auto_scan && !hasAutoScanned.current) {
      hasAutoScanned.current = true;
      scan();
    }
  }, [data?.auto_scan]);

  // Listen for game session end → update that game in store
  useEffect(() => {
    const promise = listen<string>("game-session-ended", async (event) => {
      const game = await api.getGame(event.payload);
      if (game) useGameStore.getState().updateGame(game);
    });
    return () => { promise.then((f) => f()); };
  }, []);

  return null;
}

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <GameDetail />
      <AddGameModal />
      <AppBehavior />
      <ConfirmModal />
      <LogPanel />
      <ToastContainer />
    </div>
  );
}
