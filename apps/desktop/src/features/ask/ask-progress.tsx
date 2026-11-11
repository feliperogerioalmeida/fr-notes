import { LoaderCircle } from "lucide-react";

import { useElapsed } from "@/hooks/use-elapsed.js";

import type { AskPhase } from "./use-ask-all.js";

const PHASE_LABELS: Record<Exclude<AskPhase, "idle" | "writing">, string> = {
  searching: "Procurando nas suas reuniões…",
  reading: "Lendo os trechos encontrados…",
};

interface AskProgressProps {
  phase: AskPhase;
  startedAt: number | null;
}

export const AskProgress = ({ phase, startedAt }: AskProgressProps) => {
  const elapsed = useElapsed(startedAt);
  if (phase === "idle" || phase === "writing") return null;
  return (
    <div className="text-caption text-muted-foreground flex items-center gap-2">
      <LoaderCircle className="size-3.5 animate-spin" />
      <span>{PHASE_LABELS[phase]}</span>
      <span className="tabular-nums">{elapsed}</span>
    </div>
  );
};
