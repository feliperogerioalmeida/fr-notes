import type { UnlistenFn } from "@tauri-apps/api/event";
import { Button } from "@workspace/ui/components/ui/button";
import { Square } from "lucide-react";
import { useEffect, useState } from "react";

import { FrSymbol } from "@/components/fr-logo.js";
import { applyNubLayout, type NubMode } from "@/features/nub/nub-layout.js";
import { PromptCard } from "@/features/nub/prompt-card.js";
import { AudioLevelBars } from "@/features/recording/audio-level-bars.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { useRecordingListeners } from "@/features/recording/use-recording-listeners.js";
import { useElapsed } from "@/hooks/use-elapsed.js";
import {
  focusMainWindow,
  type NubPrompt,
  onNubPrompt,
  requestOpenNote,
  requestStopRecording,
  setNubVisible,
} from "@/lib/native.js";

const TRANSPARENT_CLASS = "bg-transparent";

const useTransparentWindow = () => {
  useEffect(() => {
    document.documentElement.classList.add(TRANSPARENT_CLASS);
    document.body.classList.add(TRANSPARENT_CLASS);
  }, []);
};

const usePrompt = () => {
  const [prompt, setPrompt] = useState<NubPrompt | null>(null);
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    void onNubPrompt(setPrompt).then((handle) => {
      unlisten = handle;
    });
    return () => unlisten?.();
  }, []);
  return [prompt, setPrompt] as const;
};

const useNubWindow = (mode: NubMode | null) => {
  useEffect(() => {
    const apply = async () => {
      if (!mode) return setNubVisible(false);
      await applyNubLayout(mode);
      await setNubVisible(true);
    };
    void apply();
  }, [mode]);
};

const openActiveNote = async (noteId: string | null) => {
  await focusMainWindow();
  if (noteId) await requestOpenNote(noteId);
};

const RecordingPill = () => {
  const noteId = useRecordingStore((state) => state.noteId);
  const startedAtMs = useRecordingStore((state) => state.startedAtMs);
  const levels = useRecordingStore((state) => state.levels);
  const elapsed = useElapsed(startedAtMs);
  return (
    <div
      data-tauri-drag-region
      className="bg-card/95 flex h-full w-full flex-col items-center justify-between gap-2 rounded-2xl border px-1.5 py-3 shadow-lg"
    >
      <Button
        variant="ghost"
        className="h-auto p-1.5"
        onClick={() => void openActiveNote(noteId)}
        aria-label="Abrir nota"
      >
        <FrSymbol className="h-6 w-[26px]" />
      </Button>
      <div data-tauri-drag-region className="flex flex-col items-center gap-2">
        <AudioLevelBars
          level={Math.max(levels.microphone, levels.system)}
          active={Boolean(noteId)}
          className="h-5"
        />
        <span className="text-label text-muted-foreground tabular-nums">
          {elapsed}
        </span>
      </div>
      <Button
        size="icon-sm"
        variant="secondary"
        onClick={() => void requestStopRecording()}
        aria-label="Parar gravação"
      >
        <Square className="fill-current" />
      </Button>
    </div>
  );
};

const resolveMode = (
  isRecording: boolean,
  hasPrompt: boolean,
  expanded: boolean,
): NubMode | null => {
  if (isRecording) return "recording";
  if (!hasPrompt) return null;
  return expanded ? "prompt-expanded" : "prompt";
};

export const NubPage = () => {
  useTransparentWindow();
  useRecordingListeners({ persistSegments: false });
  const [prompt, setPrompt] = usePrompt();
  const [expanded, setExpanded] = useState(false);
  const isRecording = useRecordingStore((state) => state.phase !== "idle");
  useEffect(() => {
    if (isRecording) setPrompt(null);
  }, [isRecording, setPrompt]);
  useEffect(() => setExpanded(false), [prompt]);
  const mode = resolveMode(isRecording, Boolean(prompt), expanded);
  useNubWindow(mode);
  if (mode === "recording") {
    return (
      <div
        data-tauri-drag-region
        className="flex h-screen items-center justify-center p-1.5"
      >
        <RecordingPill />
      </div>
    );
  }
  if (!prompt) return null;
  return (
    <div className="flex h-screen flex-col p-1.5">
      <PromptCard
        prompt={prompt}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
    </div>
  );
};
