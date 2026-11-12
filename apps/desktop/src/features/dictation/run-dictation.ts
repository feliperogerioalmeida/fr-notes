import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import {
  buildDictationCleanupPrompt,
  DICTATION_CLEANUP_PROMPT,
  resolveFeatureLlm,
  type Settings,
} from "@workspace/core";
import { toast } from "sonner";

import { getStorage } from "@/lib/database.js";
import { describeError, readErrorCode } from "@/lib/errors.js";
import { streamCompletion } from "@/lib/llm.js";
import {
  ACCESSIBILITY_REQUIRED_ERROR,
  cancelDictation,
  type DictationTargetApp,
  hideDictationPill,
  insertText,
  requestAccessibilityPermission,
  startDictation,
  stopDictation,
} from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import { useDictationStore } from "./dictation-store.js";

const ESCAPE_SHORTCUT = "Escape";
const POLISH_TIMEOUT_MS = 8_000;

const readSettings = async () => (await getStorage()).settings.readSettings();

const listenForEscape = () =>
  register(ESCAPE_SHORTCUT, (event) => {
    if (event.state === "Pressed") void abortDictation();
  }).catch(() => undefined);

const stopListeningForEscape = () =>
  unregister(ESCAPE_SHORTCUT).catch(() => undefined);

const finishSilently = async () => {
  useDictationStore.getState().reset();
  await stopListeningForEscape();
  await hideDictationPill().catch(() => undefined);
};

export const beginDictation = async (): Promise<void> => {
  const store = useDictationStore.getState();
  if (store.phase !== "idle") return;
  store.setPhase("listening");
  try {
    const settings = await readSettings();
    await startDictation({
      language: settings.transcriptionLanguage,
      keyterms: settings.keyterms,
    });
    await listenForEscape();
  } catch (error) {
    await finishSilently();
    toast.error(describeError(error));
  }
};

interface PolishInput {
  text: string;
  targetApp: DictationTargetApp | null;
  settings: Settings;
}

const polish = async ({ text, targetApp, settings }: PolishInput) => {
  if (!settings.dictationPolish) return { text, polished: false };
  try {
    const polished = await streamCompletion({
      settings: resolveFeatureLlm(settings, "dictation"),
      instructions: DICTATION_CLEANUP_PROMPT,
      messages: [
        {
          role: "user",
          content: buildDictationCleanupPrompt({
            text,
            targetAppName: targetApp?.name ?? null,
          }),
        },
      ],
      signal: AbortSignal.timeout(POLISH_TIMEOUT_MS),
      onText: () => undefined,
    });
    const cleaned = polished.trim();
    return cleaned
      ? { text: cleaned, polished: true }
      : { text, polished: false };
  } catch {
    return { text, polished: false };
  }
};

const offerAccessibility = () =>
  toast.error(describeError(ACCESSIBILITY_REQUIRED_ERROR), {
    description: "O texto ficou salvo em Ditados.",
    action: {
      label: "Permitir",
      onClick: () => void requestAccessibilityPermission(),
    },
  });

const typeIntoTargetApp = async (text: string): Promise<boolean> => {
  try {
    await insertText(text);
    return true;
  } catch (error) {
    if (readErrorCode(error) === ACCESSIBILITY_REQUIRED_ERROR) {
      offerAccessibility();
      return false;
    }
    toast.error(describeError(error));
    return false;
  }
};

const saveDictation = async (input: {
  text: string;
  rawText: string;
  polished: boolean;
  inserted: boolean;
  targetApp: DictationTargetApp | null;
}) => {
  await (
    await getStorage()
  ).dictations.appendDictation({
    text: input.text,
    rawText: input.rawText,
    polished: input.polished,
    inserted: input.inserted,
    targetAppName: input.targetApp?.name ?? null,
    targetAppBundleId: input.targetApp?.bundleId ?? null,
  });
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dictations });
};

export const finishDictation = async (): Promise<void> => {
  const store = useDictationStore.getState();
  if (store.phase !== "listening") return;
  store.setPhase("processing");
  await stopListeningForEscape();
  try {
    const result = await stopDictation();
    const rawText = result.text.trim();
    if (!rawText) return;
    const settings = await readSettings();
    const { text, polished } = await polish({
      text: rawText,
      targetApp: result.targetApp,
      settings,
    });
    const inserted = await typeIntoTargetApp(text);
    await saveDictation({
      text,
      rawText,
      polished,
      inserted,
      targetApp: result.targetApp,
    });
  } catch (error) {
    toast.error(describeError(error));
  } finally {
    await finishSilently();
  }
};

export const abortDictation = async (): Promise<void> => {
  if (useDictationStore.getState().phase === "idle") return;
  await cancelDictation().catch(() => undefined);
  await finishSilently();
};
