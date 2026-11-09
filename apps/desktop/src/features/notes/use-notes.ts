import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateNoteInput,
  ListNotesInput,
  Note,
  NotePatch,
} from "@workspace/core";

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
    mutationFn: async (input: UpdateNoteInput) =>
      (await getStorage()).notes.updateNote(input),
    onMutate: ({ id, patch }) =>
      queryClient.setQueryData<Note | null>(QUERY_KEYS.note(id), (note) =>
        applyPatch(note, patch),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
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
