import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import { api } from "@/lib/tauri";
import { CloseIcon } from "@/components/ui/Icons";

interface ReleaseNote {
  headline: string;
  bullets: string[];
}

const RELEASE_NOTES: Record<string, ReleaseNote> = {
  "1.2.0": {
    headline: "Game tracking overhaul, security hardening, and targeted bug fixes.",
    bullets: [
      "Game-already-running detection — in-app confirm dialog with Stop & Launch to switch games instantly",
      "Live \"Playing\" indicator on the play button while a game session is active",
      "Stop & Launch terminates the running game process before launching the new one",
      "ZipSlip path-traversal vulnerability patched in BepInEx/MelonLoader installer",
      "IGDB OAuth tokens cached and reused — no redundant round-trips per lookup",
      "Filesystem write command restricted to safe directories (AppData, Documents, Desktop)",
      "Partial UNIQUE index migration fixes duplicate game blocking on soft-deleted records",
      "Session-ended state sync uses TanStack Query invalidation — no more stale playtime",
    ],
  },
  "1.0.0": {
    headline: "The 1.0 milestone — polished, welcoming, and ready.",
    bullets: [
      "Interactive onboarding tour — Fast, Standard, or Deep Dive to learn every feature",
      "Year in Review — your gaming year summarised with playtime, streaks, and platform stats",
      "Smart Play Recommendations — surfaces backlog games matched to your taste",
      "What's New modal so you always know what changed after an update",
      "New keyboard shortcuts: S (scan), W (Wrapped), 1–9 (quick rate), H (hidden), Ctrl+Z (undo tag)",
    ],
  },
};

function getFallbackNote(version: string): ReleaseNote {
  return { headline: `ZGameLib v${version} is here.`, bullets: ["Bug fixes and improvements."] };
}

export default function WhatsNewModal() {
  const open = useUIStore((s) => s.whatsNewOpen);
  const setOpen = useUIStore((s) => s.setWhatsNewOpen);
  const version = useUIStore((s) => s.whatsNewVersion);

  const note = RELEASE_NOTES[version] ?? getFallbackNote(version);

  const handleClose = () => setOpen(false);

  const handleViewChangelog = () => {
    api.openUrl("https://github.com/TheHolyOneZ/ZGameLib/releases").catch(() => {});
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[460px] max-w-[92vw] rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgb(var(--accent-500) / 0.3)",
              background: "linear-gradient(135deg, rgba(13,12,20,0.98) 0%, rgba(18,16,28,0.98) 100%)",
              boxShadow: "0 0 80px rgb(var(--accent-500) / 0.12), 0 24px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{
                background: "linear-gradient(135deg, rgb(var(--accent-700) / 0.25) 0%, rgb(var(--accent-600) / 0.1) 100%)",
                borderBottom: "1px solid rgb(var(--accent-500) / 0.15)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-400)))",
                  boxShadow: "0 4px 20px rgb(var(--accent-500) / 0.35)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-white leading-tight">What's New in v{version}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{note.headline}</p>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: "rgb(var(--accent-500) / 0.2)", color: "rgb(var(--accent-300))", border: "1px solid rgb(var(--accent-500) / 0.3)" }}>
                v{version}
              </span>
              <button
                onClick={handleClose}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <CloseIcon size={13} />
              </button>
            </div>

            <div className="px-5 py-4">
              <ul className="flex flex-col gap-2.5">
                {note.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.3 }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "rgb(var(--accent-400))" }} />
                    <span className="text-[13px] text-slate-300 leading-relaxed">{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 px-5 pb-5 pt-1">
              <button
                onClick={handleViewChangelog}
                className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                View full changelog →
              </button>
              <div className="flex-1" />
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClose}
                className="btn-primary text-[12px] py-2 px-5"
              >
                Got it
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
