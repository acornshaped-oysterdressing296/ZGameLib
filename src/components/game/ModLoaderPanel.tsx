import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/tauri";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";
import type { ModLoaderStatus, ModInfo } from "@/lib/types";

type Op = "install-bepinex" | "uninstall-bepinex" | "install-melonloader" | "uninstall-melonloader" | null;

interface Props {
  installDir: string;
  exePath: string | null;
}

export default function ModLoaderPanel({ installDir, exePath }: Props) {
  const addToast = useUIStore((s) => s.addToast);
  const openConfirm = useUIStore((s) => s.openConfirm);
  const [status, setStatus] = useState<ModLoaderStatus | null>(null);
  const [op, setOp] = useState<Op>(null);

  const load = async () => {
    try {
      setStatus(await api.checkModloaderStatus(installDir));
    } catch (e) {
      addToast(String(e), "error");
    }
  };

  useEffect(() => { load(); }, [installDir]);

  const run = async (operation: Op, fn: () => Promise<void>, successMsg: string) => {
    setOp(operation);
    try {
      await fn();
      addToast(successMsg, "success");
      await load();
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setOp(null);
    }
  };

  const handleInstallBepInEx = () =>
    run("install-bepinex", () => api.installBepinex(installDir), "BepInEx installed!");

  const handleUninstallBepInEx = () =>
    openConfirm("Uninstall BepInEx? This removes the BepInEx folder and hook files.", () =>
      run("uninstall-bepinex", () => api.uninstallBepinex(installDir), "BepInEx uninstalled")
    );

  const handleInstallMelonLoader = () =>
    run("install-melonloader", () => api.installMelonloader(installDir), "MelonLoader installed!");

  const handleUninstallMelonLoader = () =>
    openConfirm("Uninstall MelonLoader? This removes the MelonLoader folder and hook files.", () =>
      run("uninstall-melonloader", () => api.uninstallMelonloader(installDir), "MelonLoader uninstalled")
    );

  const handleAddMod = async () => {
    const selected = await open({ filters: [{ name: "Mod", extensions: ["dll"] }], multiple: true });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    let added = 0;
    for (const path of paths) {
      try { await api.installMod(installDir, path); added++; }
      catch (e) { addToast(String(e), "error"); }
    }
    if (added > 0) {
      addToast(`${added} mod${added > 1 ? "s" : ""} added`, "success");
      await load();
    }
  };

  const handleDeleteMod = async (mod: ModInfo) => {
    try {
      await api.deleteMod(installDir, mod.file_name);
      addToast(`Removed ${mod.name}`, "success");
      await load();
    } catch (e) {
      addToast(String(e), "error");
    }
  };

  if (!status) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin" />
      </div>
    );
  }

  const busy = op !== null;
  const anyInstalled = status.bepinex_installed || status.melonloader_installed;

  const loaders = [
    {
      key: "bepinex" as const,
      label: "BepInEx",
      desc: "Unity modding framework",
      installed: status.bepinex_installed,
      installOp: "install-bepinex" as Op,
      uninstallOp: "uninstall-bepinex" as Op,
      onInstall: handleInstallBepInEx,
      onUninstall: handleUninstallBepInEx,
    },
    {
      key: "melonloader" as const,
      label: "MelonLoader",
      desc: "Supports Unity IL2CPP & Mono",
      installed: status.melonloader_installed,
      installOp: "install-melonloader" as Op,
      uninstallOp: "uninstall-melonloader" as Op,
      onInstall: handleInstallMelonLoader,
      onUninstall: handleUninstallMelonLoader,
    },
  ];

  return (
    <div className="flex flex-col gap-5">

      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold">Mod Loaders</p>
        {loaders.map((loader) => {
          const isInstalling = op === loader.installOp;
          const isUninstalling = op === loader.uninstallOp;

          return (
            <div
              key={loader.key}
              className={cn(
                "glass rounded-xl px-4 py-3 flex items-center justify-between border transition-all duration-300",
                loader.installed && "border-green-500/20 bg-green-500/5"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0 transition-colors duration-300",
                  loader.installed ? "bg-green-400" : "bg-slate-700"
                )} />
                <div>
                  <p className="text-[13px] font-semibold text-slate-200">{loader.label}</p>
                  <p className="text-[10px] text-slate-600">
                    {loader.installed ? "Installed" : loader.desc}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                {loader.installed ? (
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={loader.onUninstall}
                    disabled={busy}
                    className="btn-ghost text-[11px] py-1.5 px-3 text-red-500/70 hover:text-red-400 border-red-500/10 hover:border-red-500/25 disabled:opacity-40"
                  >
                    {isUninstalling ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin" />
                        Removing...
                      </span>
                    ) : "Uninstall"}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={loader.onInstall}
                    disabled={busy}
                    className="btn-primary text-[11px] py-1.5 px-3 disabled:opacity-40"
                  >
                    {isInstalling ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-white/30 border-t-white animate-spin" />
                        Installing...
                      </span>
                    ) : "Install"}
                  </motion.button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {anyInstalled && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold">
              Mods ({status.mods.length})
            </p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => api.openModsFolder(installDir).catch(() => {})}
                className="btn-ghost text-[11px] py-1.5 px-3"
              >
                Open Folder
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleAddMod}
                className="btn-primary text-[11px] py-1.5 px-3"
              >
                + Add Mod
              </motion.button>
            </div>
          </div>

          <div
            className="rounded-xl px-4 py-3 flex gap-3 items-start"
            style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.15)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-px text-amber-400/80" style={{ color: "rgb(251 191 36 / 0.8)" }}>
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18A2 2 0 003.64 21H20.36A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgb(251 191 36 / 0.7)" }}>
              Some mod DLLs get flagged as potential threats by antivirus software — even when they are safe. If adding a mod fails or gets blocked, temporarily disable your antivirus and try again.
            </p>
          </div>

          {status.mods.length === 0 ? (
            <div
              className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center"
              style={{ borderStyle: "dashed", borderColor: "rgba(255,255,255,0.06)" }}
            >
              <p className="text-[13px] text-slate-500 mb-1">No mods installed</p>
              <p className="text-[11px] text-slate-700">Click "Add Mod" to drop a .dll mod in</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <AnimatePresence>
                {status.mods.map((mod) => (
                  <motion.div
                    key={mod.file_name}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass rounded-xl px-4 py-3 flex items-center justify-between group"
                  >
                    <div className="flex flex-col min-w-0">
                      <p className="text-[12px] font-medium text-slate-300 truncate">{mod.name}</p>
                      <p className="text-[10px] text-slate-600">{(mod.size_bytes / 1024).toFixed(1)} KB</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteMod(mod)}
                      className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-[11px] ml-3 shrink-0"
                    >
                      Remove
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
