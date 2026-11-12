import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, type Settings } from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import {
  checkSecret,
  readPermissions,
  removeSecret,
  SECRET_KEYS,
  type SecretKey,
  writeSecret,
} from "@/lib/native.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useSettingsQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.settings,
    queryFn: async () => (await getStorage()).settings.readSettings(),
    placeholderData: DEFAULT_SETTINGS,
  });

export const useSettings = (): Settings =>
  useSettingsQuery().data ?? DEFAULT_SETTINGS;

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Settings>) =>
      (await getStorage()).settings.writeSettings(patch),
    onMutate: (patch) =>
      queryClient.setQueryData<Settings>(QUERY_KEYS.settings, (current) => ({
        ...(current ?? DEFAULT_SETTINGS),
        ...patch,
      })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings }),
  });
};

const readSecretPresence = async () => ({
  deepgram: await checkSecret(SECRET_KEYS.deepgram),
  llmGateway: await checkSecret(SECRET_KEYS.llmGateway),
  llmCompatible: await checkSecret(SECRET_KEYS.llmCompatible),
});

export const useSecretsPresence = () =>
  useQuery({ queryKey: QUERY_KEYS.secrets, queryFn: readSecretPresence });

interface SaveSecretInput {
  key: SecretKey;
  value: string;
}

export const useSaveSecret = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: SaveSecretInput) =>
      value.trim() ? writeSecret(key, value.trim()) : removeSecret(key),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.secrets }),
  });
};

const PERMISSIONS_REFRESH_MS = 3000;

export const usePermissions = () =>
  useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: readPermissions,
    refetchInterval: PERMISSIONS_REFRESH_MS,
  });
