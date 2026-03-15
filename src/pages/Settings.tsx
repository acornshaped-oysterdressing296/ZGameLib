import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { api } from "@/lib/tauri";
import { useUIStore } from "@/store/useUIStore";
import type { AppSettings, StatusConfig } from "@/lib/types";
import {
  DownloadIcon, SettingsIcon, CheckIcon, PlusIcon, TrashIcon,
  CloseIcon, GamepadIcon, SparkleIcon
} from "@/components/ui/Icons";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
      style={{ background: value ? "rgb(var(--accent-600))" : "rgba(255,255,255,0.1)" }}
    >
      <motion.span
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        style={{ display: "block" }}
      />
    </motion.button>
  );
}

const COLOR_PRESETS = [
  "#4ade80", "#60a5fa", "#a78bfa", "#f87171", "#fbbf24",
  "#f472b6", "#22d3ee", "#fb923c", "#34d399", "#818cf8",
  "#e879f9", "#a3e635", "#94a3b8",
];

function Section({ title, icon, delay = 0, children }: {
  title: string;
  icon: React.ReactNode;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span className="text-accent-400">{icon}</span>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em]">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function applyTheme(theme: string) {
  document.documentElement.setAttribute("data-theme", theme);
}

export default function Settings() {
  const addToast = useUIStore((s) => s.addToast);
  const setCustomStatuses = useUIStore((s) => s.setCustomStatuses);
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<AppSettings | null>(
    () => queryClient.getQueryData<AppSettings>(["settings"]) ?? null
  );
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#60a5fa");
  const [showAddStatus, setShowAddStatus] = useState(false);

  const { data: querySettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (querySettings && !settings) {
      setSettings(querySettings);
      applyTheme(querySettings.theme);
    }
  }, [querySettings]);

  const saveMutation = useMutation({
    mutationFn: (s: AppSettings) => api.saveSettings(s),
    onSuccess: () => {
      if (settings) {
        setCustomStatuses(settings.custom_statuses);
        applyTheme(settings.theme);
        queryClient.setQueryData(["settings"], settings);
      }
      addToast("Settings saved", "success");
    },
    onError: (e) => addToast(String(e), "error"),
  });

  const handleImport = async () => {
    try {
      const selected = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
      if (typeof selected !== "string") return;
      const result = await api.importLibrary(selected);
      addToast(`Imported ${result.added} games (${result.skipped} skipped)`, result.added > 0 ? "success" : "info");
    } catch (e) {
      addToast(String(e), "error");
    }
  };

  const handleExport = async () => {
    try {
      const json = await api.exportLibrary();
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: `zgamelib-export-${new Date().toISOString().slice(0, 10)}.json`,
      });
      if (!path) return;
      await api.saveFile(path, json);
      addToast("Library exported", "success");
    } catch (e) {
      addToast(String(e), "error");
    }
  };

  const addStatus = () => {
    if (!settings || !newStatusLabel.trim()) return;
    const key = newStatusLabel.trim().toLowerCase().replace(/\s+/g, "_");
    if (settings.custom_statuses.some((s) => s.key === key)) {
      addToast("Status already exists", "error");
      return;
    }
    setSettings({
      ...settings,
      custom_statuses: [
        ...settings.custom_statuses,
        { key, label: newStatusLabel.trim(), color: newStatusColor },
      ],
    });
    setNewStatusLabel("");
    setShowAddStatus(false);
  };

  const removeStatus = (key: string) => {
    if (!settings) return;
    setSettings({ ...settings, custom_statuses: settings.custom_statuses.filter((s) => s.key !== key) });
  };

  const updateStatus = (index: number, field: keyof StatusConfig, value: string) => {
    if (!settings) return;
    const updated = [...settings.custom_statuses];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "label") updated[index].key = value.toLowerCase().replace(/\s+/g, "_");
    setSettings({ ...settings, custom_statuses: updated });
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-7"
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgb(var(--accent-500) /0.25), rgb(var(--accent-800) /0.15))",
              border: "1px solid rgb(var(--accent-500) /0.2)",
              boxShadow: "0 0 20px rgb(var(--accent-500) /0.1)",
            }}
          >
            <SettingsIcon size={19} className="text-accent-400" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-white tracking-tight">Settings</h1>
            <p className="text-[12px] text-slate-600 mt-0.5">Customize your ZGameLib experience</p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">

          <Section title="General" icon={<SparkleIcon size={13} />} delay={0.04}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold block mb-2">
                  Default View
                </label>
                <select
                  value={settings.default_view}
                  onChange={(e) => setSettings({ ...settings, default_view: e.target.value })}
                  className="input-glass cursor-pointer"
                >
                  <option value="grid" className="bg-[#0d0c14]">Grid</option>
                  <option value="list" className="bg-[#0d0c14]">List</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold block mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="input-glass cursor-pointer"
                >
                  <option value="dark" className="bg-[#0d0c14]">Dark</option>
                  <option value="amoled" className="bg-[#0d0c14]">AMOLED</option>
                  <option value="nord" className="bg-[#2e3440]">Nord</option>
                  <option value="catppuccin" className="bg-[#1e1e2e]">Catppuccin Mocha</option>
                  <option value="dracula" className="bg-[#282a36]">Dracula</option>
                  <option value="gruvbox" className="bg-[#282828]">Gruvbox</option>
                  <option value="tokyonight" className="bg-[#1a1b26]">Tokyo Night</option>
                </select>
              </div>
            </div>
          </Section>

          <Section title="Appearance" icon={<SparkleIcon size={13} />} delay={0.06}>
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold block mb-2.5">
                  Grid Columns
                </label>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSettings({ ...settings, grid_columns: n })}
                      className={cn(
                        "w-11 h-11 rounded-xl text-[13px] font-bold transition-all duration-200 border",
                        settings.grid_columns === n
                          ? "text-white border-accent-500/50 bg-accent-600/25"
                          : "text-slate-500 border-white/6 bg-white/3 hover:text-slate-300 hover:bg-white/6"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="self-center text-[11px] text-slate-600 ml-1">columns</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-slate-300">Show playtime on cards</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Display hours played on each game card</p>
                </div>
                <Toggle
                  value={settings.show_playtime_on_cards}
                  onChange={(v) => setSettings({ ...settings, show_playtime_on_cards: v })}
                />
              </div>
            </div>
          </Section>

          <Section title="Behavior" icon={<SettingsIcon size={13} />} delay={0.1}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-slate-300">Auto-scan on startup</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Scan Steam & Epic for new games when the app opens</p>
                </div>
                <Toggle
                  value={settings.auto_scan}
                  onChange={(v) => setSettings({ ...settings, auto_scan: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-slate-300">Minimize on launch</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Minimize ZGameLib when you launch a game, restore on exit</p>
                </div>
                <Toggle
                  value={settings.minimize_on_launch}
                  onChange={(v) => setSettings({ ...settings, minimize_on_launch: v })}
                />
              </div>
            </div>
          </Section>

          <Section title="System" icon={<SettingsIcon size={13} />} delay={0.12}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-slate-300">Launch on Windows startup</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Start ZGameLib automatically when you log in</p>
                </div>
                <Toggle
                  value={settings.autostart}
                  onChange={(v) => setSettings({ ...settings, autostart: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-slate-300">Start minimized</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Open in the taskbar instead of the foreground</p>
                </div>
                <Toggle
                  value={settings.start_minimized}
                  onChange={(v) => setSettings({ ...settings, start_minimized: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-slate-300">Close to tray</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Clicking ✕ hides the window — right-click the tray icon to quit</p>
                </div>
                <Toggle
                  value={settings.close_to_tray}
                  onChange={(v) => setSettings({ ...settings, close_to_tray: v })}
                />
              </div>
            </div>
          </Section>

          <Section title="Platform Paths" icon={<GamepadIcon size={13} />} delay={0.14}>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold block mb-2">
                  Steam Path Override
                </label>
                <input
                  value={settings.steam_path ?? ""}
                  onChange={(e) => setSettings({ ...settings, steam_path: e.target.value || null })}
                  placeholder="Auto-detected from registry"
                  className="input-glass text-[12px] font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold block mb-2">
                  Epic Path Override
                </label>
                <input
                  value={settings.epic_path ?? ""}
                  onChange={(e) => setSettings({ ...settings, epic_path: e.target.value || null })}
                  placeholder="Auto-detected"
                  className="input-glass text-[12px] font-mono"
                />
              </div>
            </div>
          </Section>

          <Section title="Game Statuses" icon={<span className="w-3 h-3 rounded-full bg-accent-500 inline-block" />} delay={0.12}>
            <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
              Drag rows to reorder. Click a label to rename. These appear throughout the app to track progress.
            </p>

            <Reorder.Group
              axis="y"
              values={settings.custom_statuses}
              onReorder={(newOrder) => setSettings({ ...settings, custom_statuses: newOrder })}
              className="flex flex-col gap-1.5 mb-3"
            >
              <AnimatePresence>
                {settings.custom_statuses.map((status, i) => (
                  <Reorder.Item
                    key={status.key}
                    value={status}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                    whileDrag={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
                  >
                    <div className="text-slate-700 shrink-0">
                      <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
                        <circle cx="2" cy="2" r="1.2" /><circle cx="6" cy="2" r="1.2" />
                        <circle cx="2" cy="7" r="1.2" /><circle cx="6" cy="7" r="1.2" />
                        <circle cx="2" cy="12" r="1.2" /><circle cx="6" cy="12" r="1.2" />
                      </svg>
                    </div>

                    <button
                      onClick={() => setEditingStatus(editingStatus === i ? null : i)}
                      className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0 transition-transform hover:scale-125"
                      style={{ backgroundColor: status.color }}
                    />

                    {editingStatus === i ? (
                      <input
                        autoFocus
                        value={status.label}
                        onChange={(e) => updateStatus(i, "label", e.target.value)}
                        onBlur={() => setEditingStatus(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingStatus(null)}
                        className="input-glass flex-1 text-[12px] py-1"
                      />
                    ) : (
                      <span
                        className="flex-1 text-[13px] text-slate-300 cursor-text hover:text-white transition-colors"
                        onClick={() => setEditingStatus(i)}
                      >
                        {status.label}
                      </span>
                    )}

                    {editingStatus === i && (
                      <div className="flex gap-1 shrink-0">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateStatus(i, "color", c)}
                            className={cn(
                              "w-3.5 h-3.5 rounded-full transition-transform hover:scale-125",
                              status.color === c ? "ring-2 ring-white/40 scale-110" : ""
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => removeStatus(status.key)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <TrashIcon size={11} />
                    </motion.button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>

            <AnimatePresence>
              {showAddStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="p-3 rounded-xl mb-2"
                    style={{ background: "rgb(var(--accent-500) /0.06)", border: "1px solid rgb(var(--accent-500) /0.15)" }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        className="w-4 h-4 rounded-full border border-white/15 shrink-0 transition-transform hover:scale-110"
                        style={{ backgroundColor: newStatusColor }}
                        onClick={() => {
                          const idx = COLOR_PRESETS.indexOf(newStatusColor);
                          setNewStatusColor(COLOR_PRESETS[(idx + 1) % COLOR_PRESETS.length]);
                        }}
                      />
                      <input
                        autoFocus
                        value={newStatusLabel}
                        onChange={(e) => setNewStatusLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addStatus()}
                        placeholder="Status name…"
                        className="input-glass flex-1 text-[12px] py-1.5"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={addStatus}
                        disabled={!newStatusLabel.trim()}
                        className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-30 shrink-0"
                      >
                        Add
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowAddStatus(false)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/6 transition-all shrink-0"
                      >
                        <CloseIcon size={11} />
                      </motion.button>
                    </div>
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewStatusColor(c)}
                          className={cn(
                            "w-4 h-4 rounded-full transition-transform hover:scale-125",
                            newStatusColor === c ? "ring-2 ring-white/40 scale-110" : ""
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowAddStatus(!showAddStatus)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] text-slate-500 hover:text-slate-300 transition-all"
              style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              <PlusIcon size={12} />
              Add status
            </motion.button>
          </Section>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending}
            className="btn-primary justify-center py-3 text-[13px] font-semibold disabled:opacity-60"
            style={{ boxShadow: "0 0 30px rgb(var(--accent-500) /0.2)" }}
          >
            <CheckIcon size={14} />
            {saveMutation.isPending ? "Saving…" : "Save Settings"}
          </motion.button>

          <div className="grid grid-cols-2 gap-4">
            <Section title="Data" icon={<DownloadIcon size={13} />} delay={0.2}>
              <p className="text-[11px] text-slate-600 mb-4 leading-relaxed">
                Export your library as JSON or restore from a backup.
              </p>
              <div className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleExport}
                  className="btn-ghost w-full justify-center text-[12px]"
                >
                  <DownloadIcon size={13} />
                  Export
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleImport}
                  className="btn-ghost w-full justify-center text-[12px]"
                >
                  <PlusIcon size={13} />
                  Import
                </motion.button>
              </div>
            </Section>

            <Section title="About" icon={<GamepadIcon size={13} />} delay={0.22}>
              <div className="flex flex-col items-center text-center gap-2.5 py-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgb(var(--accent-600)), rgb(var(--accent-400)))", boxShadow: "0 4px 16px rgb(var(--accent-600) / 0.35)" }}
                >
                  <GamepadIcon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white">ZGameLib</p>
                  <p className="text-[11px] text-slate-600">v0.1.0</p>
                </div>
                <p className="text-[11px] text-slate-500">
                  Made by{" "}
                  <a
                    href="https://github.com/TheHolyOneZ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400 hover:text-accent-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    TheHolyOneZ
                  </a>
                </p>
              </div>
            </Section>
          </div>

        </div>
      </div>
    </div>
  );
}
