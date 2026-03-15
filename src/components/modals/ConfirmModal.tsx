import { AnimatePresence, motion } from "framer-motion";
import { AlertIcon } from "@/components/ui/Icons";
import { useUIStore } from "@/store/useUIStore";

export default function ConfirmModal() {
  const dialog = useUIStore((s) => s.confirmDialog);
  const closeConfirm = useUIStore((s) => s.closeConfirm);

  return (
    <AnimatePresence>
      {dialog?.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConfirm}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="glass-strong rounded-3xl p-6 w-full max-w-sm pointer-events-auto mx-4"
              style={{
                boxShadow: "0 0 50px rgba(239,68,68,0.08), 0 30px 60px rgba(0,0,0,0.6)",
                borderColor: "rgba(239,68,68,0.12)",
              }}
            >
              <div className="flex items-start gap-4 mb-6">
                <motion.div
                  initial={{ rotate: -15 }}
                  animate={{ rotate: 0 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <AlertIcon size={20} className="text-red-400" />
                </motion.div>
                <div>
                  <h3 className="text-[14px] font-semibold text-white mb-1">Confirm Action</h3>
                  <p className="text-[13px] text-slate-400 leading-relaxed">{dialog.title}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={closeConfirm}
                  className="btn-ghost flex-1 justify-center"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { dialog.onConfirm(); closeConfirm(); }}
                  className="flex-1 justify-center flex items-center gap-2 font-medium px-4 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, rgba(220,38,38,0.8), rgba(185,28,28,0.9))",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "white",
                    boxShadow: "0 0 20px rgba(239,68,68,0.15)",
                  }}
                >
                  Remove
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
