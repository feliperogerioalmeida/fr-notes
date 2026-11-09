import type { UnlistenFn } from "@tauri-apps/api/event";
import { detectMeetingApps, type MeetingApp } from "@workspace/core";
import { useEffect } from "react";

import { fetchVisibleEvents } from "@/features/calendar/use-calendar.js";
import type { StartNoteInput } from "@/features/notes/use-start-note.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { endRecording } from "@/features/recording/use-recording-controls.js";
import { getStorage } from "@/lib/database.js";
import {
  listMicrophoneApps,
  onDismissPromptRequest,
  onMicrophoneAppsChanged,
  onStartRecordingRequest,
  readPermissions,
  sendNubPrompt,
  setNubVisible,
} from "@/lib/native.js";

import {
  buildAppPrompt,
  buildReminderPrompt,
  findStartingEvent,
} from "./meeting-rules.js";
import { type MeetingPrompt, useMeetingStore } from "./meeting-store.js";

const AUTO_STOP_GRACE_MS = 20_000;
const REMINDER_INTERVAL_MS = 30_000;

type StartNote = (input: StartNoteInput) => Promise<unknown>;

const loadEvents = async () => {
  const permissions = await readPermissions();
  if (permissions.calendar !== "granted") return [];
  return fetchVisibleEvents().catch(() => []);
};

const isIdle = () => useRecordingStore.getState().phase === "idle";

const presentPrompt = async (prompt: MeetingPrompt) => {
  const { dismissedKeys, prompt: current } = useMeetingStore.getState();
  if (dismissedKeys.has(prompt.key) || current?.key === prompt.key) return;
  useMeetingStore.getState().showPrompt(prompt);
  await setNubVisible(true);
  await sendNubPrompt({ title: prompt.title, subtitle: prompt.subtitle });
};

const withdrawPrompt = async () => {
  if (!useMeetingStore.getState().prompt) return;
  useMeetingStore.getState().clearPrompt();
  await sendNubPrompt(null);
  if (isIdle()) await setNubVisible(false);
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

const handleMeetingApps = async (apps: MeetingApp[], startNote: StartNote) => {
  useMeetingStore.getState().setActiveApps(apps);
  const settings = await (await getStorage()).settings.readSettings();
  const recording = useRecordingStore.getState();
  if (apps.length === 0) {
    await withdrawPrompt();
    const shouldStop =
      recording.phase === "recording" &&
      recording.origin === "detected" &&
      settings.autoStopRecording;
    if (shouldStop) autoStop.schedule();
    return;
  }
  autoStop.cancel();
  if (!isIdle() || settings.meetingDetection === "off") return;
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
  const event = findStartingEvent(await loadEvents(), Date.now());
  if (event) await presentPrompt(buildReminderPrompt(event));
};

const acceptPrompt = async (startNote: StartNote) => {
  const prompt = useMeetingStore.getState().prompt;
  useMeetingStore.getState().clearPrompt();
  await sendNubPrompt(null);
  await startNote({
    event: prompt?.event ?? null,
    record: true,
    origin: prompt?.fromApp ? "detected" : "manual",
  });
};

const dismissPrompt = async () => {
  useMeetingStore.getState().dismissPrompt();
  await sendNubPrompt(null);
  if (isIdle()) await setNubVisible(false);
};

const registerDetection = (startNote: StartNote): Promise<UnlistenFn>[] => [
  onMicrophoneAppsChanged(
    (apps) => void handleMeetingApps(detectMeetingApps(apps), startNote),
  ),
  onStartRecordingRequest(() => void acceptPrompt(startNote)),
  onDismissPromptRequest(() => void dismissPrompt()),
];

export const useMeetingDetection = (startNote: StartNote) => {
  useEffect(() => {
    const pending = registerDetection(startNote);
    void listMicrophoneApps()
      .then((apps) => handleMeetingApps(detectMeetingApps(apps), startNote))
      .catch(() => undefined);
    const reminders = setInterval(
      () => void checkReminders(),
      REMINDER_INTERVAL_MS,
    );
    const unsubscribe = useRecordingStore.subscribe((state, previous) => {
      if (state.phase === "recording" && previous.phase !== "recording") {
        useMeetingStore.getState().clearPrompt();
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
