import {
  describeSpeaker,
  groupIntoTurns,
  type LiveSegmentEvent,
  type Note,
  type TranscriptSource,
  type TranscriptTurn,
} from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useMemo, useRef } from "react";

import { useNoteQuery } from "@/features/notes/use-notes.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";

import { SpeakerNamePopover } from "./speaker-name-popover.js";
import { useTranscriptQuery } from "./use-transcript.js";

interface TranscriptBubbleProps {
  note: Note | null | undefined;
  source: TranscriptSource;
  speakerIndex: number | null;
  speaker: string;
  text: string;
  live?: boolean;
}

const SpeakerLabel = ({
  note,
  speakerIndex,
  speaker,
}: Pick<TranscriptBubbleProps, "note" | "speakerIndex" | "speaker">) => {
  if (!note || speakerIndex === null) {
    return (
      <span className="text-label text-muted-foreground uppercase">
        {speaker}
      </span>
    );
  }
  return (
    <SpeakerNamePopover
      note={note}
      speakerIndex={speakerIndex}
      label={speaker}
    />
  );
};

const TranscriptBubble = ({
  note,
  source,
  speakerIndex,
  speaker,
  text,
  live = false,
}: TranscriptBubbleProps) => {
  const isMine = source === "microphone";
  return (
    <div className={cn("flex flex-col gap-1", isMine && "items-end")}>
      <SpeakerLabel note={note} speakerIndex={speakerIndex} speaker={speaker} />
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
  const { data: note } = useNoteQuery(noteId);
  const recordingNoteId = useRecordingStore((state) => state.noteId);
  const interim = useRecordingStore((state) => state.interim);
  const speakerNames = note?.speakerNames;
  const turns: TranscriptTurn[] = useMemo(
    () => groupIntoTurns(segments, speakerNames),
    [segments, speakerNames],
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
          note={note}
          source={turn.source}
          speakerIndex={turn.speakerIndex}
          speaker={turn.speaker}
          text={turn.text}
        />
      ))}
      {live.map((segment) => (
        <TranscriptBubble
          key={segment.segmentKey}
          note={note}
          source={segment.source}
          speakerIndex={segment.speaker}
          speaker={describeSpeaker({
            source: segment.source,
            speaker: segment.speaker,
            speakerNames,
          })}
          text={segment.text}
          live
        />
      ))}
      <div ref={endRef} />
    </div>
  );
};
