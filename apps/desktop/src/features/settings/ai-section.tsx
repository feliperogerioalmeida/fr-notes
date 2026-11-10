import type { LlmProvider } from "@workspace/core";

import { SECRET_KEYS } from "@/lib/native.js";

import { SecretField } from "./secret-field.js";
import { SelectSetting, TextSetting } from "./settings-controls.js";
import { SettingsField, SettingsSection } from "./settings-section.js";
import { SwitchSetting } from "./switch-setting.js";
import {
  useSecretsPresence,
  useSettings,
  useUpdateSettings,
} from "./use-settings.js";

const PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: "gateway", label: "Vercel AI Gateway" },
  {
    value: "openai-compatible",
    label: "Compatível com OpenAI (OpenRouter, Ollama, Groq…)",
  },
];

const MODEL_HINTS: Record<LlmProvider, string> = {
  gateway:
    "Use o ID do catálogo do Gateway, no formato provedor/modelo. A lista está em vercel.com/ai-gateway/models.",
  "openai-compatible":
    "Use o nome do modelo como o provedor espera (ex.: o nome que aparece no `ollama list`).",
};

export const AiSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: secrets } = useSecretsPresence();
  const isCompatible = settings.llmProvider === "openai-compatible";
  return (
    <SettingsSection>
      <SettingsField label="Provedor" htmlFor="llm-provider">
        <SelectSetting
          id="llm-provider"
          value={settings.llmProvider}
          options={PROVIDER_OPTIONS}
          onChange={(llmProvider) => updateSettings.mutate({ llmProvider })}
        />
      </SettingsField>
      {isCompatible && (
        <SettingsField
          label="URL base"
          htmlFor="llmBaseUrl"
          hint="Ex.: https://openrouter.ai/api/v1 ou http://localhost:11434/v1 (Ollama local ou no seu VPS)."
        >
          <TextSetting settingKey="llmBaseUrl" placeholder="https://…/v1" />
        </SettingsField>
      )}
      <SettingsField
        label="Modelo"
        htmlFor="llmModel"
        hint={MODEL_HINTS[settings.llmProvider]}
      >
        <TextSetting settingKey="llmModel" placeholder="Escolha um modelo" />
      </SettingsField>
      <SecretField
        secretKey={SECRET_KEYS.llm}
        label="Chave da API"
        isSaved={Boolean(secrets?.llm)}
        hint={
          isCompatible
            ? "Opcional para Ollama sem autenticação."
            : "Crie em vercel.com → AI Gateway → API Keys."
        }
      />
      {isCompatible && (
        <SwitchSetting
          settingKey="llmThinking"
          title="Raciocínio do modelo"
          description="Em modelos que “pensam” antes de responder, pode melhorar a qualidade, mas deixa tudo bem mais lento. Mantenha desligado no Ollama."
        />
      )}
    </SettingsSection>
  );
};
