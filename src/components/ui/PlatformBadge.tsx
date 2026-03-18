import { cn, PLATFORM_COLORS } from "@/lib/utils";
import { SteamIcon, EpicIcon, GogIcon, CustomGameIcon } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";
import type { Platform } from "@/lib/types";

const PLATFORM_ICONS: Record<Platform, React.ComponentType<{ size?: number; className?: string }>> = {
  steam: SteamIcon,
  epic: EpicIcon,
  gog: GogIcon,
  custom: CustomGameIcon,
};

const PLATFORM_LABELS: Record<Platform, string> = {
  steam: "Steam",
  epic: "Epic",
  gog: "GOG",
  custom: "Custom",
};

interface PlatformBadgeProps {
  platform: Platform;
  className?: string;
}

export default function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const Icon = PLATFORM_ICONS[platform] ?? CustomGameIcon;
  const label = PLATFORM_LABELS[platform] ?? platform;

  return (
    <Badge className={cn(PLATFORM_COLORS[platform], className)}>
      <Icon size={10} />
      {label}
    </Badge>
  );
}
