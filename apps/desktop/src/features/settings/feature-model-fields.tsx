import {
  FEATURE_LLM_SETTINGS,
  type FeatureLlmProvider,
  type LlmFeature,
  type Settings,
} from "@workspace/core";

import { ModelPicker } from "./model-picker.js";
import { SelectSetting } from "./settings-controls.js";
import { SettingsField } from "./settings-section.js";
import { useSettings, useUpdateSettings } from "./use-settings.js";

const PROVIDER_LABELS: Record<FeatureLlmProvider, string> = {
  same: "O mesmo das notas",
  gateway: "Vercel AI Gateway",
  "openai-compatible": "Ollama ou compatível com OpenAI",
};

const PROVIDER_OPTIONS = (
  Object.entries(PROVIDER_LABELS) as [FeatureLlmProvider, string][]
).map(([value, label]) => ({ value, label }));

interface FeatureModelFieldsProps {
  feature: LlmFeature;
  label: string;
  hint: string;
  modelHint: string;
}

export const FeatureModelFields = ({
  feature,
  label,
  hint,
  modelHint,
}: FeatureModelFieldsProps) => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const keys = FEATURE_LLM_SETTINGS[feature];
  const choice = settings[keys.provider];
  const update = (patch: Partial<Settings>) => updateSettings.mutate(patch);
  return (
    <div className="flex flex-col gap-4">
      <SettingsField label={label} htmlFor={keys.provider} hint={hint}>
        <SelectSetting
          id={keys.provider}
          value={choice}
          options={PROVIDER_OPTIONS}
          onChange={(value) => update({ [keys.provider]: value })}
        />
      </SettingsField>
      {choice !== "same" && (
        <SettingsField label="Modelo" htmlFor={keys.model} hint={modelHint}>
          <ModelPicker
            id={keys.model}
            provider={choice}
            value={settings[keys.model]}
            placeholder="O mesmo modelo das notas desse provedor"
            onChange={(model) => update({ [keys.model]: model })}
          />
        </SettingsField>
      )}
    </div>
  );
};
