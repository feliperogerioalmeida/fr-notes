import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";

import {
  openPrivacySettings,
  type Permissions,
  type PermissionState,
  type PrivacyPane,
  requestAccessibilityPermission,
  requestCalendarAccess,
  requestMicrophonePermission,
  requestSystemAudioPermission,
} from "@/lib/native.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

import { SettingsSection } from "./settings-section.js";
import { usePermissions } from "./use-settings.js";

const STATE_LABELS: Record<PermissionState, string> = {
  granted: "Permitido",
  denied: "Negado",
  undetermined: "Pendente",
  restricted: "Restrito",
};

interface PermissionDefinition {
  key: keyof Permissions;
  title: string;
  description: string;
  pane: PrivacyPane;
  request: () => Promise<boolean>;
}

const PERMISSIONS: PermissionDefinition[] = [
  {
    key: "microphone",
    title: "Microfone",
    description: "Transcreve o que você fala (aparece como “Eu”).",
    pane: "microphone",
    request: requestMicrophonePermission,
  },
  {
    key: "systemAudio",
    title: "Áudio do sistema",
    description:
      "Transcreve os outros participantes (aparece como “Eles”). Não precisa reiniciar.",
    pane: "system-audio",
    request: requestSystemAudioPermission,
  },
  {
    key: "calendar",
    title: "Calendário",
    description:
      "Mostra as próximas reuniões e preenche título e participantes das notas.",
    pane: "calendar",
    request: requestCalendarAccess,
  },
  {
    key: "accessibility",
    title: "Acessibilidade",
    description: "Digita o ditado no app em que você está escrevendo.",
    pane: "accessibility",
    request: requestAccessibilityPermission,
  },
];

interface PermissionRowProps {
  definition: PermissionDefinition;
  state: PermissionState | undefined;
}

const PermissionRow = ({ definition, state }: PermissionRowProps) => {
  const queryClient = useQueryClient();
  const granted = state === "granted";
  const request = async () => {
    const accepted = await definition.request();
    if (!accepted) await openPrivacySettings(definition.pane);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.permissions });
  };
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-body-sm text-heading font-medium">
          {definition.title}
        </span>
        <span className="text-caption text-muted-foreground">
          {definition.description}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge
          className={cn(
            "border-transparent",
            granted
              ? "bg-success-subtle text-success-foreground"
              : "bg-warning-subtle text-warning-foreground",
          )}
        >
          {STATE_LABELS[state ?? "undetermined"]}
        </Badge>
        {!granted && (
          <Button size="sm" variant="secondary" onClick={() => void request()}>
            Permitir
          </Button>
        )}
      </div>
    </div>
  );
};

export const PermissionsSection = () => {
  const { data: permissions } = usePermissions();
  return (
    <SettingsSection>
      {PERMISSIONS.map((definition) => (
        <PermissionRow
          key={definition.key}
          definition={definition}
          state={permissions?.[definition.key]}
        />
      ))}
    </SettingsSection>
  );
};
