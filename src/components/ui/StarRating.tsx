import { useState } from "react";
import { motion } from "framer-motion";
import { StarIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number | null;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

export default function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(-1);
  const stars = 10;
  const filled = value ?? 0;
  const sizes = { sm: 12, md: 15, lg: 18 };
  const px = sizes[size];

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(-1)}>
      {Array.from({ length: stars }, (_, i) => {
        const isActive = hovered >= 0 ? i <= hovered : i < filled;
        return (
          <motion.button
            key={i}
            disabled={readonly}
            onClick={() => onChange?.(i + 1)}
            onMouseEnter={() => !readonly && setHovered(i)}
            whileHover={readonly ? {} : { scale: 1.25 }}
            whileTap={readonly ? {} : { scale: 0.9 }}
            className={cn(
              "transition-colors duration-150",
              readonly ? "cursor-default" : "cursor-pointer"
            )}
          >
            <StarIcon
              size={px}
              filled={isActive}
              className={cn(
                "transition-all duration-200",
                isActive ? "text-accent-400 drop-shadow-[0_0_6px_rgb(var(--accent-500)/0.4)]" : "text-slate-700"
              )}
            />
          </motion.button>
        );
      })}
      {value !== null && value !== undefined && (
        <span className="ml-2 text-xs font-bold text-accent-300 tabular-nums">{value}/10</span>
      )}
    </div>
  );
}
