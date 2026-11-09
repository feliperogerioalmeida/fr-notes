import type { UnlistenFn } from "@tauri-apps/api/event";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { FrSymbol } from "@/components/fr-logo.js";
import { AudioLevelBars } from "@/features/recording/audio-level-bars.js";
import {
  type DictationStatus,
  onDictationLevel,
  onDictationPartial,
  onDictationState,
} from "@/lib/native.js";

const TRANSPARENT_CLASS = "bg-transparent";
const VISIBLE_CHARACTERS = 32;

const useTransparentWindow = () => {
  useEffect(() => {
    document.documentElement.classList.add(TRANSPARENT_CLASS);
    document.body.classList.add(TRANSPARENT_CLASS);
  }, []);
};

const useDictationFeed = () => {
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState("");
  useEffect(() => {
    const pending: Promise<UnlistenFn>[] = [
      onDictationLevel(setLevel),
      onDictationPartial(setPartial),
      onDictationState((next) => {
        setStatus(next);
        if (next === "listening") setPartial("");
      }),
    ];
    return () =>
      void Promise.all(pending).then((handles) =>
        handles.forEach((unlisten) => unlisten()),
      );
  }, []);
  return { status, level, partial };
};

const tail = (text: string) =>
  text.length > VISIBLE_CHARACTERS
    ? `…${text.slice(-VISIBLE_CHARACTERS)}`
    : text;

export const DictationPillPage = () => {
  useTransparentWindow();
  const { status, level, partial } = useDictationFeed();
  const processing = status === "processing";
  return (
    <div className="flex h-screen items-center justify-center p-1.5">
      <div className="bg-card/95 flex h-full w-full items-center gap-3 rounded-full border px-4 shadow-lg">
        <FrSymbol className="h-5 w-[22px]" />
        {processing ? (
          <LoaderCircle className="text-brand size-4 animate-spin" />
        ) : (
          <AudioLevelBars level={level} active className="h-5" />
        )}
        <span className="text-body-sm text-foreground min-w-0 flex-1 truncate">
          {processing ? "Escrevendo…" : tail(partial) || "Ouvindo…"}
        </span>
      </div>
    </div>
  );
};
