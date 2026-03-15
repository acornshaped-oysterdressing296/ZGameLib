import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { GameStatus, Platform } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPlaytime(mins: number): string {
  if (mins === 0) return "Never played";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export const STATUS_LABELS: Record<GameStatus, string> = {
  none: "Unset",
  backlog: "Backlog",
  playing: "Playing",
  completed: "Completed",
  dropped: "Dropped",
  on_hold: "On Hold",
};

export const STATUS_COLORS: Record<GameStatus, string> = {
  none: "text-slate-500",
  backlog: "text-blue-400",
  playing: "text-green-400",
  completed: "text-accent-400",
  dropped: "text-red-400",
  on_hold: "text-yellow-400",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  steam: "Steam",
  epic: "Epic Games",
  gog: "GOG",
  custom: "Custom",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  steam: "bg-sky-900/50 text-sky-300 border-sky-700/50",
  epic: "bg-slate-800/60 text-slate-300 border-slate-600/50",
  gog: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  custom: "bg-accent-900/40 text-accent-300 border-accent-700/50",
};

