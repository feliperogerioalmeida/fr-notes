import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TemplateInput } from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useTemplatesQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.templates,
    queryFn: async () => (await getStorage()).templates.listTemplates(),
  });

interface SaveTemplateInput {
  id: string | null;
  input: TemplateInput;
}

const persistTemplate = async ({ id, input }: SaveTemplateInput) => {
  const { templates } = await getStorage();
  if (!id) return templates.createTemplate(input);
  await templates.updateTemplate({ id, input });
  return id;
};

export const useSaveTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: persistTemplate,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates }),
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await getStorage()).templates.deleteTemplate(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates }),
  });
};
