import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useUIStore } from "@/store/useUIStore";
import { useGames } from "@/hooks/useGames";
import { api } from "@/lib/tauri";
import type { Platform } from "@/lib/types";
import { CloseIcon, FolderIcon, PlusIcon, GamepadIcon, ScanIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

type Mode = "single" | "bulk";

export default function AddGameModal() {
  const isOpen = useUIStore((s) => s.isAddGameOpen);
  const setOpen = useUIStore((s) => s.setAddGameOpen);
  const addToast = useUIStore((s) => s.addToast);
  const { create } = useGames();

  const [mode, setMode] = useState<Mode>("single");
  const [name, setName] = useState("");
  const [exePath, setExePath] = useState("");
  const [platform] = useState<Platform>("custom");
  const [bulkFolder, setBulkFolder] = useState("");
  const [isBulkScanning, setIsBulkScanning] = useState(false);

  const close = () => {
    setOpen(false);
    setMode("single");
    setName("");
    setExePath("");
    setBulkFolder("");
  };

  const pickExe = async () => {
    const selected = await open({
      filters: [{ name: "Executable", extensions: ["exe"] }],
    });
    if (typeof selected === "string") {
      setExePath(selected);
      if (!name) {
        const parts = selected.split(/[\\/]/);
        const filename = parts[parts.length - 1].replace(".exe", "");
        setName(filename);
      }
    }
  };

  const pickFolder = async () => {
    const selected = await open({
      directory: true,
      title: "Select folder containing game subfolders",
    });
    if (typeof selected === "string") {
      setBulkFolder(selected);
    }
  };

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create({
      name: name.trim(),
      platform,
      exe_path: exePath || undefined,
      install_dir: exePath ? exePath.split(/[\\/]/).slice(0, -1).join("/") : undefined,
    });
    close();
  };

  const handleSubmitBulk = async () => {
    if (!bulkFolder) return;
    setIsBulkScanning(true);
    try {
      const result = await api.scanFolder(bulkFolder);
      addToast(
        result.added > 0
          ? `Found ${result.added} new game${result.added !== 1 ? "s" : ""}`
          : "No new games found",
        result.added > 0 ? "success" : "info"
      );
      window.location.reload();
    } catch (e) {
      addToast(String(e), "error");
    } finally {
      setIsBulkScanning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="glass-strong rounded-3xl w-full max-w-md pointer-events-auto overflow-hidden"
              style={{
                boxShadow: "0 0 80px rgb(var(--accent-500) /0.12), 0 30px 80px rgba(0,0,0,0.6)",
                borderColor: "rgb(var(--accent-500) /0.12)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgb(var(--accent-500) /0.2), rgb(var(--accent-800) /0.15))",
                      border: "1px solid rgb(var(--accent-500) /0.2)",
                    }}
                  >
                    <GamepadIcon size={18} className="text-accent-400" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-white">Add Games</h2>
                    <p className="text-[11px] text-slate-600">
                      {mode === "single" ? "Add a single game" : "Bulk scan a folder"}
                    </p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={close} className="btn-icon">
                  <CloseIcon size={14} />
                </motion.button>
              </div>

              {/* Mode Toggle */}
              <div className="px-6 mb-4">
                <div className="flex rounded-xl glass overflow-hidden p-1 gap-1">
                  {(["single", "bulk"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-all duration-200 flex items-center justify-center gap-2",
                        mode === m
                          ? "text-white bg-accent-600/25 border border-accent-500/25"
                          : "text-slate-500 hover:text-slate-300 border border-transparent"
                      )}
                    >
                      {m === "single" ? (
                        <>
                          <PlusIcon size={12} />
                          Single Game
                        </>
                      ) : (
                        <>
                          <ScanIcon size={12} />
                          Bulk Add
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <AnimatePresence initial={false}>
                {mode === "single" ? (
                  <motion.form
                    key="single"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleSubmitSingle}
                    className="px-6 pb-6 flex flex-col gap-4"
                  >
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                        Game Name
                      </label>
                      <input
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter game name"
                        className="input-glass"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                        Executable (.exe)
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={exePath}
                          onChange={(e) => setExePath(e.target.value)}
                          placeholder="Path to .exe file"
                          className="input-glass flex-1 text-[12px] font-mono"
                        />
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          type="button"
                          onClick={pickExe}
                          className="btn-ghost px-3"
                        >
                          <FolderIcon size={15} />
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={close}
                        className="btn-ghost flex-1 justify-center"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={!name.trim()}
                        className="btn-primary flex-1 justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <PlusIcon size={13} />
                        Add Game
                      </motion.button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
                    key="bulk"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.15 }}
                    className="px-6 pb-6 flex flex-col gap-4"
                  >
                    <div className="glass rounded-xl p-4">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Select a folder containing game subfolders. Each subfolder should contain a game's
                        <span className="text-accent-300 font-medium"> .exe</span> file.
                        The largest exe in each subfolder will be auto-detected.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-semibold mb-1.5 block">
                        Games Folder
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={bulkFolder}
                          onChange={(e) => setBulkFolder(e.target.value)}
                          placeholder="D:\Games\ or similar"
                          className="input-glass flex-1 text-[12px] font-mono"
                        />
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={pickFolder}
                          className="btn-ghost px-3"
                        >
                          <FolderIcon size={15} />
                        </motion.button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={close}
                        className="btn-ghost flex-1 justify-center"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmitBulk}
                        disabled={!bulkFolder || isBulkScanning}
                        className="btn-primary flex-1 justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isBulkScanning ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            >
                              <ScanIcon size={13} />
                            </motion.span>
                            Scanning...
                          </>
                        ) : (
                          <>
                            <ScanIcon size={13} />
                            Scan & Add
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
