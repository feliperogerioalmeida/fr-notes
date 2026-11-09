import { CHAT_SUGGESTIONS, type ChatMessage } from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import { cn } from "@workspace/ui/lib/utils";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { MarkdownMessage } from "@/components/markdown-message.js";

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingText: string | null;
  onAsk: (question: string) => void;
}

const UserMessage = ({ content }: { content: string }) => (
  <p className="text-body-sm bg-secondary text-secondary-foreground ml-auto max-w-[88%] rounded-lg px-3 py-2">
    {content}
  </p>
);

const AssistantMessage = ({ content }: { content: string }) => (
  <MarkdownMessage content={content} className="text-body-sm" />
);

const Suggestions = ({ onAsk }: { onAsk: (question: string) => void }) => (
  <div className="flex flex-col gap-3 py-6">
    <span className="text-body-sm text-muted-foreground flex items-center gap-2">
      <Sparkles className="size-4" />
      Pergunte qualquer coisa sobre esta reunião
    </span>
    <div className="flex flex-col items-start gap-2">
      {CHAT_SUGGESTIONS.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="h-auto py-1.5 text-left font-normal whitespace-normal"
          onClick={() => onAsk(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  </div>
);

const StreamingMessage = ({ text }: { text: string }) =>
  text ? (
    <AssistantMessage content={text} />
  ) : (
    <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
  );

export const ChatPanel = ({
  messages,
  streamingText,
  onAsk,
}: ChatPanelProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamingText]);

  if (messages.length === 0 && streamingText === null) {
    return <Suggestions onAsk={onAsk} />;
  }
  return (
    <div className={cn("flex flex-col gap-4")}>
      {messages.map((message) =>
        message.role === "user" ? (
          <UserMessage key={message.id} content={message.content} />
        ) : (
          <AssistantMessage key={message.id} content={message.content} />
        ),
      )}
      {streamingText !== null && <StreamingMessage text={streamingText} />}
      <div ref={endRef} />
    </div>
  );
};
