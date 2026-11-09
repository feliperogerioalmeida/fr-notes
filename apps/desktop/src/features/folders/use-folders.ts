import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getStorage } from "@/lib/database.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useFoldersQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.folders,
    queryFn: async () => (await getStorage()).folders.listFolders(),
  });

const useInvalidateFolders = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes }),
    ]);
};

export const useCreateFolder = () => {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: async (name: string) =>
      (await getStorage()).folders.createFolder(name),
    onSuccess: invalidate,
  });
};

export const useDeleteFolder = () => {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: async (id: string) =>
      (await getStorage()).folders.deleteFolder(id),
    onSuccess: invalidate,
  });
};
