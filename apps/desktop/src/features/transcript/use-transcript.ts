import { useQuery } from "@tanstack/react-query";

import { getStorage } from "@/lib/database.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useTranscriptQuery = (noteId: string) =>
  useQuery({
    queryKey: QUERY_KEYS.transcript(noteId),
    queryFn: async () => (await getStorage()).transcript.listSegments(noteId),
  });
