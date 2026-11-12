import type { UnlistenFn } from "@tauri-apps/api/event";
import type { LiveTranscript, Rect } from "@workspace/core";
import { type ReactNode, useEffect, useState } from "react";

import { EndingCard } from "@/features/nub/ending-card.js";
import { LiveTranscriptPanel } from "@/features/nub/live-transcript-panel.js";
import {
  applyNubLayout,
  NUB_PADDING,
  NUB_SIDE_GAP,
  type NubMode,
  refreshNubPosition,
} from "@/features/nub/nub-layout.js";
import { PromptCard } from "@/features/nub/prompt-card.js";
import { RecordingPill } from "@/features/nub/recording-pill.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { useRecordingListeners } from "@/features/recording/use-recording-listeners.js";
import {
  type NubEnding,
  type NubPrompt,
  onNubEnding,
  onNubPrompt,
  onNubTranscript,
  setNubVisible,
} from "@/lib/native.js";

const TRANSPARENT_CLASS = "bg-transparent";
const POSITION_REFRESH_MS = 1_500;
const EMPTY_TRANSCRIPT: LiveTranscript = { lines: [], partials: [] };

const useTransparentWindow = () => {
  useEffect(() => {
    document.documentElement.classList.add(TRANSPARENT_CLASS);
    document.body.classList.add(TRANSPARENT_CLASS);
  }, []);
};

const useNubEvent = <Payload,>(
  subscribe: (handler: (payload: Payload) => void) => Promise<UnlistenFn>,
  initial: Payload,
) => {
  const [value, setValue] = useState<Payload>(initial);
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;
    let disposed = false;
    void subscribe(setValue).then((handle) => {
      if (disposed) return handle();
      unlisten = handle;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [subscribe]);
  return [value, setValue] as const;
};

const useNubWindow = (mode: NubMode | null) => {
  useEffect(() => {
    let placed: Rect | null = null;
    const show = async () => {
      if (!mode) return setNubVisible(false);
      placed = await applyNubLayout(mode);
      await setNubVisible(true);
    };
    void show();
    if (!mode) return;
    const timer = setInterval(() => {
      if (!placed) return;
      void refreshNubPosition(mode, placed).then((next) => {
        placed = next;
      });
    }, POSITION_REFRESH_MS);
    return () => clearInterval(timer);
  }, [mode]);
};

interface ModeInput {
  isRecording: boolean;
  isEnding: boolean;
  transcriptOpen: boolean;
  hasPrompt: boolean;
  expanded: boolean;
}

const resolveMode = ({
  isRecording,
  isEnding,
  transcriptOpen,
  hasPrompt,
  expanded,
}: ModeInput): NubMode | null => {
  if (isRecording && isEnding) return "ending";
  if (isRecording && transcriptOpen) return "recording-transcript";
  if (isRecording) return "recording";
  if (!hasPrompt) return null;
  return expanded ? "prompt-expanded" : "prompt";
};

const NubFrame = ({ children }: { children: ReactNode }) => (
  <div
    data-tauri-drag-region
    className="flex h-screen items-start justify-end"
    style={{ padding: NUB_PADDING, gap: NUB_SIDE_GAP }}
  >
    {children}
  </div>
);

export const NubPage = () => {
  useTransparentWindow();
  useRecordingListeners({ persistSegments: false });
  const [prompt, setPrompt] = useNubEvent<NubPrompt | null>(onNubPrompt, null);
  const [ending, setEnding] = useNubEvent<NubEnding | null>(onNubEnding, null);
  const [transcript] = useNubEvent(onNubTranscript, EMPTY_TRANSCRIPT);
  const [expanded, setExpanded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const isRecording = useRecordingStore((state) => state.phase !== "idle");
  useEffect(() => {
    if (isRecording) return setPrompt(null);
    setEnding(null);
    setTranscriptOpen(false);
  }, [isRecording, setPrompt, setEnding]);
  useEffect(() => setExpanded(false), [prompt]);
  const mode = resolveMode({
    isRecording,
    isEnding: Boolean(ending),
    transcriptOpen,
    hasPrompt: Boolean(prompt),
    expanded,
  });
  useNubWindow(mode);
  const toggleTranscript = () => setTranscriptOpen((open) => !open);
  if (isRecording) {
    return (
      <NubFrame>
        {ending && <EndingCard ending={ending} />}
        {!ending && transcriptOpen && (
          <LiveTranscriptPanel
            transcript={transcript}
            onClose={toggleTranscript}
          />
        )}
        <RecordingPill
          transcriptOpen={transcriptOpen}
          onToggleTranscript={toggleTranscript}
        />
      </NubFrame>
    );
  }
  if (!prompt) return null;
  return (
    <div className="flex h-screen flex-col" style={{ padding: NUB_PADDING }}>
      <PromptCard
        prompt={prompt}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
    </div>
  );
};
