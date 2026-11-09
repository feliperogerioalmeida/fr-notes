import type { LiveSegmentEvent, TranscriptSource } from "@workspace/core";
import { create } from "zustand";

import type { RecordingLevels } from "@/lib/native.js";

export type RecordingPhase = "idle" | "starting" | "recording" | "stopping";

export type RecordingOrigin = "manual" | "detected";

interface RecordingState {
  phase: RecordingPhase;
  noteId: string | null;
  startedAtMs: number | null;
  origin: RecordingOrigin;
  levels: RecordingLevels;
  interim: Record<TranscriptSource, LiveSegmentEvent | null>;
  setPhase: (phase: RecordingPhase) => void;
  markRecording: (session: RecordingSession) => void;
  markIdle: () => void;
  setLevels: (levels: RecordingLevels) => void;
  setInterim: (
    segment: LiveSegmentEvent | null,
    source: TranscriptSource,
  ) => void;
}

interface RecordingSession {
  noteId: string;
  startedAtMs: number;
  origin?: RecordingOrigin;
}

const SILENT_LEVELS: RecordingLevels = { microphone: 0, system: 0 };

const EMPTY_INTERIM: RecordingState["interim"] = {
  microphone: null,
  system: null,
};

export const useRecordingStore = create<RecordingState>((set) => ({
  phase: "idle",
  noteId: null,
  startedAtMs: null,
  origin: "manual",
  levels: SILENT_LEVELS,
  interim: EMPTY_INTERIM,
  setPhase: (phase) => set({ phase }),
  markRecording: ({ noteId, startedAtMs, origin = "manual" }) =>
    set({ phase: "recording", noteId, startedAtMs, origin }),
  markIdle: () =>
    set({
      phase: "idle",
      noteId: null,
      startedAtMs: null,
      origin: "manual",
      levels: SILENT_LEVELS,
      interim: EMPTY_INTERIM,
    }),
  setLevels: (levels) => set({ levels }),
  setInterim: (segment, source) =>
    set((state) => ({ interim: { ...state.interim, [source]: segment } })),
}));

export const selectIsRecordingNote =
  (noteId: string) => (state: RecordingState) =>
    state.noteId === noteId && state.phase !== "idle";
