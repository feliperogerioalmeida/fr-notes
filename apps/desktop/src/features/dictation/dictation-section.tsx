import type {
  DictationLlmProvider,
  DictationTrigger,
  RecordingShortcut,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ShieldAlert } from "lucide-react";

import {
  SelectSetting,
  TextSetting,
} from "@/features/settings/settings-controls.js";
import {
  SettingsField,
  SettingsSection,
} from "@/features/settings/settings-section.js";
import { SwitchSetting } from "@/features/settings/switch-setting.js";
import {
  usePermissions,
  useSettings,
  useUpdateSettings,
} from "@/features/settings/use-settings.js";
import {
  openPrivacySettings,
  requestAccessibilityPermission,
} from "@/lib/native.js";

import {
  DICTATION_TRIGGER_LABELS,
  RECORDING_SHORTCUT_LABELS,
} from "./shortcuts.js";

const toOptions = <Value extends string>(labels: Record<Value, string>) =>
  (Object.keys(labels) as Value[]).map((value) => ({
    value,
    label: labels[value],
  }));

const FN_HINT =
  "Em Ajustes do Sistema → Teclado, deixe “Pressionar a tecla 🌐 para” como “Não fazer nada”.";

const askAccessibility = async () => {
  const granted = await requestAccessibilityPermission();
  if (!granted) await openPrivacySettings("accessibility");
};

const AccessibilityCallout = () => {
  const { data: permissions } = usePermissions();
  if (!permissions || permissions.accessibility === "granted") return null;
  return (
    <div className="bg-warning-subtle text-warning-foreground flex items-center gap-3 rounded-md px-4 py-3">
      <ShieldAlert className="size-4 shrink-0" />
      <p className="text-body-sm flex-1">
        Para digitar nos outros apps, o FR Notes precisa da permissão de
        Acessibilidade.
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void askAccessibility()}
      >
        Permitir
      </Button>
    </div>
  );
};

const DICTATION_PROVIDER_LABELS: Record<DictationLlmProvider, string> = {
  same: "O mesmo das notas",
  gateway: "Vercel AI Gateway",
  "openai-compatible": "Ollama ou compatível com OpenAI",
};

const DictationModelFields = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const isSeparate = settings.dictationLlmProvider !== "same";
  return (
    <>
      <SettingsField
        label="IA do ditado"
        htmlFor="dictation-llm-provider"
        hint="O ditado precisa de resposta rápida. Um modelo pequeno, separado do das notas, deixa o texto pronto em menos tempo. A chave é a mesma configurada em IA."
      >
        <SelectSetting
          id="dictation-llm-provider"
          value={settings.dictationLlmProvider}
          options={toOptions<DictationLlmProvider>(DICTATION_PROVIDER_LABELS)}
          onChange={(dictationLlmProvider) =>
            updateSettings.mutate({ dictationLlmProvider })
          }
        />
      </SettingsField>
      {isSeparate && (
        <SettingsField
          label="Modelo do ditado"
          htmlFor="dictationLlmModel"
          hint="Vazio usa o modelo das notas desse provedor."
        >
          <TextSetting
            settingKey="dictationLlmModel"
            placeholder={
              settings.dictationLlmProvider === "gateway"
                ? "provedor/modelo"
                : "Nome do modelo"
            }
          />
        </SettingsField>
      )}
    </>
  );
};

export const DictationSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  return (
    <>
      <AccessibilityCallout />
      <SettingsSection title="Ditado por voz">
        <SwitchSetting
          settingKey="dictationEnabled"
          title="Ditar em qualquer app"
          description="Fale e o texto aparece onde o cursor estiver: e-mail, Slack, WhatsApp, editor de código…"
        />
        <SettingsField
          label="Tecla do ditado"
          htmlFor="dictation-trigger"
          hint={
            settings.dictationTrigger === "fn"
              ? `Toque rápido mantém o microfone aberto; Esc cancela. ${FN_HINT}`
              : "Toque rápido mantém o microfone aberto; Esc cancela."
          }
        >
          <SelectSetting
            id="dictation-trigger"
            value={settings.dictationTrigger}
            options={toOptions<DictationTrigger>(DICTATION_TRIGGER_LABELS)}
            onChange={(dictationTrigger) =>
              updateSettings.mutate({ dictationTrigger })
            }
          />
        </SettingsField>
        <SwitchSetting
          settingKey="dictationPolish"
          title="Polir com IA"
          description="Tira vícios de fala, corrige pontuação e aplica comandos como “nova linha”."
        />
        {settings.dictationPolish && <DictationModelFields />}
      </SettingsSection>
      <SettingsSection title="Atalhos globais">
        <SettingsField
          label="Começar ou parar a gravação de uma reunião"
          htmlFor="recording-shortcut"
          hint="Funciona com o FR Notes em segundo plano."
        >
          <SelectSetting
            id="recording-shortcut"
            value={settings.recordingShortcut}
            options={toOptions<RecordingShortcut>(RECORDING_SHORTCUT_LABELS)}
            onChange={(recordingShortcut) =>
              updateSettings.mutate({ recordingShortcut })
            }
          />
        </SettingsField>
      </SettingsSection>
    </>
  );
};
