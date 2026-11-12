import type { LlmProvider } from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { cn } from "@workspace/ui/lib/utils";
import type { ReactNode } from "react";

import { SECRET_KEYS } from "@/lib/native.js";

import { FeatureModelFields } from "./feature-model-fields.js";
import { ModelPicker } from "./model-picker.js";
import { SecretField } from "./secret-field.js";
import { SelectSetting, TextSetting } from "./settings-controls.js";
import { SettingsField, SettingsSection } from "./settings-section.js";
import { SwitchSetting } from "./switch-setting.js";
import {
  useSecretsPresence,
  useSettings,
  useUpdateSettings,
} from "./use-settings.js";

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  gateway: "Vercel AI Gateway",
  "openai-compatible": "Ollama ou compatível com OpenAI",
};

const PROVIDER_OPTIONS = (
  Object.entries(PROVIDER_LABELS) as [LlmProvider, string][]
).map(([value, label]) => ({ value, label }));

interface ProviderPanelProps {
  provider: LlmProvider;
  active: boolean;
  children: ReactNode;
}

const ProviderPanel = ({ provider, active, children }: ProviderPanelProps) => (
  <div
    className={cn(
      "flex flex-col gap-4 rounded-lg border p-4",
      active && "border-brand/60",
    )}
  >
    <div className="flex items-center gap-2">
      <h3 className="text-body-sm text-heading font-semibold">
        {PROVIDER_LABELS[provider]}
      </h3>
      {active && (
        <Badge className="bg-brand-subtle text-brand border-transparent">
          Em uso
        </Badge>
      )}
    </div>
    {children}
  </div>
);

export const AiSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: secrets } = useSecretsPresence();
  const isActive = (provider: LlmProvider) => settings.llmProvider === provider;
  return (
    <>
      <SettingsSection>
        <SettingsField
          label="Provedor em uso"
          htmlFor="llm-provider"
          hint="As duas configurações ficam salvas, cada uma com a sua chave. Aqui você só escolhe qual o FR Notes usa."
        >
          <SelectSetting
            id="llm-provider"
            value={settings.llmProvider}
            options={PROVIDER_OPTIONS}
            onChange={(llmProvider) => updateSettings.mutate({ llmProvider })}
          />
        </SettingsField>
        <ProviderPanel provider="gateway" active={isActive("gateway")}>
          <SettingsField
            label="Modelo"
            htmlFor="llmGatewayModel"
            hint="A lista vem do catálogo do Gateway, com o preço por milhão de tokens (entrada / saída). Modelos com raciocínio escrevem melhor, mas demoram mais."
          >
            <ModelPicker
              id="llmGatewayModel"
              provider="gateway"
              value={settings.llmGatewayModel}
              placeholder="Escolha um modelo"
              onChange={(llmGatewayModel) =>
                updateSettings.mutate({ llmGatewayModel })
              }
            />
          </SettingsField>
          <SecretField
            secretKey={SECRET_KEYS.llmGateway}
            label="Chave da API"
            isSaved={Boolean(secrets?.llmGateway)}
            hint="Crie em vercel.com → AI Gateway → API Keys."
          />
        </ProviderPanel>
        <ProviderPanel
          provider="openai-compatible"
          active={isActive("openai-compatible")}
        >
          <SettingsField
            label="URL base"
            htmlFor="llmBaseUrl"
            hint="Ex.: https://ollama.seu-servidor.com/v1, http://localhost:11434/v1 ou https://openrouter.ai/api/v1."
          >
            <TextSetting settingKey="llmBaseUrl" placeholder="https://…/v1" />
          </SettingsField>
          <SettingsField
            label="Modelo"
            htmlFor="llmCompatibleModel"
            hint="A lista vem do servidor da URL base. Se ele não listar, digite o nome do modelo (ex.: o que aparece no `ollama list`)."
          >
            <ModelPicker
              id="llmCompatibleModel"
              provider="openai-compatible"
              value={settings.llmCompatibleModel}
              placeholder="Escolha um modelo"
              onChange={(llmCompatibleModel) =>
                updateSettings.mutate({ llmCompatibleModel })
              }
            />
          </SettingsField>
          <SecretField
            secretKey={SECRET_KEYS.llmCompatible}
            label="Chave da API"
            isSaved={Boolean(secrets?.llmCompatible)}
            hint="Opcional para Ollama sem autenticação."
          />
          <SwitchSetting
            settingKey="llmThinking"
            title="Raciocínio do modelo"
            description="Em modelos que “pensam” antes de responder, pode melhorar a qualidade, mas deixa tudo bem mais lento. Mantenha desligado no Ollama."
          />
        </ProviderPanel>
        <SwitchSetting
          settingKey="llmDigestDuringMeeting"
          title="Adiantar as notas durante a reunião"
          description="A cada 10 minutos de conversa, resume a transcrição em segundo plano. Quando a reunião acaba, as notas saem bem mais rápido, principalmente em modelos no seu servidor."
        />
      </SettingsSection>
      <SettingsSection
        title="IA por função"
        description="As notas usam o provedor em uso acima. Perguntar e o ditado podem usar outro modelo, com as mesmas chaves."
      >
        <FeatureModelFields
          feature="ask"
          label="Perguntar e chat da nota"
          hint="Responde perguntas sobre uma reunião ou sobre todas elas."
          modelHint="Um modelo com raciocínio responde melhor perguntas difíceis; um rápido responde em segundos."
        />
        <FeatureModelFields
          feature="dictation"
          label="Ditado"
          hint="Usado quando “Polir com IA” está ligado em Ditado e atalhos. Precisa responder em 1 ou 2 segundos."
          modelHint="Prefira um modelo marcado como rápido e sem raciocínio."
        />
      </SettingsSection>
    </>
  );
};
