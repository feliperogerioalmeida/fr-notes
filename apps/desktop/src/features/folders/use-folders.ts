import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFolderInput } from "@workspace/core";

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
    mutationFn: async (input: CreateFolderInput) =>
      (await getStorage()).folders.createFolder(input),
    onSuccess: invalidate,
  });
};

export const useRenameFolder = () => {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) =>
      (await getStorage()).folders.renameFolder(input),
    onSuccess: invalidate,
  });
};

export const useMoveFolder = () => {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: async (input: { id: string; parentId: string | null }) =>
      (await getStorage()).folders.moveFolder(input),
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
