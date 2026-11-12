import { type ImportedTranscript, importTranscript } from "@workspace/core";

import { runEnhancement } from "@/features/enhance/run-enhancement.js";
import { getStorage } from "@/lib/database.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const DEFAULT_TITLE = "Transcrição importada";
const FILE_EXTENSION = /\.(txt|md|markdown)$/i;

export interface TranscriptInput {
  text: string;
  fileName: string | null;
}

export interface TranscriptPreview {
  source: TranscriptInput;
  transcript: ImportedTranscript;
}

export const previewTranscript = (
  source: TranscriptInput,
  userName: string,
): TranscriptPreview => ({
  source,
  transcript: importTranscript({
    text: source.text,
    selfNames: [userName].filter(Boolean),
    fallbackTitle: source.fileName?.replace(FILE_EXTENSION, "") ?? null,
  }),
});

const toIso = (ms: number) => new Date(ms).toISOString();

const saveImportedNote = async ({ transcript }: TranscriptPreview) => {
  const storage = await getStorage();
  const note = await storage.notes.createNote({
    title: transcript.title ?? DEFAULT_TITLE,
    participants: transcript.participants,
  });
  await storage.transcript.replaceSegments(note.id, transcript.segments);
  await storage.notes.updateNote({
    id: note.id,
    patch: {
      speakerNames: transcript.speakerNames,
      status: "done",
      recordingStartedAt: toIso(transcript.startedAtMs),
      recordingEndedAt: toIso(transcript.endedAtMs),
    },
  });
  return note.id;
};

export const saveImportedNotes = async (previews: TranscriptPreview[]) => {
  const noteIds: string[] = [];
  for (const preview of previews) {
    noteIds.push(await saveImportedNote(preview));
  }
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes });
  return noteIds;
};

export const enhanceInOrder = async (noteIds: string[]) => {
  const failures: unknown[] = [];
  for (const noteId of noteIds) {
    await runEnhancement({ noteId }).catch((error: unknown) => {
      failures.push(error);
    });
  }
  return failures;
};
