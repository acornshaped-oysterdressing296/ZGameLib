import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import type { LogEntry } from "@/store/useUIStore";
import { CloseIcon, TrashIcon } from "@/components/ui/Icons";

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "text-slate-400",
  ok: "text-emerald-400",
  warn: "text-amber-400",
  error: "text-red-400",
};

const LEVEL_PREFIX: Record<LogEntry["level"], string> = {
  info: "·",
  ok: "✓",
  warn: "!",
  error: "✗",
};

export default function LogPanel() {
  const isOpen = useUIStore((s) => s.logPanelOpen);
  const setOpen = useUIStore((s) => s.setLogPanelOpen);
  const logs = useUIStore((s) => s.logs);
  const addLog = useUIStore((s) => s.addLog);
  const clearLogs = useUIStore((s) => s.clearLogs);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Listen to Tauri scan-log events
  useEffect(() => {
    const promise = listen<{ level: string; message: string }>("scan-log", (event) => {
      const validLevels = ["info", "ok", "warn", "error"];
      const level = (validLevels.includes(event.payload.level)
        ? event.payload.level
        : "info") as LogEntry["level"];
      addLog(level, event.payload.message);
    });
    return () => { promise.then((unlisten) => unlisten()); };
  }, [addLog]);

  // Auto-scroll to bottom when new logs arrive and panel is open
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="fixed top-0 right-0 h-screen w-[440px] z-50 flex flex-col"
          style={{
            background: "rgba(6, 5, 12, 0.97)",
            backdropFilter: "blur(20px)",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "-24px 0 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[13px] font-semibold text-white tracking-tight">Scan Log</span>
              <span className="text-[10px] text-slate-600 tabular-nums">{logs.length} entries</span>
            </div>
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={clearLogs}
                className="btn-icon text-slate-600 hover:text-red-400"
                title="Clear logs"
              >
                <TrashIcon size={13} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(false)}
                className="btn-icon"
              >
                <CloseIcon size={13} />
              </motion.button>
            </div>
          </div>

          {/* Legend */}
          <div
            className="flex items-center gap-4 px-5 py-2 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
          >
            {(["ok", "warn", "error", "info"] as const).map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <span className={`text-[11px] font-mono font-bold ${LEVEL_COLOR[level]}`}>
                  {LEVEL_PREFIX[level]}
                </span>
                <span className="text-[10px] text-slate-600 capitalize">{level}</span>
              </div>
            ))}
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto p-4 space-y-px">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-600 text-[12px]">
                  No logs yet — run a scan to see output.
                </p>
              </div>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="flex gap-2.5 items-baseline font-mono text-[11px] leading-relaxed">
                  <span className="text-slate-700 shrink-0 tabular-nums text-[10px]">
                    {entry.time}
                  </span>
                  <span className={`shrink-0 w-3 text-center font-bold ${LEVEL_COLOR[entry.level]}`}>
                    {LEVEL_PREFIX[entry.level]}
                  </span>
                  <span className={`break-all ${LEVEL_COLOR[entry.level]}`}>
                    {entry.message}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
