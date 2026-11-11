import { describeMeetingCountdown } from "@workspace/core";
import { useEffect } from "react";

import { useRecordingStore } from "@/features/recording/recording-store.js";
import { getStorage } from "@/lib/database.js";
import { setTrayTitle } from "@/lib/native.js";

import { loadEvents } from "./use-meeting-detection.js";

const TICK_MS = 30_000;

let lastTitle: string | null = null;

const applyTitle = async (title: string | null) => {
  if (title === lastTitle) return;
  lastTitle = title;
  await setTrayTitle(title);
};

const refreshCountdown = async () => {
  const settings = await (await getStorage()).settings.readSettings();
  const isIdle = useRecordingStore.getState().phase === "idle";
  if (!settings.meetingReminders || !isIdle) return applyTitle(null);
  return applyTitle(describeMeetingCountdown(await loadEvents(), Date.now()));
};

export const useTrayCountdown = () => {
  useEffect(() => {
    const refresh = () =>
      void refreshCountdown().catch((error) =>
        console.info("tray countdown failed", error),
      );
    refresh();
    const timer = setInterval(refresh, TICK_MS);
    const unsubscribe = useRecordingStore.subscribe((state, previous) => {
      if (state.phase !== previous.phase) refresh();
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);
};
