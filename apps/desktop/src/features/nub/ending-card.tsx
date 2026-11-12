import { Button } from "@workspace/ui/components/ui/button";
import { useEffect, useState } from "react";

import { type NubEnding, requestEndingAction } from "@/lib/native.js";

const TICK_MS = 250;
const SECOND_MS = 1_000;

const useSecondsLeft = (endsAtMs: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.ceil((endsAtMs - now) / SECOND_MS));
};

export const EndingCard = ({ ending }: { ending: NubEnding }) => {
  const secondsLeft = useSecondsLeft(ending.endsAtMs);
  return (
    <section
      data-tauri-drag-region
      className="bg-card/95 flex min-w-0 flex-1 flex-col gap-2.5 self-center rounded-2xl border px-3.5 py-3 shadow-lg backdrop-blur"
    >
      <div data-tauri-drag-region className="flex flex-col">
        <span
          data-tauri-drag-region
          className="text-body-sm text-heading font-semibold"
        >
          A reunião terminou?
        </span>
        <span
          data-tauri-drag-region
          className="text-caption text-muted-foreground tabular-nums"
        >
          Finalizando as notas em {secondsLeft} s
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          size="xs"
          variant="secondary"
          className="flex-1"
          onClick={() => void requestEndingAction("keep-recording")}
        >
          Continuar gravando
        </Button>
        <Button
          size="xs"
          className="flex-1"
          onClick={() => void requestEndingAction("finish-now")}
        >
          Finalizar agora
        </Button>
      </div>
    </section>
  );
};
