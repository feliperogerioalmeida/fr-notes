import type { UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { detectMeetingApps, type MeetingApp } from "@workspace/core";
import { useEffect } from "react";

import { fetchVisibleEvents } from "@/features/calendar/use-calendar.js";
import type { StartNoteInput } from "@/features/notes/use-start-note.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { endRecording } from "@/features/recording/use-recording-controls.js";
import { getStorage } from "@/lib/database.js";
import {
  listMicrophoneApps,
  onMicrophoneAppsChanged,
  onPromptAction,
  type PromptAction,
  readPermissions,
  sendNubPrompt,
} from "@/lib/native.js";

import {
  buildAppPrompt,
  buildReminderPrompt,
  findUpcomingEvent,
  toNubPrompt,
} from "./meeting-rules.js";
import { type MeetingPrompt, useMeetingStore } from "./meeting-store.js";

const AUTO_STOP_GRACE_MS = 20_000;
const REMINDER_INTERVAL_MS = 15_000;
const DEFAULT_QUIET_MS = 60 * 60_000;

type StartNote = (input: StartNoteInput) => Promise<unknown>;

export const loadEvents = async () => {
  const permissions = await readPermissions();
  if (permissions.calendar !== "granted") return [];
  return fetchVisibleEvents().catch(() => []);
};

const isIdle = () => useRecordingStore.getState().phase === "idle";

const presentPrompt = async (prompt: MeetingPrompt) => {
  const { dismissedKeys, prompt: current } = useMeetingStore.getState();
  if (dismissedKeys.has(prompt.key) || current?.key === prompt.key) return;
  useMeetingStore.getState().showPrompt(prompt);
  await sendNubPrompt(toNubPrompt(prompt));
};

const withdrawPrompt = async () => {
  if (!useMeetingStore.getState().prompt) return;
  useMeetingStore.getState().clearPrompt();
  await sendNubPrompt(null);
};

const createAutoStopTimer = () => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    cancel();
    timer = setTimeout(() => void endRecording(), AUTO_STOP_GRACE_MS);
  };
  return { schedule, cancel };
};

const autoStop = createAutoStopTimer();

const isQuiet = () => useMeetingStore.getState().quietUntilMs > Date.now();

const handleMeetingApps = async (apps: MeetingApp[], startNote: StartNote) => {
  useMeetingStore.getState().setActiveApps(apps);
  const settings = await (await getStorage()).settings.readSettings();
  const recording = useRecordingStore.getState();
  if (apps.length === 0) {
    if (useMeetingStore.getState().prompt?.fromApp) await withdrawPrompt();
    const shouldStop =
      recording.phase === "recording" &&
      recording.origin === "detected" &&
      settings.autoStopRecording;
    if (shouldStop) autoStop.schedule();
    return;
  }
  autoStop.cancel();
  if (!isIdle() || settings.meetingDetection === "off" || isQuiet()) return;
  const prompt = buildAppPrompt(apps, await loadEvents());
  if (settings.meetingDetection === "auto") {
    await startNote({ event: prompt.event, record: true, origin: "detected" });
    return;
  }
  await presentPrompt(prompt);
};

const checkReminders = async () => {
  const settings = await (await getStorage()).settings.readSettings();
  if (!settings.meetingReminders || !isIdle()) return;
  const event = findUpcomingEvent(await loadEvents(), Date.now());
  if (event) await presentPrompt(buildReminderPrompt(event));
};

const startFromPrompt = async (
  prompt: MeetingPrompt,
  startNote: StartNote,
  joined: boolean,
) => {
  useMeetingStore.getState().clearPrompt();
  await sendNubPrompt(null);
  await startNote({
    event: prompt.event,
    record: true,
    origin: prompt.fromApp || joined ? "detected" : "manual",
  });
};

const dismissPrompt = async (prompt: MeetingPrompt) => {
  useMeetingStore
    .getState()
    .silenceAppPromptsUntil(
      prompt.event?.endMs ?? Date.now() + DEFAULT_QUIET_MS,
    );
  useMeetingStore.getState().dismissPrompt();
  await sendNubPrompt(null);
};

const handlePromptAction = async (
  action: PromptAction,
  startNote: StartNote,
) => {
  const prompt = useMeetingStore.getState().prompt;
  if (!prompt) return;
  const joins = action === "join" || action === "join-and-record";
  if (joins && prompt.joinUrl) await openUrl(prompt.joinUrl);
  if (action === "join-and-record" || action === "record") {
    await startFromPrompt(prompt, startNote, joins);
    return;
  }
  await dismissPrompt(prompt);
};

const registerDetection = (startNote: StartNote): Promise<UnlistenFn>[] => [
  onMicrophoneAppsChanged(
    (apps) => void handleMeetingApps(detectMeetingApps(apps), startNote),
  ),
  onPromptAction((action) => void handlePromptAction(action, startNote)),
];

export const useMeetingDetection = (startNote: StartNote) => {
  useEffect(() => {
    const pending = registerDetection(startNote);
    void listMicrophoneApps()
      .then((apps) => handleMeetingApps(detectMeetingApps(apps), startNote))
      .catch(() => undefined);
    void checkReminders();
    const reminders = setInterval(
      () => void checkReminders(),
      REMINDER_INTERVAL_MS,
    );
    const unsubscribe = useRecordingStore.subscribe((state, previous) => {
      if (state.phase === "recording" && previous.phase !== "recording") {
        useMeetingStore.getState().clearPrompt();
        void sendNubPrompt(null);
      }
    });
    return () => {
      clearInterval(reminders);
      unsubscribe();
      void Promise.all(pending).then((handles) =>
        handles.forEach((unlisten) => unlisten()),
      );
    };
  }, [startNote]);
};
