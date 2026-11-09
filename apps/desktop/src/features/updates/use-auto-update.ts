import { useEffect } from "react";
import { toast } from "sonner";

import { checkForUpdates, restartToApplyUpdate } from "./run-update.js";

const FIRST_CHECK_DELAY_MS = 5_000;
const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

const offerRestart = (version: string) =>
  toast.success(`FR Notes ${version} instalado`, {
    description: "Reinicie para usar a nova versão.",
    duration: Infinity,
    action: {
      label: "Reiniciar",
      onClick: async () => {
        const restarted = await restartToApplyUpdate();
        if (!restarted) {
          toast.message("Termine a gravação para reiniciar o FR Notes.");
        }
      },
    },
  });

const runSilentCheck = async () => {
  try {
    const version = await checkForUpdates();
    if (version) offerRestart(version);
  } catch {
    return;
  }
};

export const useAutoUpdate = () => {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const firstCheck = setTimeout(
      () => void runSilentCheck(),
      FIRST_CHECK_DELAY_MS,
    );
    const interval = setInterval(
      () => void runSilentCheck(),
      CHECK_INTERVAL_MS,
    );
    return () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
    };
  }, []);
};
