import { Outlet } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useScan } from "@/hooks/useGames";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastContainer from "@/components/ui/Toast";
import AddGameModal from "@/components/modals/AddGameModal";
import GameDetail from "@/components/game/GameDetail";
import ConfirmModal from "@/components/modals/ConfirmModal";
import LogPanel from "@/components/ui/LogPanel";
import { CloseIcon, DownloadIcon, GlobeIcon, CheckIcon } from "@/components/ui/Icons";
import type { Update } from "@tauri-apps/plugin-updater";

type InstallState = "idle" | "downloading" | "installing" | "done";

function UpdateBanner({ update, onDismiss }: { update: Update; onDismiss: () => void }) {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [progress, setProgress] = useState(0);

  const install = async () => {
    setInstallState("downloading");
    let downloaded = 0;
    let total = 0;
    try {
      await update.downloadAndInstall((e) => {
        if (e.event === "Started") {
          total = e.data.contentLength ?? 0;
        } else if (e.event === "Progress") {
          downloaded += e.data.chunkLength;
          if (total > 0) setProgress(Math.round((downloaded / total) * 100));
        } else if (e.event === "Finished") {
          setInstallState("installing");
        }
      });
      setInstallState("done");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      setInstallState("idle");
      useUIStore.getState().addToast(String(e), "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="glass rounded-2xl p-6 w-[440px] max-w-[90vw] relative"
        style={{
          border: "1px solid rgb(var(--accent-500) / 0.35)",
          boxShadow: "0 0 80px rgb(var(--accent-500) / 0.15), 0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        {installState === "idle" && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <CloseIcon size={14} />
          </button>
        )}

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-400)))",
              boxShadow: "0 4px 20px rgb(var(--accent-500) / 0.4)",
            }}
          >
            {installState === "done" ? (
              <CheckIcon size={20} className="text-white" />
            ) : (
              <DownloadIcon size={20} className="text-white" />
            )}
          </div>
          <div>
            <p className="text-[16px] font-bold text-white">
              {installState === "idle" && "Update Available"}
              {installState === "downloading" && "Downloading…"}
              {installState === "installing" && "Installing…"}
              {installState === "done" && "Restarting…"}
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              v{update.currentVersion} <span className="text-accent-400 font-semibold">→ v{update.version}</span>
            </p>
          </div>
        </div>

        {installState === "idle" && (
          <div
            className="rounded-xl p-3.5 mb-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">What's new</p>
            <p className="text-[12.5px] text-slate-300 leading-relaxed">{update.body ?? "No release notes."}</p>
          </div>
        )}

        {(installState === "downloading" || installState === "installing") && (
          <div className="mb-5">
            <div className="flex justify-between text-[11px] text-slate-500 mb-2">
              <span>{installState === "downloading" ? "Downloading update…" : "Applying update…"}</span>
              {installState === "downloading" && <span>{progress}%</span>}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, rgb(var(--accent-600)), rgb(var(--accent-400)))" }}
                initial={{ width: "0%" }}
                animate={{ width: installState === "installing" ? "100%" : `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
          </div>
        )}

        {installState === "done" && (
          <div className="mb-5 text-center">
            <p className="text-[13px] text-slate-400">Update installed. Restarting now…</p>
          </div>
        )}

        {installState === "idle" && (
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={install}
              className="btn-primary flex-1 justify-center"
            >
              <DownloadIcon size={14} />
              Install Update
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => api.openUrl("https://zsync.eu/zgamelib/")}
              className="btn-ghost px-4"
            >
              <GlobeIcon size={14} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDismiss}
              className="btn-ghost px-4"
            >
              Later
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AppBehavior() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const { scan } = useScan();
  const hasAutoScanned = useRef(false);

  useEffect(() => {
    if (data?.theme) {
      document.documentElement.setAttribute("data-theme", data.theme);
    }
  }, [data?.theme]);

  useEffect(() => {
    if (data?.auto_scan && !hasAutoScanned.current) {
      hasAutoScanned.current = true;
      scan();
    }
  }, [data?.auto_scan]);

  useEffect(() => {
    import("@tauri-apps/plugin-updater").then(({ check }) =>
      check().then((u) => { if (u) useUIStore.getState().setPendingUpdate(u); }).catch(() => {})
    );
  }, []);

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
  const pendingUpdate = useUIStore((s) => s.pendingUpdate);
  const setPendingUpdate = useUIStore((s) => s.setPendingUpdate);

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
      <AnimatePresence>
        {pendingUpdate && (
          <UpdateBanner update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
