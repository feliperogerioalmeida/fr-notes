import {
  groupIntoTurns,
  type LiveSegmentEvent,
  SPEAKER_LABELS,
  type TranscriptSource,
  type TranscriptTurn,
} from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useMemo, useRef } from "react";

import { useRecordingStore } from "@/features/recording/recording-store.js";

import { useTranscriptQuery } from "./use-transcript.js";

interface TranscriptBubbleProps {
  source: TranscriptSource;
  speaker: string;
  text: string;
  live?: boolean;
}

const TranscriptBubble = ({
  source,
  speaker,
  text,
  live = false,
}: TranscriptBubbleProps) => {
  const isMine = source === "microphone";
  return (
    <div className={cn("flex flex-col gap-1", isMine && "items-end")}>
      <span className="text-label text-muted-foreground uppercase">
        {speaker}
      </span>
      <p
        className={cn(
          "text-body-sm max-w-[88%] rounded-lg px-3 py-2",
          isMine
            ? "bg-secondary text-secondary-foreground"
            : "bg-card text-card-foreground border",
          live && "text-muted-foreground italic",
        )}
      >
        {text}
      </p>
    </div>
  );
};

const toLiveBubbles = (
  interim: Record<TranscriptSource, LiveSegmentEvent | null>,
) =>
  Object.values(interim).filter(
    (segment): segment is LiveSegmentEvent =>
      segment !== null && segment.text.trim().length > 0,
  );

const EmptyTranscript = () => (
  <p className="text-body-sm text-muted-foreground px-1 py-8 text-center">
    A transcrição aparece aqui quando você começa a gravar.
  </p>
);

export const TranscriptPanel = ({ noteId }: { noteId: string }) => {
  const { data: segments = [] } = useTranscriptQuery(noteId);
  const recordingNoteId = useRecordingStore((state) => state.noteId);
  const interim = useRecordingStore((state) => state.interim);
  const turns: TranscriptTurn[] = useMemo(
    () => groupIntoTurns(segments),
    [segments],
  );
  const live = recordingNoteId === noteId ? toLiveBubbles(interim) : [];
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns.length, live.length]);

  if (turns.length === 0 && live.length === 0) return <EmptyTranscript />;
  return (
    <div className="flex flex-col gap-4">
      {turns.map((turn) => (
        <TranscriptBubble
          key={turn.key}
          source={turn.source}
          speaker={turn.speaker}
          text={turn.text}
        />
      ))}
      {live.map((segment) => (
        <TranscriptBubble
          key={segment.segmentKey}
          source={segment.source}
          speaker={SPEAKER_LABELS[segment.source]}
          text={segment.text}
          live
        />
      ))}
      <div ref={endRef} />
    </div>
  );
};
