import { useUpdateStore } from "@/features/updates/update-store.js";

import {
  usePermissions,
  useSecretsPresence,
  useSettings,
} from "./use-settings.js";

export type SettingsSectionId =
  | "geral"
  | "ditado"
  | "transcricao"
  | "reunioes"
  | "ia"
  | "integracoes"
  | "permissoes"
  | "sobre";

const REQUIRED_PERMISSIONS = ["microphone", "systemAudio", "calendar"] as const;

export const useSettingsAttention = (): Partial<
  Record<SettingsSectionId, boolean>
> => {
  const settings = useSettings();
  const { data: secrets } = useSecretsPresence();
  const { data: permissions } = usePermissions();
  const updateReady = useUpdateStore((state) => state.status === "ready");
  const llmMissing =
    !settings.llmModel.trim() ||
    (settings.llmProvider === "gateway" && !secrets?.llm) ||
    (settings.llmProvider === "openai-compatible" &&
      !settings.llmBaseUrl.trim());
  return {
    transcricao: secrets ? !secrets.deepgram : false,
    ia: secrets ? llmMissing : false,
    permissoes: permissions
      ? REQUIRED_PERMISSIONS.some((key) => permissions[key] !== "granted")
      : false,
    ditado:
      settings.dictationEnabled && permissions
        ? permissions.accessibility !== "granted"
        : false,
    sobre: updateReady,
  };
};
