import { useState, useEffect, type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ScrollToTop({ scrollRef }: { scrollRef: RefObject<HTMLDivElement> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setVisible(el.scrollTop > 400);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [scrollRef]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-9 h-9 rounded-xl glass-strong border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:border-accent-500/30 transition-colors shadow-lg"
          aria-label="Scroll to top"
          title="Back to top"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
