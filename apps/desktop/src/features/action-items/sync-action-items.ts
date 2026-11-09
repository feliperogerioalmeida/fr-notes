import { getStorage } from "@/lib/database.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const refreshActionItems = () =>
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allActionItems });

export const syncActionItems = async (noteId: string, markdown: string) => {
  await (await getStorage()).actionItems.syncFromMarkdown({ noteId, markdown });
  await refreshActionItems();
};
