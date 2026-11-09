import type { Theme } from "@workspace/core";

import { useTemplatesQuery } from "@/features/templates/use-templates.js";

import { SelectSetting, TextSetting } from "./settings-controls.js";
import { SettingsField, SettingsSection } from "./settings-section.js";
import { useSettings, useUpdateSettings } from "./use-settings.js";

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "dark", label: "Escuro" },
  { value: "light", label: "Claro" },
  { value: "system", label: "Seguir o sistema" },
];

export const ProfileSection = () => (
  <SettingsSection
    title="Sobre você"
    description="Ajuda a IA a saber quem é o “Eu” da transcrição e o contexto do seu trabalho."
  >
    <SettingsField label="Nome" htmlFor="userName">
      <TextSetting settingKey="userName" placeholder="Seu nome" />
    </SettingsField>
    <SettingsField label="Contexto" htmlFor="userBio">
      <TextSetting
        settingKey="userBio"
        multiline
        placeholder="Ex.: Desenvolvedor e fundador da FR Digital. Faço reuniões com clientes para levantar escopo de software."
      />
    </SettingsField>
  </SettingsSection>
);

export const PreferencesSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: templates = [] } = useTemplatesQuery();
  const templateOptions = templates.map((template) => ({
    value: template.id,
    label: template.name,
  }));
  return (
    <SettingsSection title="Preferências">
      <SettingsField label="Template padrão" htmlFor="default-template">
        <SelectSetting
          id="default-template"
          value={settings.defaultTemplateId}
          options={templateOptions}
          onChange={(defaultTemplateId) =>
            updateSettings.mutate({ defaultTemplateId })
          }
        />
      </SettingsField>
      <SettingsField label="Tema" htmlFor="theme">
        <SelectSetting
          id="theme"
          value={settings.theme}
          options={THEME_OPTIONS}
          onChange={(theme) => updateSettings.mutate({ theme })}
        />
      </SettingsField>
    </SettingsSection>
  );
};
