import { create } from "zustand";
import type { StatusConfig } from "@/lib/types";
import type { Update } from "@tauri-apps/plugin-updater";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export interface LogEntry {
  id: string;
  time: string;
  level: "info" | "ok" | "warn" | "error";
  message: string;
}

const DEFAULT_STATUSES: StatusConfig[] = [
  { key: "playing", label: "Playing", color: "#4ade80" },
  { key: "backlog", label: "Backlog", color: "#60a5fa" },
  { key: "completed", label: "Completed", color: "#a78bfa" },
  { key: "dropped", label: "Dropped", color: "#f87171" },
  { key: "on_hold", label: "On Hold", color: "#fbbf24" },
];

interface UIStore {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;

  isAddGameOpen: boolean;
  setAddGameOpen: (v: boolean) => void;

  isDetailOpen: boolean;
  setDetailOpen: (v: boolean) => void;

  isScanning: boolean;
  setScanning: (v: boolean) => void;

  confirmDialog: { open: boolean; title: string; onConfirm: () => void } | null;
  openConfirm: (title: string, onConfirm: () => void) => void;
  closeConfirm: () => void;

  customStatuses: StatusConfig[];
  setCustomStatuses: (statuses: StatusConfig[]) => void;

  logs: LogEntry[];
  logPanelOpen: boolean;
  addLog: (level: LogEntry["level"], message: string) => void;
  clearLogs: () => void;
  setLogPanelOpen: (v: boolean) => void;

  pendingUpdate: Update | null;
  setPendingUpdate: (u: Update | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  addToast: (message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  isAddGameOpen: false,
  setAddGameOpen: (v) => set({ isAddGameOpen: v }),

  isDetailOpen: false,
  setDetailOpen: (v) => set({ isDetailOpen: v }),

  isScanning: false,
  setScanning: (v) => set({ isScanning: v }),

  confirmDialog: null,
  openConfirm: (title, onConfirm) =>
    set({ confirmDialog: { open: true, title, onConfirm } }),
  closeConfirm: () => set({ confirmDialog: null }),

  customStatuses: DEFAULT_STATUSES,
  setCustomStatuses: (statuses) => set({ customStatuses: statuses }),

  logs: [],
  logPanelOpen: false,
  addLog: (level, message) => {
    const id = Math.random().toString(36).slice(2);
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    set((s) => ({ logs: [...s.logs.slice(-499), { id, time, level, message }] }));
  },
  clearLogs: () => set({ logs: [] }),
  setLogPanelOpen: (v) => set({ logPanelOpen: v }),

  pendingUpdate: null,
  setPendingUpdate: (u) => set({ pendingUpdate: u }),
}));
