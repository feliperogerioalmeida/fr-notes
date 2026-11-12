import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateNoteInput,
  ListNotesInput,
  Note,
  NotePatch,
  RescheduleNoteInput,
} from "@workspace/core";

import { syncActionItems } from "@/features/action-items/sync-action-items.js";
import { getStorage } from "@/lib/database.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useNotesQuery = (filters: ListNotesInput = {}) =>
  useQuery({
    queryKey: QUERY_KEYS.notes(filters),
    queryFn: async () => (await getStorage()).notes.listNotes(filters),
  });

export const useNoteQuery = (noteId: string | undefined) =>
  useQuery({
    queryKey: QUERY_KEYS.note(noteId ?? ""),
    queryFn: async () => (await getStorage()).notes.findNote(noteId ?? ""),
    enabled: Boolean(noteId),
  });

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateNoteInput = {}) =>
      (await getStorage()).notes.createNote(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
  });
};

interface UpdateNoteInput {
  id: string;
  patch: NotePatch;
}

const applyPatch = (note: Note | null | undefined, patch: NotePatch) =>
  note ? { ...note, ...patch } : note;

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateNoteInput) => {
      await (await getStorage()).notes.updateNote(input);
      const markdown = input.patch.enhancedMarkdown;
      if (typeof markdown === "string")
        await syncActionItems(input.id, markdown);
    },
    onMutate: ({ id, patch }) =>
      queryClient.setQueryData<Note | null>(QUERY_KEYS.note(id), (note) =>
        applyPatch(note, patch),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
  });
};

export const useRescheduleNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RescheduleNoteInput) =>
      (await getStorage()).notes.rescheduleNote(input),
    onSettled: (_data, _error, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transcript(id) }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
      ]),
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await getStorage()).notes.deleteNote(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
  });
};
