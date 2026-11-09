import { Button } from "@workspace/ui/components/ui/button";
import { LoaderCircle, Mic, Square } from "lucide-react";
import { Link } from "react-router";

import { useElapsed } from "@/hooks/use-elapsed.js";

import { AudioLevelBars } from "./audio-level-bars.js";
import { useRecordingStore } from "./recording-store.js";
import { useRecordingControls } from "./use-recording-controls.js";

interface RecordingControlProps {
  noteId: string;
  hasTranscript: boolean;
}

const LiveRecording = ({ onStop }: { onStop: () => void }) => {
  const levels = useRecordingStore((state) => state.levels);
  const startedAtMs = useRecordingStore((state) => state.startedAtMs);
  const elapsed = useElapsed(startedAtMs);
  return (
    <div className="flex items-center gap-3 pl-3">
      <AudioLevelBars
        level={Math.max(levels.microphone, levels.system)}
        active
      />
      <span className="text-body-sm text-foreground w-12 tabular-nums">
        {elapsed}
      </span>
      <Button
        size="icon"
        variant="secondary"
        onClick={onStop}
        aria-label="Parar gravação"
        className="size-8 rounded-md"
      >
        <Square className="fill-current" />
      </Button>
    </div>
  );
};

const BusyState = ({ label }: { label: string }) => (
  <span className="text-body-sm text-muted-foreground flex items-center gap-2 px-3">
    <LoaderCircle className="size-4 animate-spin" />
    {label}
  </span>
);

export const RecordingControl = ({
  noteId,
  hasTranscript,
}: RecordingControlProps) => {
  const phase = useRecordingStore((state) => state.phase);
  const activeNoteId = useRecordingStore((state) => state.noteId);
  const { start, stop } = useRecordingControls(noteId);
  const isOtherNote = activeNoteId !== null && activeNoteId !== noteId;

  if (isOtherNote) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/notes/${activeNoteId}`}>Gravando outra nota</Link>
      </Button>
    );
  }
  if (phase === "starting") return <BusyState label="Iniciando…" />;
  if (phase === "stopping") return <BusyState label="Finalizando…" />;
  if (phase === "recording") return <LiveRecording onStop={stop} />;
  return (
    <Button variant="ghost" size="sm" onClick={start} className="gap-2">
      <Mic />
      {hasTranscript ? "Continuar gravação" : "Gravar reunião"}
    </Button>
  );
};
