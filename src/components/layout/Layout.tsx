import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/tauri";
import { applyThemeFromSettings } from "@/lib/theme";
import { useGameStore } from "@/store/useGameStore";
import { useUIStore } from "@/store/useUIStore";
import { useScan, usePullUninstalled } from "@/hooks/useGames";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ToastContainer from "@/components/ui/Toast";
import AddGameModal from "@/components/modals/AddGameModal";
import GameDetail from "@/components/game/GameDetail";
import ConfirmModal from "@/components/modals/ConfirmModal";
import LogPanel from "@/components/ui/LogPanel";
import LoadingBeam from "@/components/ui/LoadingBeam";
import CommandPalette from "@/components/ui/CommandPalette";
import ModsPromoPanel from "@/components/game/ModsPromoPanel";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import TourModeSelector from "@/components/onboarding/TourModeSelector";
import WhatsNewModal from "@/components/modals/WhatsNewModal";
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
  const qc = useQueryClient();
  const { scan } = useScan();
  const { pullUninstalled } = usePullUninstalled();
  const hasAutoScanned = useRef(false);
  const hasAutoPulled = useRef(false);

  useEffect(() => {
    if (data?.theme) {
      applyThemeFromSettings(data.theme, data.custom_themes || "[]");
    }
  }, [data?.theme]);

  useEffect(() => {
    if (data?.auto_scan && !hasAutoScanned.current) {
      hasAutoScanned.current = true;
      scan();
    }
    if (data?.include_uninstalled_steam && !hasAutoPulled.current) {
      hasAutoPulled.current = true;
      pullUninstalled();
    }
  }, [data?.auto_scan, data?.include_uninstalled_steam, scan, pullUninstalled]);

  useEffect(() => {
    import("@tauri-apps/plugin-updater").then(({ check }) =>
      check().then((u) => { if (u) useUIStore.getState().setPendingUpdate(u); }).catch(() => {})
    );
  }, []);

  useEffect(() => {
    const promise = listen<string>("game-session-ended", () => {
      qc.invalidateQueries({ queryKey: ["games"] });
      useUIStore.getState().setActiveGameId(null);
    });
    return () => { promise.then((f) => f()); };
  }, [qc]);

  useEffect(() => {
    const promise = listen<string>("playtime-reminder", (event) => {
      useUIStore.getState().addToast(event.payload, "info");
    });
    return () => { promise.then((f) => f()); };
  }, []);

  useEffect(() => {
    const promise = listen("start-onboarding", () => {
      useUIStore.getState().setModeSelectorOpen(true);
    });
    return () => { promise.then((f) => f()); };
  }, []);

  const hasTriggeredOnboarding = useRef(false);
  useEffect(() => {
    if (data && data.onboarding_completed === false && !hasTriggeredOnboarding.current) {
      hasTriggeredOnboarding.current = true;
      useUIStore.getState().setModeSelectorOpen(true);
    }
  }, [data?.onboarding_completed]);

  useEffect(() => {
    const promise = listen<string>("show-whats-new", (event) => {
      useUIStore.getState().setWhatsNewVersion(event.payload);
      useUIStore.getState().setWhatsNewOpen(true);
    });
    return () => { promise.then((f) => f()); };
  }, []);

  return null;
}

export default function Layout() {
  const navigate = useNavigate();
  const pendingUpdate = useUIStore((s) => s.pendingUpdate);
  const setPendingUpdate = useUIStore((s) => s.setPendingUpdate);
  const isDetailOpen = useUIStore((s) => s.isDetailOpen);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const setAddGameOpen = useUIStore((s) => s.setAddGameOpen);
  const setDetailOpen = useUIStore((s) => s.setDetailOpen);
  const selectedGameId = useGameStore((s) => s.selectedGameId);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const modeSelectorOpen = useUIStore((s) => s.modeSelectorOpen);
  const setModeSelectorOpen = useUIStore((s) => s.setModeSelectorOpen);
  const setTourOpen = useUIStore((s) => s.setTourOpen);
  const setTourMode = useUIStore((s) => s.setTourMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (e.ctrlKey && e.key === "z") {
        return;
      }
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "?") { setShowShortcuts((v) => !v); return; }
      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        setDetailOpen(false);
        return;
      }
      if (e.key === "n" || e.key === "N") { setAddGameOpen(true); return; }
      if (e.key === "w" || e.key === "W") { navigate("/wrapped"); return; }
      if (e.key === "s" || e.key === "S") {
        const scanBtn = document.querySelector<HTMLButtonElement>('[data-tour="scan-btn"] button');
        scanBtn?.focus();
        return;
      }
      if (e.key === "h" || e.key === "H") {
        useGameStore.getState().toggleShowHidden();
        return;
      }
      if (!selectedGameId) return;
      const { games, updateGame } = useGameStore.getState();
      const game = games.find((g) => g.id === selectedGameId);
      if (!game) return;
      if (e.key === "f" || e.key === "F") {
        api.toggleFavorite(game.id).then((v) => updateGame({ ...game, is_favorite: v })).catch(() => {});
        return;
      }
      const ratingMap: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "0": 10 };
      if (ratingMap[e.key] !== undefined && isDetailOpen) {
        const rating = ratingMap[e.key];
        api.updateGame({ id: game.id, rating }).then((updated) => updateGame(updated)).catch(() => {});
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedGameId, showShortcuts, setDetailOpen, setAddGameOpen, setCommandPaletteOpen, isDetailOpen, navigate]);

  return (
    <div className="flex h-screen overflow-hidden">
      <LoadingBeam />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
          <AnimatePresence>
            {isDetailOpen && <ModsPromoPanel />}
          </AnimatePresence>
        </main>
      </div>
      <GameDetail />
      <AddGameModal />
      <CommandPalette />
      <AppBehavior />
      <ConfirmModal />
      <LogPanel />
      <ToastContainer />
      <WhatsNewModal />
      <AnimatePresence>
        {modeSelectorOpen && (
          <TourModeSelector
            onStart={(mode) => {
              setModeSelectorOpen(false);
              setTourMode(mode);
              setTourOpen(true);
            }}
            onSkip={async () => {
              setModeSelectorOpen(false);
              await api.saveSetting("onboarding_completed", "true");
            }}
          />
        )}
      </AnimatePresence>
      <OnboardingTour />
      <AnimatePresence>
        {pendingUpdate && (
          <UpdateBanner update={pendingUpdate} onDismiss={() => setPendingUpdate(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShortcuts(false)}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 w-[380px]"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-[13px] font-bold text-white mb-4">Keyboard Shortcuts</p>
              <div className="flex flex-col gap-2.5">
                {[
                  ["Ctrl + K", "Open command palette"],
                  ["/", "Focus search"],
                  ["N", "Add game"],
                  ["F", "Toggle favorite (game open)"],
                  ["1–9, 0", "Quick rate game (0 = 10)"],
                  ["S", "Focus scan button"],
                  ["W", "Open Year in Review"],
                  ["H", "Toggle hidden games"],
                  ["Escape", "Close panel / overlay"],
                  ["Ctrl + Enter", "Save note"],
                  ["?", "Toggle this help"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-400">{label}</span>
                    <kbd className="px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-300 glass border border-white/10">{key}</kbd>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
