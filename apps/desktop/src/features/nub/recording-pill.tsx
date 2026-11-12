import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { Square } from "lucide-react";

import { FrSymbol } from "@/components/fr-logo.js";
import { AudioLevelBars } from "@/features/recording/audio-level-bars.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";
import { useElapsed } from "@/hooks/use-elapsed.js";
import {
  focusMainWindow,
  requestOpenNote,
  requestStopRecording,
} from "@/lib/native.js";

import { PILL_SIZE } from "./nub-layout.js";

const openActiveNote = async (noteId: string | null) => {
  await focusMainWindow();
  if (noteId) await requestOpenNote(noteId);
};

interface RecordingPillProps {
  transcriptOpen: boolean;
  onToggleTranscript: () => void;
}

export const RecordingPill = ({
  transcriptOpen,
  onToggleTranscript,
}: RecordingPillProps) => {
  const noteId = useRecordingStore((state) => state.noteId);
  const startedAtMs = useRecordingStore((state) => state.startedAtMs);
  const levels = useRecordingStore((state) => state.levels);
  const elapsed = useElapsed(startedAtMs);
  return (
    <div
      data-tauri-drag-region
      style={PILL_SIZE}
      className="bg-card/95 flex shrink-0 flex-col items-center justify-between rounded-2xl border py-2 shadow-lg"
    >
      <Button
        variant="ghost"
        className="h-auto p-1"
        onClick={() => void openActiveNote(noteId)}
        aria-label="Abrir nota"
        title="Abrir nota"
      >
        <FrSymbol className="h-5 w-[22px]" />
      </Button>
      <button
        type="button"
        onClick={onToggleTranscript}
        aria-pressed={transcriptOpen}
        aria-label={
          transcriptOpen ? "Esconder transcrição" : "Mostrar transcrição"
        }
        title={transcriptOpen ? "Esconder transcrição" : "Mostrar transcrição"}
        className={cn(
          "hover:bg-accent ease-brand flex flex-col items-center gap-1.5 rounded-lg px-1 py-1.5 transition-colors duration-150",
          transcriptOpen && "bg-accent",
        )}
      >
        <AudioLevelBars
          level={Math.max(levels.microphone, levels.system)}
          active={Boolean(noteId)}
          className="h-4"
        />
        <span className="text-label text-muted-foreground tabular-nums">
          {elapsed}
        </span>
      </button>
      <Button
        size="icon-sm"
        variant="secondary"
        className="size-7 rounded-full"
        onClick={() => void requestStopRecording()}
        aria-label="Parar gravação"
        title="Parar gravação"
      >
        <Square className="size-3 fill-current" />
      </Button>
    </div>
  );
};
