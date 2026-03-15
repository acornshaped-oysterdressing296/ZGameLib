import { AnimatePresence, motion } from "framer-motion";
import { SuccessIcon, ErrorIcon, InfoIcon, CloseIcon } from "@/components/ui/Icons";
import { useUIStore } from "@/store/useUIStore";

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="glass-strong pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl min-w-[300px] max-w-[400px]"
            style={{
              borderColor:
                t.type === "success"
                  ? "rgb(var(--accent-500) /0.25)"
                  : t.type === "error"
                  ? "rgba(239,68,68,0.25)"
                  : "rgba(255,255,255,0.06)",
              boxShadow:
                t.type === "success"
                  ? "0 0 30px rgb(var(--accent-500) /0.1), 0 8px 24px rgba(0,0,0,0.3)"
                  : t.type === "error"
                  ? "0 0 30px rgba(239,68,68,0.1), 0 8px 24px rgba(0,0,0,0.3)"
                  : "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
              t.type === "success" ? "bg-accent-500/15" : t.type === "error" ? "bg-red-500/15" : "bg-blue-500/15"
            }`}>
              {t.type === "success" && <SuccessIcon size={16} className="text-accent-400" />}
              {t.type === "error" && <ErrorIcon size={16} className="text-red-400" />}
              {t.type === "info" && <InfoIcon size={16} className="text-blue-400" />}
            </div>
            <span className="text-[13px] text-slate-200 flex-1 leading-snug">{t.message}</span>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => removeToast(t.id)}
              className="text-slate-600 hover:text-slate-300 transition-colors p-1"
            >
              <CloseIcon size={12} />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
