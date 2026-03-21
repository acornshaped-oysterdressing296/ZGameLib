import { useUIStore } from "@/store/useUIStore";
import { api } from "./tauri";
import type { Game } from "./types";

export function useLaunchGame() {
  const openConfirm = useUIStore((s) => s.openConfirm);
  const addToast = useUIStore((s) => s.addToast);

  const doLaunch = (game: Game): Promise<void> => {
    if (game.platform === "steam" && game.steam_app_id)
      return api.launchSteamGame(game.steam_app_id, game.id);
    if (game.platform === "epic" && game.epic_app_name)
      return api.launchEpicGame(game.epic_app_name, game.id);
    return api.launchGame(game.id);
  };

  const launch = async (game: Game, onStarted?: () => void) => {
    try {
      await doLaunch(game);
      useUIStore.getState().setActiveGameId(game.id);
      onStarted?.();
    } catch (err) {
      const msg = typeof err === "string" ? err : ((err as any)?.message ?? String(err));
      if (msg.includes("GAME_ALREADY_RUNNING")) {
        const runningName = msg.split("GAME_ALREADY_RUNNING:")[1]?.trim() || "another game";
        openConfirm(
          `"${runningName}" is currently running. Stop it and launch "${game.name}"?`,
          async () => {
            try {
              await api.stopGame();
              await doLaunch(game);
              useUIStore.getState().setActiveGameId(game.id);
              onStarted?.();
            } catch (e2) {
              addToast(String(e2), "error");
            }
          },
          "Stop & Launch"
        );
      } else {
        addToast(msg, "error");
      }
    }
  };

  return { launch };
}
