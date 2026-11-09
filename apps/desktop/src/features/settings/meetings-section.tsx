import type { MeetingDetectionMode } from "@workspace/core";

import { SelectSetting } from "./settings-controls.js";
import { SettingsField, SettingsSection } from "./settings-section.js";
import { SwitchSetting } from "./switch-setting.js";
import { useSettings, useUpdateSettings } from "./use-settings.js";

const DETECTION_OPTIONS: { value: MeetingDetectionMode; label: string }[] = [
  { value: "ask", label: "Perguntar se quero gravar" },
  { value: "auto", label: "Começar a gravar sozinho" },
  { value: "off", label: "Desligada" },
];

export const MeetingsSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  return (
    <SettingsSection
      title="Detecção de reuniões"
      description="O FR Notes percebe quando Zoom, Meet, Teams, Slack ou FaceTime começam a usar o microfone."
    >
      <SettingsField
        label="Quando detectar uma reunião"
        htmlFor="meeting-detection"
      >
        <SelectSetting
          id="meeting-detection"
          value={settings.meetingDetection}
          options={DETECTION_OPTIONS}
          onChange={(meetingDetection) =>
            updateSettings.mutate({ meetingDetection })
          }
        />
      </SettingsField>
      <SwitchSetting
        settingKey="autoStopRecording"
        title="Parar quando a reunião acabar"
        description="Encerra a gravação 20 s depois que o app da reunião solta o microfone."
      />
      <SwitchSetting
        settingKey="meetingReminders"
        title="Avisar no início das reuniões da agenda"
        description="Mostra o convite para gravar no canto da tela quando um evento começa."
      />
    </SettingsSection>
  );
};
