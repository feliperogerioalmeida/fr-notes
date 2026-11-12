import {
  bindMeetingApps,
  hasMeetingEnded,
  MEETING_END_COUNTDOWN_MS,
  MEETING_END_GRACE_MS,
  type MeetingApp,
} from "@workspace/core";

import { useRecordingStore } from "@/features/recording/recording-store.js";
import { endRecording } from "@/features/recording/use-recording-controls.js";
import { type EndingAction, sendNubEnding } from "@/lib/native.js";

type Timer = ReturnType<typeof setTimeout>;

interface WatcherState {
  boundApps: string[];
  grace: Timer | null;
  countdown: Timer | null;
}

const state: WatcherState = { boundApps: [], grace: null, countdown: null };

const clearTimer = (timer: Timer | null) => {
  if (timer) clearTimeout(timer);
};

export const cancelMeetingEnd = () => {
  clearTimer(state.grace);
  state.grace = null;
  if (!state.countdown) return;
  clearTimer(state.countdown);
  state.countdown = null;
  void sendNubEnding(null);
};

const finishRecording = () => {
  cancelMeetingEnd();
  state.boundApps = [];
  void endRecording();
};

const startCountdown = () => {
  state.grace = null;
  void sendNubEnding({ endsAtMs: Date.now() + MEETING_END_COUNTDOWN_MS });
  state.countdown = setTimeout(finishRecording, MEETING_END_COUNTDOWN_MS);
};

export const beginMeetingWatch = (activeApps: MeetingApp[]) => {
  cancelMeetingEnd();
  state.boundApps = bindMeetingApps([], activeApps);
};

export const resetMeetingWatch = () => {
  cancelMeetingEnd();
  state.boundApps = [];
};

export const watchMeetingEnd = (apps: MeetingApp[], autoStop: boolean) => {
  const recording = useRecordingStore.getState();
  if (recording.phase !== "recording") return;
  if (recording.origin === "detected") {
    state.boundApps = bindMeetingApps(state.boundApps, apps);
  }
  if (!autoStop || !hasMeetingEnded(state.boundApps, apps)) {
    cancelMeetingEnd();
    return;
  }
  if (state.grace || state.countdown) return;
  state.grace = setTimeout(startCountdown, MEETING_END_GRACE_MS);
};

export const handleEndingAction = (action: EndingAction) => {
  if (action === "finish-now") return finishRecording();
  cancelMeetingEnd();
  state.boundApps = [];
};
