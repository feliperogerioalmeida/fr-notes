import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { formatTime } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { LoaderCircle, RefreshCw, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { useRecordingStore } from "@/features/recording/recording-store.js";
import {
  checkForUpdates,
  restartToApplyUpdate,
} from "@/features/updates/run-update.js";
import {
  type UpdateStatus,
  useUpdateStore,
} from "@/features/updates/update-store.js";

import { SettingsSection } from "./settings-section.js";

const PERCENT = 100;

interface DescribeStatusInput {
  status: UpdateStatus;
  progress: number;
  checkedAt: number | null;
}

const describeCheckTime = (checkedAt: number | null) =>
  checkedAt
    ? ` (verificado às ${formatTime(new Date(checkedAt).toISOString())})`
    : "";

const describeStatus = ({
  status,
  progress,
  checkedAt,
}: DescribeStatusInput) => {
  if (status === "checking") return "Procurando atualizações…";
  if (status === "downloading")
    return `Baixando atualização… ${Math.round(progress * PERCENT)}%`;
  if (status === "ready") return "Atualização instalada. Reinicie para usar.";
  if (status === "up-to-date")
    return `Você está na versão mais recente${describeCheckTime(checkedAt)}.`;
  if (status === "error") return "Não consegui verificar agora.";
  return "Atualiza sozinho ao abrir o app e a cada 6 horas.";
};

const checkManually = async () => {
  if (useRecordingStore.getState().phase !== "idle") {
    toast.message("Termine a gravação para procurar atualizações.");
    return;
  }
  try {
    const version = await checkForUpdates();
    if (version) toast.success(`FR Notes ${version} instalado`);
  } catch {
    toast.error("Não consegui verificar atualizações agora.");
  }
};

const restart = async () => {
  const restarted = await restartToApplyUpdate();
  if (!restarted) toast.message("Termine a gravação para reiniciar.");
};

export const AboutSection = () => {
  const { data: version } = useQuery({
    queryKey: ["app-version"],
    queryFn: getVersion,
  });
  const status = useUpdateStore((state) => state.status);
  const progress = useUpdateStore((state) => state.progress);
  const checkedAt = useUpdateStore((state) => state.checkedAt);
  const busy = status === "checking" || status === "downloading";
  return (
    <SettingsSection>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-body-sm text-heading font-medium">
            FR Notes {version ?? ""}
          </span>
          <span className="text-caption text-muted-foreground">
            {describeStatus({ status, progress, checkedAt })}
          </span>
        </div>
        {status === "ready" ? (
          <Button size="sm" onClick={() => void restart()}>
            <RotateCw />
            Reiniciar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void checkManually()}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
            Procurar atualizações
          </Button>
        )}
      </div>
    </SettingsSection>
  );
};
