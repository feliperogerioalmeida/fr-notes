import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { Switch } from "@workspace/ui/components/ui/switch";
import { toast } from "sonner";

import { describeError } from "@/lib/errors.js";

import { SettingsSection } from "./settings-section.js";

const LAUNCH_AT_LOGIN_KEY = ["launch-at-login"] as const;

const setLaunchAtLogin = (enabled: boolean) => (enabled ? enable() : disable());

const useLaunchAtLogin = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: LAUNCH_AT_LOGIN_KEY, queryFn: isEnabled });
  const mutation = useMutation({
    mutationFn: setLaunchAtLogin,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: LAUNCH_AT_LOGIN_KEY }),
    onError: (error) => toast.error(describeError(error)),
  });
  return { enabled: query.data ?? false, isLoading: query.isLoading, mutation };
};

export const StartupSection = () => {
  const { enabled, isLoading, mutation } = useLaunchAtLogin();
  return (
    <SettingsSection title="Inicialização">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm text-heading font-medium">
            Abrir o FR Notes ao entrar no Mac
          </span>
          <span className="text-caption text-muted-foreground">
            Abre escondido na barra de menus, pronto para detectar reuniões e
            para o ditado.
          </span>
        </div>
        <Switch
          checked={enabled}
          disabled={isLoading || mutation.isPending}
          onCheckedChange={(checked) => mutation.mutate(checked)}
        />
      </div>
    </SettingsSection>
  );
};
