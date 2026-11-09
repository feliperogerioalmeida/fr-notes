import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

import { useRecordingStore } from "@/features/recording/recording-store.js";

import { useUpdateStore } from "./update-store.js";

const isBusy = () => {
  const { status } = useUpdateStore.getState();
  return (
    status === "checking" || status === "downloading" || status === "ready"
  );
};

const isRecording = () => useRecordingStore.getState().phase !== "idle";

const installUpdate = async (update: Update) => {
  const store = useUpdateStore.getState();
  store.beginDownload(update.version);
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") total = event.data.contentLength ?? 0;
    if (event.event === "Progress") received += event.data.chunkLength;
    if (total > 0) useUpdateStore.getState().setProgress(received / total);
  });
  useUpdateStore.getState().markReady();
};

export const checkForUpdates = async (): Promise<string | null> => {
  if (isBusy() || isRecording()) return null;
  const store = useUpdateStore.getState();
  store.setStatus("checking");
  try {
    const update = await check();
    if (!update) {
      store.setStatus("up-to-date");
      return null;
    }
    await installUpdate(update);
    return update.version;
  } catch (error) {
    store.setStatus("error");
    throw error;
  }
};

export const restartToApplyUpdate = async (): Promise<boolean> => {
  if (isRecording()) return false;
  await relaunch();
  return true;
};
