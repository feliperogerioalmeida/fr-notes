import { buildLiveTranscript } from "@workspace/core";
import { useEffect } from "react";

import { useNoteQuery } from "@/features/notes/use-notes.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { useTranscriptQuery } from "@/features/transcript/use-transcript.js";
import { sendNubTranscript } from "@/lib/native.js";

export const useNubTranscriptFeed = () => {
  const noteId = useRecordingStore((state) => state.noteId);
  const isRecording = useRecordingStore((state) => state.phase === "recording");
  const interim = useRecordingStore((state) => state.interim);
  const { data: segments } = useTranscriptQuery(isRecording ? noteId : null);
  const { data: note } = useNoteQuery(
    isRecording ? (noteId ?? undefined) : undefined,
  );
  const speakerNames = note?.speakerNames;
  useEffect(() => {
    if (!isRecording) return;
    void sendNubTranscript(
      buildLiveTranscript({
        segments: segments ?? [],
        interim: Object.values(interim),
        speakerNames,
      }),
    );
  }, [isRecording, segments, interim, speakerNames]);
};
