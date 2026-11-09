import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getStorage } from "@/lib/database.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useDictationsQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.dictations,
    queryFn: async () => (await getStorage()).dictations.listDictations(),
  });

export const useDeleteDictation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await getStorage()).dictations.deleteDictation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dictations }),
  });
};
