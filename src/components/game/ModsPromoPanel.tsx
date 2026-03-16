import { motion } from "framer-motion";
import { api } from "@/lib/tauri";

interface PromoCard {
  id: string;
  label: string;
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  url: string;
  accentColor: string;
  glowColor: string;
  icon: React.ReactNode;
}

const cards: PromoCard[] = [
  {
    id: "zdbf",
    label: "Discord Framework",
    title: "ZDBF",
    tagline: "Zoryx Discord Bot Framework",
    description:
      "Enterprise-grade Python bot framework with an AI-powered web dashboard, hot-reload, per-guild SQLite, and a full plugin system. Built for scale.",
    tags: ["Python", "AI Dashboard", "Hot Reload", "Open Source"],
    url: "https://zsync.eu/zdbf/",
    accentColor: "rgb(99, 102, 241)",
    glowColor: "rgba(99,102,241,0.18)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "zlogic",
    label: "Mod Menus",
    title: "TheZ's ModMenus",
    tagline: "Free game modification menus",
    description:
      "A collection of free, open-source mod menus for popular PC titles — PEAK, Raft, HollowKnight, Subnautica and more. Powered by MelonLoader and SharpMonoInjector.",
    tags: ["MelonLoader", "Free", "PEAK", "Raft", "Subnautica"],
    url: "https://zlogic.eu/",
    accentColor: "rgb(34, 197, 94)",
    glowColor: "rgba(34,197,94,0.16)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "sharpmono",
    label: "Injection Tool",
    title: "SharpMonoInjector 2.7",
    tagline: "TheHolyOneZ Edition",
    description:
      "The definitive fork of SharpMonoInjector with a modern dark UI, stealth injection support, and .NET compatibility fixes. The injector used behind ZLogic ModMenus.",
    tags: ["C#", ".NET", "Stealth", "Open Source"],
    url: "https://github.com/TheHolyOneZ/SharpMonoInjector-2.7-TheHolyOneZ-Edition-",
    accentColor: "rgb(251, 146, 60)",
    glowColor: "rgba(251,146,60,0.15)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function PromoCards() {
  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-semibold">
          From the developer
        </p>
        <h2 className="text-[15px] font-bold text-slate-300 mt-0.5">Related Projects</h2>
      </div>

      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="glass rounded-2xl p-5 flex flex-col gap-3 cursor-default"
          style={{
            border: `1px solid ${card.accentColor.replace("rgb", "rgba").replace(")", ", 0.15)")}`,
            boxShadow: `0 0 32px ${card.glowColor}`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: card.accentColor.replace("rgb", "rgba").replace(")", ", 0.15)"),
                  color: card.accentColor,
                  border: `1px solid ${card.accentColor.replace("rgb", "rgba").replace(")", ", 0.2)")}`,
                }}
              >
                {card.icon}
              </div>
              <div>
                <p
                  className="text-[9px] uppercase tracking-[0.18em] font-semibold mb-0.5"
                  style={{ color: card.accentColor.replace("rgb", "rgba").replace(")", ", 0.7)") }}
                >
                  {card.label}
                </p>
                <p className="text-[14px] font-bold text-slate-100 leading-none">{card.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{card.tagline}</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => api.openUrl(card.url).catch(() => {})}
              className="shrink-0 text-[11px] font-semibold px-3.5 py-1.5 rounded-xl transition-all duration-200"
              style={{
                background: card.accentColor.replace("rgb", "rgba").replace(")", ", 0.15)"),
                color: card.accentColor,
                border: `1px solid ${card.accentColor.replace("rgb", "rgba").replace(")", ", 0.25)")}`,
              }}
            >
              Visit
            </motion.button>
          </div>

          <p className="text-[11.5px] text-slate-400 leading-relaxed">{card.description}</p>

          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9.5px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgb(148,163,184)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      ))}

      <p className="text-[9.5px] text-slate-700 text-center mt-1">
        These projects are made by the same developer — all free and open source.
      </p>
    </div>
  );
}

export default function ModsPromoPanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 bottom-0 right-[500px] z-[35] overflow-y-auto flex flex-col justify-center px-8 py-10"
      style={{ background: "rgba(6,4,12,0.6)", backdropFilter: "blur(2px)" }}
    >
      <PromoCards />
    </motion.div>
  );
}
