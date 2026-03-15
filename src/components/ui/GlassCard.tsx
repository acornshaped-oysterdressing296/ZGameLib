import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  hover?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow, hover = true, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "glass rounded-card",
        hover && "glass-hover",
        glow && "glow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
GlassCard.displayName = "GlassCard";
export default GlassCard;
