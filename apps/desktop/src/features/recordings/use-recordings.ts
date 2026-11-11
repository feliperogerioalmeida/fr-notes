import { useMutation, useQuery } from "@tanstack/react-query";
import type { TranscriptSource } from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { listRecordings, retranscribeRecordings } from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const recordingsKey = (noteId: string) => ["recordings", noteId] as const;

export const useRecordingsQuery = (noteId: string) =>
  useQuery({
    queryKey: recordingsKey(noteId),
    queryFn: () => listRecordings(noteId),
  });

const retranscribe = async (noteId: string) => {
  const storage = await getStorage();
  const settings = await storage.settings.readSettings();
  const segments = await retranscribeRecordings({
    noteId,
    language: settings.transcriptionLanguage,
    keyterms: settings.keyterms,
  });
  const replaced = await storage.transcript.replaceSegments(
    noteId,
    segments.map((segment) => ({
      source: segment.source as TranscriptSource,
      text: segment.text,
      startMs: segment.startMs,
      endMs: segment.endMs,
      speaker: segment.speaker,
    })),
  );
  await storage.digests.clearDigests(noteId);
  await storage.notes.updateNote({ id: noteId, patch: { speakerNames: {} } });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcript(noteId) }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(noteId) }),
  ]);
  return replaced;
};

export const useRetranscribe = () => useMutation({ mutationFn: retranscribe });
