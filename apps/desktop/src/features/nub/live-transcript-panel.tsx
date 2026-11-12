import type { LiveTranscript, LiveTranscriptLine } from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface LineBubbleProps {
  line: LiveTranscriptLine;
  partial?: boolean;
}

const LineBubble = ({ line, partial = false }: LineBubbleProps) => (
  <div className={cn("flex flex-col gap-0.5", line.mine && "items-end")}>
    <span className="text-label text-muted-foreground">{line.speaker}</span>
    <p
      className={cn(
        "text-caption max-w-[90%] rounded-xl px-2.5 py-1.5",
        line.mine
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted text-foreground",
        partial && "text-muted-foreground italic",
      )}
    >
      {line.text}
      {partial && " •••"}
    </p>
  </div>
);

const useStickToBottom = (transcript: LiveTranscript) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [transcript]);
  return endRef;
};

interface LiveTranscriptPanelProps {
  transcript: LiveTranscript;
  onClose: () => void;
}

export const LiveTranscriptPanel = ({
  transcript,
  onClose,
}: LiveTranscriptPanelProps) => {
  const endRef = useStickToBottom(transcript);
  const isEmpty =
    transcript.lines.length === 0 && transcript.partials.length === 0;
  return (
    <section className="bg-card/95 flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-lg backdrop-blur">
      <header
        data-tauri-drag-region
        className="flex h-9 shrink-0 items-center justify-between border-b pr-1.5 pl-3"
      >
        <span
          data-tauri-drag-region
          className="text-caption text-heading font-semibold"
        >
          Transcrição ao vivo
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Esconder transcrição"
          title="Esconder transcrição"
          className="text-muted-foreground hover:bg-accent hover:text-foreground ease-brand flex size-6 items-center justify-center rounded-full transition-colors duration-150"
        >
          <X className="size-3.5" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-2.5">
        {isEmpty && (
          <p className="text-caption text-muted-foreground m-auto text-center">
            As falas aparecem aqui assim que alguém começar a falar.
          </p>
        )}
        {transcript.lines.map((line) => (
          <LineBubble key={line.key} line={line} />
        ))}
        {transcript.partials.map((line) => (
          <LineBubble key={line.key} line={line} partial />
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
};
