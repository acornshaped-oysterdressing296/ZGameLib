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
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-24 h-24 rounded-3xl glass-strong flex items-center justify-center border-gradient"
        style={{ boxShadow: "0 0 40px rgb(var(--accent-500) / 0.1), 0 20px 50px rgba(0,0,0,0.3)" }}
      >
        <GamepadIcon size={40} className="text-accent-500/50" />
      </motion.div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
        <p className="text-sm text-slate-600 max-w-sm leading-relaxed">{description}</p>
      </div>
      {action}
    </motion.div>
  );
}
