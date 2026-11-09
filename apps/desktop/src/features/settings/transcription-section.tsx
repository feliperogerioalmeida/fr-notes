import type { TranscriptionLanguage } from "@workspace/core";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { useEffect, useState } from "react";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback.js";
import { SECRET_KEYS } from "@/lib/native.js";

import { SecretField } from "./secret-field.js";
import { SelectSetting } from "./settings-controls.js";
import { SettingsField, SettingsSection } from "./settings-section.js";
import { SwitchSetting } from "./switch-setting.js";
import {
  useSecretsPresence,
  useSettings,
  useUpdateSettings,
} from "./use-settings.js";

const LANGUAGE_OPTIONS: { value: TranscriptionLanguage; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "Inglês" },
  { value: "multi", label: "Multilíngue (alterna idiomas)" },
];

const SAVE_DELAY_MS = 600;

const parseKeyterms = (raw: string) =>
  raw
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter(Boolean);

const KeytermsField = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [raw, setRaw] = useState(settings.keyterms.join(", "));
  useEffect(() => setRaw(settings.keyterms.join(", ")), [settings.keyterms]);
  const save = useDebouncedCallback(
    (next: string) => updateSettings.mutate({ keyterms: parseKeyterms(next) }),
    SAVE_DELAY_MS,
  );
  return (
    <SettingsField
      label="Vocabulário"
      htmlFor="keyterms"
      hint="Nomes, empresas e termos técnicos que a transcrição deve reconhecer. Separe por vírgula."
    >
      <Textarea
        id="keyterms"
        rows={2}
        value={raw}
        placeholder="FR Digital, Tauri, Supabase…"
        onChange={(event) => {
          setRaw(event.target.value);
          save(event.target.value);
        }}
      />
    </SettingsField>
  );
};

export const TranscriptionSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: secrets } = useSecretsPresence();
  return (
    <SettingsSection>
      <SecretField
        secretKey={SECRET_KEYS.deepgram}
        label="Chave da Deepgram"
        isSaved={Boolean(secrets?.deepgram)}
        hint="Crie em console.deepgram.com → API Keys. Fica guardada no Keychain do macOS."
      />
      <SettingsField label="Idioma da reunião" htmlFor="language">
        <SelectSetting
          id="language"
          value={settings.transcriptionLanguage}
          options={LANGUAGE_OPTIONS}
          onChange={(transcriptionLanguage) =>
            updateSettings.mutate({ transcriptionLanguage })
          }
        />
      </SettingsField>
      <SwitchSetting
        settingKey="captureSystemAudio"
        title="Capturar áudio do computador"
        description="Transcreve os outros participantes em chamadas online."
      />
      <SwitchSetting
        settingKey="echoCancellation"
        title="Cancelamento de eco"
        description="Remove do microfone o som que sai das caixas, para usar sem fone."
      />
      <KeytermsField />
    </SettingsSection>
  );
};
