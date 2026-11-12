import { useEffect } from "react";

import {
  checkSecret,
  readSecret,
  removeSecret,
  SECRET_KEYS,
  writeSecret,
} from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const GATEWAY_KEY_PREFIX = "vck_";

const pickTarget = (value: string) =>
  value.startsWith(GATEWAY_KEY_PREFIX)
    ? SECRET_KEYS.llmGateway
    : SECRET_KEYS.llmCompatible;

export const migrateLegacyLlmSecret = async (): Promise<boolean> => {
  const legacy = await readSecret(SECRET_KEYS.legacyLlm);
  if (!legacy) return false;
  const target = pickTarget(legacy);
  if (!(await checkSecret(target))) await writeSecret(target, legacy);
  await removeSecret(SECRET_KEYS.legacyLlm);
  return true;
};

export const useLlmSecretMigration = () => {
  useEffect(() => {
    void migrateLegacyLlmSecret()
      .then((migrated) => {
        if (!migrated) return;
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.secrets });
      })
      .catch(() => undefined);
  }, []);
};
