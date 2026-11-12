import { formatElapsed } from "@workspace/core";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { useEnhanceJob } from "./enhance-store.js";

const TICK_MS = 500;
const FAST_READ_MS = 5_000;
const MAX_PROGRESS = 0.95;
const MINUTE_MS = 60_000;

const useNow = (active: boolean) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [active]);
  return now;
};

const describeRemaining = (remainingMs: number) => {
  if (remainingMs <= 0) return "quase lá…";
  if (remainingMs < MINUTE_MS) return "falta menos de 1 min";
  return `faltam ~${Math.ceil(remainingMs / MINUTE_MS)} min`;
};

export const EnhanceProgress = ({ noteId }: { noteId: string }) => {
  const job = useEnhanceJob(noteId);
  const active = job?.phase === "reading";
  const now = useNow(active);
  if (!job || !active) return null;
  const { startedAt, estimatedReadMs } = job;
  const elapsed = now - startedAt;
  if (estimatedReadMs < FAST_READ_MS) {
    return (
      <p className="text-body-sm text-muted-foreground flex items-center gap-2">
        <LoaderCircle className="size-4 animate-spin" />
        Gerando as notas…
      </p>
    );
  }
  const progress = Math.min(elapsed / estimatedReadMs, MAX_PROGRESS);
  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-sm text-heading flex items-center gap-2 font-medium">
          <LoaderCircle className="text-brand size-4 animate-spin" />
          Lendo a transcrição e suas anotações
        </span>
        <span className="text-caption text-muted-foreground tabular-nums">
          {formatElapsed(elapsed)} ·{" "}
          {describeRemaining(estimatedReadMs - elapsed)}
        </span>
      </div>
      <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-brand ease-brand h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="text-caption text-muted-foreground">
        O modelo lê a reunião inteira antes de começar a escrever. Pode sair da
        nota: as notas aparecem aqui quando ficarem prontas.
      </p>
    </div>
  );
};
