import { Button } from "@workspace/ui/components/ui/button";
import { FolderOpen } from "lucide-react";

import { revealRecordings } from "@/lib/native.js";

import { SelectSetting } from "./settings-controls.js";
import { SettingsField, SettingsSection } from "./settings-section.js";
import { SwitchSetting } from "./switch-setting.js";
import { useSettings, useUpdateSettings } from "./use-settings.js";

const RETENTION_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "0", label: "Para sempre" },
];

export const MeetingAudioSection = () => {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  return (
    <SettingsSection
      title="Áudio das reuniões"
      description="Guardado só no seu Mac, em AAC (cerca de 15 MB por hora de cada lado da conversa). Serve para refazer a transcrição se a internet cair ou a transcrição ao vivo sair ruim."
    >
      <SwitchSetting
        settingKey="keepMeetingAudio"
        title="Guardar o áudio das reuniões"
        description="Vale para as próximas gravações."
      />
      <SettingsField label="Manter os arquivos por" htmlFor="audio-retention">
        <SelectSetting
          id="audio-retention"
          value={String(settings.audioRetentionDays)}
          options={RETENTION_OPTIONS}
          onChange={(value) =>
            updateSettings.mutate({ audioRetentionDays: Number(value) })
          }
        />
      </SettingsField>
      <Button
        size="sm"
        variant="secondary"
        className="self-start"
        onClick={() => void revealRecordings()}
      >
        <FolderOpen />
        Abrir pasta dos áudios
      </Button>
    </SettingsSection>
  );
};
