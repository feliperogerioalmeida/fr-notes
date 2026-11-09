import { Button } from "@workspace/ui/components/ui/button";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { Eraser, X } from "lucide-react";
import type { ReactNode } from "react";

import { ChatPanel } from "@/features/chat/chat-panel.js";
import type { useNoteChat } from "@/features/chat/use-note-chat.js";
import { TranscriptPanel } from "@/features/transcript/transcript-panel.js";

export type SidePanel = "transcript" | "chat";

const PANEL_TITLES: Record<SidePanel, string> = {
  transcript: "Transcrição",
  chat: "Pergunte à FR",
};

interface NoteSidePanelProps {
  noteId: string;
  panel: SidePanel;
  chat: ReturnType<typeof useNoteChat>;
  onClose: () => void;
}

const PanelHeader = ({
  title,
  actions,
  onClose,
}: {
  title: string;
  actions?: ReactNode;
  onClose: () => void;
}) => (
  <div className="flex h-12 shrink-0 items-center gap-1 border-b px-4">
    <span className="text-body-sm text-heading flex-1 font-semibold">
      {title}
    </span>
    {actions}
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onClose}
      aria-label="Fechar"
    >
      <X />
    </Button>
  </div>
);

export const NoteSidePanel = ({
  noteId,
  panel,
  chat,
  onClose,
}: NoteSidePanelProps) => {
  const clearAction =
    panel === "chat" && chat.messages.length > 0 ? (
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => void chat.clear()}
        aria-label="Limpar conversa"
      >
        <Eraser />
      </Button>
    ) : null;
  return (
    <aside className="bg-sidebar animate-in slide-in-from-right-4 fade-in ease-brand flex w-[380px] shrink-0 flex-col border-l duration-300">
      <PanelHeader
        title={PANEL_TITLES[panel]}
        actions={clearAction}
        onClose={onClose}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-4 pb-28">
          {panel === "transcript" ? (
            <TranscriptPanel noteId={noteId} />
          ) : (
            <ChatPanel
              messages={chat.messages}
              streamingText={chat.streamingText}
              onAsk={(question) => void chat.send(question)}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};
