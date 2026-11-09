import { useCallback } from "react";
import { useNavigate } from "react-router";

import type { RecordingOrigin } from "@/features/recording/recording-store.js";
import { beginRecording } from "@/features/recording/use-recording-controls.js";

import { prepareNote, type PrepareNoteInput } from "./start-note.js";

export interface StartNoteInput extends PrepareNoteInput {
  record?: boolean;
  origin?: RecordingOrigin;
}

export const useStartNote = () => {
  const navigate = useNavigate();
  return useCallback(
    async ({
      record = false,
      origin = "manual",
      ...input
    }: StartNoteInput = {}) => {
      const note = await prepareNote(input);
      navigate(`/notes/${note.id}`);
      if (record) await beginRecording(note.id, origin);
      return note;
    },
    [navigate],
  );
};
