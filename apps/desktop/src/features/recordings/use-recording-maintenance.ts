import { type Note, nowIso } from "@workspace/core";
import { useEffect } from "react";
import { toast } from "sonner";

import { beginRecording } from "@/features/recording/use-recording-controls.js";
import { getStorage } from "@/lib/database.js";
import { cleanupRecordings, readRecordingStatus } from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const announceInterrupted = (note: Note) =>
  toast.message(
    `A gravação de “${note.title || "Sem título"}” foi interrompida`,
    {
      description: "O que foi gravado até ali está salvo na nota.",
      duration: Infinity,
      action: {
        label: "Continuar gravando",
        onClick: () => void beginRecording(note.id),
      },
    },
  );

const closeInterruptedRecordings = async () => {
  const status = await readRecordingStatus();
  if (status.isRecording) return;
  const storage = await getStorage();
  const interrupted = (await storage.notes.listNotes()).filter(
    (note) => note.status === "recording",
  );
  for (const note of interrupted) {
    const lastSegment = (await storage.transcript.listSegments(note.id)).at(-1);
    await storage.notes.updateNote({
      id: note.id,
      patch: {
        status: "done",
        recordingEndedAt: lastSegment
          ? new Date(lastSegment.endMs).toISOString()
          : nowIso(),
      },
    });
    announceInterrupted(note);
  }
  if (interrupted.length > 0) {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes });
  }
};

const removeOldRecordings = async () => {
  const settings = await (await getStorage()).settings.readSettings();
  if (settings.audioRetentionDays > 0) {
    await cleanupRecordings(settings.audioRetentionDays);
  }
};

export const useRecordingMaintenance = () => {
  useEffect(() => {
    void closeInterruptedRecordings().catch((error) =>
      console.info("interrupted recordings check failed", error),
    );
    void removeOldRecordings().catch((error) =>
      console.info("old recordings cleanup failed", error),
    );
  }, []);
};
