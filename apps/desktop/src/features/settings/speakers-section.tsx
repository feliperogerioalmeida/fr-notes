import { Button } from "@workspace/ui/components/ui/button";
import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { describeError } from "@/lib/errors.js";
import { revealSpeakerDiagnostics } from "@/lib/native.js";

import { SettingsSection } from "./settings-section.js";
import { SwitchSetting } from "./switch-setting.js";

const openDiagnostics = async () => {
  try {
    await revealSpeakerDiagnostics();
  } catch (error) {
    toast.error(describeError(error));
  }
};

export const SpeakersSection = () => (
  <SettingsSection
    title="Quem está falando"
    description="Durante a gravação, o FR Notes lê na janela do Meet, Teams ou Slack quem está com o microfone ativo e dá nome às vozes da transcrição. Usa a permissão de Acessibilidade; nada sai do seu Mac."
  >
    <SwitchSetting
      settingKey="speakerDetection"
      title="Identificar quem fala pela janela da reunião"
      description="Funciona melhor quando a reunião tem participantes no evento da agenda."
    />
    <SwitchSetting
      settingKey="speakerDiagnostics"
      title="Salvar diagnóstico local (beta)"
      description="Guarda no Mac, por até 14 dias, como a janela da reunião aparece para a Acessibilidade. Serve para melhorar a detecção em cada app."
    />
    <Button
      size="sm"
      variant="secondary"
      className="self-start"
      onClick={() => void openDiagnostics()}
    >
      <FolderOpen />
      Abrir pasta de diagnóstico
    </Button>
  </SettingsSection>
);
