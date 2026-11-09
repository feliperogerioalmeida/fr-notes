import type { UnlistenFn } from "@tauri-apps/api/event";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import type { DictationTrigger, RecordingShortcut } from "@workspace/core";
import { useEffect } from "react";
import { toast } from "sonner";

import type { StartNoteInput } from "@/features/notes/use-start-note.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { endRecording } from "@/features/recording/use-recording-controls.js";
import { useSettings } from "@/features/settings/use-settings.js";
import { onFnKey, setFnKeyMonitoring } from "@/lib/native.js";

import { useDictationStore } from "./dictation-store.js";
import { beginDictation, finishDictation } from "./run-dictation.js";
import { DICTATION_ACCELERATORS, RECORDING_ACCELERATORS } from "./shortcuts.js";

const TAP_THRESHOLD_MS = 300;

const NOOP_BINDING: UnlistenFn = () => undefined;

const handlePress = () => {
  const { phase, handsFree, markPressed } = useDictationStore.getState();
  if (phase === "listening" && handsFree) {
    void finishDictation();
    return;
  }
  if (phase !== "idle") return;
  markPressed(Date.now());
  void beginDictation();
};

const handleRelease = () => {
  const { phase, pressedAt, enableHandsFree } = useDictationStore.getState();
  if (phase !== "listening" || pressedAt === null) return;
  if (Date.now() - pressedAt < TAP_THRESHOLD_MS) {
    enableHandsFree();
    return;
  }
  void finishDictation();
};

const warnTaken = (accelerator: string) =>
  toast.error(`O atalho ${accelerator} já está em uso por outro app.`);

const bindAccelerator = async (
  accelerator: string,
  onPress: () => void,
  onRelease?: () => void,
): Promise<UnlistenFn> => {
  try {
    await register(accelerator, (event) => {
      if (event.state === "Pressed") onPress();
      if (event.state === "Released") onRelease?.();
    });
  } catch {
    warnTaken(accelerator);
  }
  return () => void unregister(accelerator).catch(() => undefined);
};

const bindDictation = async (
  trigger: DictationTrigger,
): Promise<UnlistenFn> => {
  if (trigger !== "fn") {
    return bindAccelerator(
      DICTATION_ACCELERATORS[trigger],
      handlePress,
      handleRelease,
    );
  }
  await setFnKeyMonitoring(true).catch(() => undefined);
  const unlisten = await onFnKey((pressed) =>
    pressed ? handlePress() : handleRelease(),
  );
  return () => {
    unlisten();
    void setFnKeyMonitoring(false).catch(() => undefined);
  };
};

type StartNote = (input: StartNoteInput) => Promise<unknown>;

const toggleRecording = (startNote: StartNote) => {
  const { phase } = useRecordingStore.getState();
  if (phase === "recording") {
    void endRecording();
    return;
  }
  if (phase === "idle") void startNote({ record: true });
};

const bindRecording = (shortcut: RecordingShortcut, startNote: StartNote) =>
  shortcut === "off"
    ? Promise.resolve(NOOP_BINDING)
    : bindAccelerator(RECORDING_ACCELERATORS[shortcut], () =>
        toggleRecording(startNote),
      );

const releaseLater = (pending: Promise<UnlistenFn>) => () =>
  void pending.then((unbind) => unbind());

export const useGlobalShortcuts = (startNote: StartNote) => {
  const { dictationEnabled, dictationTrigger, recordingShortcut } =
    useSettings();

  useEffect(() => {
    if (!dictationEnabled) return;
    return releaseLater(bindDictation(dictationTrigger));
  }, [dictationEnabled, dictationTrigger]);

  useEffect(
    () => releaseLater(bindRecording(recordingShortcut, startNote)),
    [recordingShortcut, startNote],
  );
};
