import { useMutation, useQuery } from "@tanstack/react-query";
import { type ActionItem, setTaskChecked } from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import { refreshActionItems } from "./sync-action-items.js";

export const selectOpenItems = (items: ActionItem[]) =>
  items.filter((item) => !item.done);

export const useNoteActionItems = (noteId: string) =>
  useQuery({
    queryKey: QUERY_KEYS.actionItems(noteId),
    queryFn: async () => (await getStorage()).actionItems.listForNote(noteId),
  });

export const useAllActionItems = () =>
  useQuery({
    queryKey: QUERY_KEYS.allActionItems,
    queryFn: async () => (await getStorage()).actionItems.listAll(),
  });

const toggleDone = async (item: ActionItem) => {
  const storage = await getStorage();
  const done = !item.done;
  await storage.actionItems.setDone({ id: item.id, done });
  const note = await storage.notes.findNote(item.noteId);
  if (note?.enhancedMarkdown) {
    await storage.notes.updateNote({
      id: note.id,
      patch: {
        enhancedMarkdown: setTaskChecked({
          markdown: note.enhancedMarkdown,
          key: item.key,
          done,
        }),
      },
    });
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.note(note.id) });
  }
  await refreshActionItems();
};

export const useToggleActionItem = () =>
  useMutation({ mutationFn: toggleDone });
