import { motion } from "framer-motion";
import { GamepadIcon } from "@/components/ui/Icons";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-28 gap-5 text-center"
    >
      <div className="relative">
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-3xl glass-strong flex items-center justify-center"
          style={{ boxShadow: "0 0 60px rgb(var(--accent-500) / 0.2), 0 20px 50px rgba(0,0,0,0.3)", border: "1px solid rgb(var(--accent-500) / 0.2)" }}
        >
          <GamepadIcon size={44} className="text-accent-400" />
        </motion.div>
        {([
          { top: "-6px", right: "-6px", delay: 0, size: "6px" },
          { top: "50%", right: "-14px", delay: 0.7, size: "4px" },
          { bottom: "-2px", left: "-10px", delay: 1.4, size: "5px" },
          { top: "10px", left: "-8px", delay: 2.1, size: "3px" },
        ] as const).map((s, i) => (
          <motion.span
            key={i}
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, delay: s.delay, repeat: Infinity }}
            className="absolute rounded-full"
            style={{
              top: s.top,
              right: ("right" in s ? s.right : undefined),
              bottom: ("bottom" in s ? s.bottom : undefined),
              left: ("left" in s ? s.left : undefined),
              width: s.size,
              height: s.size,
              background: "rgb(var(--accent-500))",
            }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
        <p className="text-sm text-slate-600 max-w-sm leading-relaxed">{description}</p>
      </div>
      {action}
    </motion.div>
  );
}
