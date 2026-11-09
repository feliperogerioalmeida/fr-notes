import { nowIso } from "@workspace/core";
import { useCallback } from "react";
import { toast } from "sonner";

import { runEnhancement } from "@/features/enhance/run-enhancement.js";
import { dispatchNoteEvent } from "@/features/integrations/deliver-webhooks.js";
import { getStorage } from "@/lib/database.js";
import { describeError } from "@/lib/errors.js";
import { setNubVisible, startRecording, stopRecording } from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import { resetEchoFilter } from "./echo-filter.js";
import { type RecordingOrigin, useRecordingStore } from "./recording-store.js";

const refreshNote = (noteId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(noteId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
  ]);

export const beginRecording = async (
  noteId: string,
  origin: RecordingOrigin = "manual",
): Promise<void> => {
  const store = useRecordingStore.getState();
  if (store.phase !== "idle") return;
  store.setPhase("starting");
  resetEchoFilter();
  try {
    const storage = await getStorage();
    const settings = await storage.settings.readSettings();
    const note = await storage.notes.findNote(noteId);
    const session = await startRecording({
      noteId,
      language: settings.transcriptionLanguage,
      keyterms: settings.keyterms,
      captureSystemAudio: settings.captureSystemAudio,
      echoCancellation: settings.echoCancellation,
    });
    await storage.notes.updateNote({
      id: noteId,
      patch: {
        status: "recording",
        recordingStartedAt: note?.recordingStartedAt ?? nowIso(),
      },
    });
    store.markRecording({ noteId, startedAtMs: session.startedAtMs, origin });
    await setNubVisible(true);
    await refreshNote(noteId);
  } catch (error) {
    store.markIdle();
    toast.error(describeError(error));
  }
};

const enhanceAfterRecording = async (noteId: string) => {
  try {
    await runEnhancement({ noteId });
  } catch (error) {
    toast.message("Gravação salva", { description: describeError(error) });
  }
};

export const endRecording = async (): Promise<void> => {
  const store = useRecordingStore.getState();
  const { noteId } = store;
  if (!noteId || store.phase !== "recording") return;
  store.setPhase("stopping");
  try {
    await stopRecording();
    const storage = await getStorage();
    await storage.notes.updateNote({
      id: noteId,
      patch: { status: "done", recordingEndedAt: nowIso() },
    });
    void dispatchNoteEvent({ noteId, event: "note.completed" });
  } catch (error) {
    toast.error(describeError(error));
  } finally {
    store.markIdle();
    await refreshNote(noteId);
  }
  await enhanceAfterRecording(noteId);
};

export const useRecordingControls = (noteId: string) => {
  const start = useCallback(() => beginRecording(noteId), [noteId]);
  const stop = useCallback(() => endRecording(), []);
  return { start, stop };
};
