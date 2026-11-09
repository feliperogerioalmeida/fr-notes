import { formatElapsed } from "@workspace/core";
import { useEffect, useState } from "react";

const TICK_MS = 1000;

export const useElapsed = (startedAtMs: number | null): string => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAtMs) return;
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [startedAtMs]);

  return startedAtMs ? formatElapsed(now - startedAtMs) : formatElapsed(0);
};
