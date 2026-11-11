import { ASK_ALL_SUGGESTIONS, type ChatMessage } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { ArrowUp, Eraser, MessagesSquare } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { PageHeader } from "@/components/page-header.js";
import { AskProgress } from "@/features/ask/ask-progress.js";
import { CitedAnswer, SourceList } from "@/features/ask/cited-answer.js";
import {
  type AskPhase,
  useAskAllMeetings,
} from "@/features/ask/use-ask-all.js";

const Intro = ({ onAsk }: { onAsk: (question: string) => void }) => (
  <div className="flex flex-col items-center gap-6 py-16 text-center">
    <span className="bg-secondary flex size-12 items-center justify-center rounded-xl border">
      <MessagesSquare className="text-heading size-6" strokeWidth={1.75} />
    </span>
    <div className="flex flex-col gap-1.5">
      <h1 className="text-title-3 text-heading">Pergunte às suas reuniões</h1>
      <p className="text-body-sm text-muted-foreground max-w-md">
        Eu procuro nas transcrições e nas notas e respondo citando a reunião e o
        momento exato.
      </p>
    </div>
    <div className="flex max-w-xl flex-wrap justify-center gap-2">
      {ASK_ALL_SUGGESTIONS.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="h-auto py-1.5 font-normal whitespace-normal"
          onClick={() => onAsk(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  </div>
);

const MessageItem = ({ message }: { message: ChatMessage }) =>
  message.role === "user" ? (
    <p className="text-body-sm bg-secondary text-secondary-foreground ml-auto max-w-[80%] rounded-xl px-4 py-2.5">
      {message.content}
    </p>
  ) : (
    <article className="bg-card flex flex-col gap-3 rounded-xl border px-5 py-4">
      <CitedAnswer content={message.content} sources={message.sources} />
      <SourceList sources={message.sources} />
    </article>
  );

interface ConversationProps {
  messages: ChatMessage[];
  phase: AskPhase;
  phaseStartedAt: number | null;
  streamingText: string | null;
}

const Conversation = ({
  messages,
  phase,
  phaseStartedAt,
  streamingText,
}: ConversationProps) => {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamingText, phase]);
  return (
    <div className="flex flex-col gap-5 py-6">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <AskProgress phase={phase} startedAt={phaseStartedAt} />
      {streamingText && (
        <article className="bg-card rounded-xl border px-5 py-4">
          <CitedAnswer content={streamingText} sources={[]} />
        </article>
      )}
      <div ref={endRef} />
    </div>
  );
};

const AskInput = ({
  busy,
  onAsk,
}: {
  busy: boolean;
  onAsk: (question: string) => void;
}) => {
  const [question, setQuestion] = useState("");
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (busy || !question.trim()) return;
    onAsk(question);
    setQuestion("");
  };
  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submit();
  };
  return (
    <form
      onSubmit={submit}
      className="bg-card/95 flex items-end gap-2 rounded-xl border p-2 shadow-lg backdrop-blur"
    >
      <Textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={submitOnEnter}
        placeholder="Pergunte sobre qualquer reunião…"
        rows={1}
        className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <Button
        type="submit"
        size="icon"
        disabled={busy || !question.trim()}
        aria-label="Perguntar"
      >
        <ArrowUp />
      </Button>
    </form>
  );
};

export const AskPage = () => {
  const { messages, phase, phaseStartedAt, streamingText, send, clear } =
    useAskAllMeetings();
  const busy = phase !== "idle";
  const ask = (question: string) => void send(question);
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <PageHeader
        actions={
          messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void clear()}
            >
              <Eraser />
              Nova conversa
            </Button>
          )
        }
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[760px] px-10 pb-36">
          {messages.length === 0 && !busy ? (
            <Intro onAsk={ask} />
          ) : (
            <Conversation
              messages={messages}
              phase={phase}
              phaseStartedAt={phaseStartedAt}
              streamingText={streamingText}
            />
          )}
        </div>
      </ScrollArea>
      <div className="gradient-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-6 pt-10 pb-5">
        <div className="pointer-events-auto w-full max-w-[760px]">
          <AskInput busy={busy} onAsk={ask} />
        </div>
      </div>
    </div>
  );
};
