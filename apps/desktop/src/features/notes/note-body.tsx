import type { Note } from "@workspace/core";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { Sparkles } from "lucide-react";

import { MarkdownEditor } from "@/components/markdown-editor.js";
import { useEnhanceStore } from "@/features/enhance/enhance-store.js";

export type NoteView = "mine" | "enhanced";

interface NoteViewToggleProps {
  view: NoteView;
  onChange: (view: NoteView) => void;
}

const VIEW_LABELS: Record<NoteView, string> = {
  enhanced: "Notas FR",
  mine: "Minhas notas",
};

const isNoteView = (value: string): value is NoteView => value in VIEW_LABELS;

export const NoteViewToggle = ({ view, onChange }: NoteViewToggleProps) => (
  <Tabs
    value={view}
    onValueChange={(value) => {
      if (isNoteView(value)) onChange(value);
    }}
  >
    <TabsList className="h-8">
      {(Object.keys(VIEW_LABELS) as NoteView[]).map((option) => (
        <TabsTrigger
          key={option}
          value={option}
          className="text-caption gap-1.5"
        >
          {option === "enhanced" && <Sparkles className="size-3.5" />}
          {VIEW_LABELS[option]}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

interface NoteBodyProps {
  note: Note;
  view: NoteView;
  onNotesChange: (markdown: string) => void;
  onEnhancedChange: (markdown: string) => void;
}

export const NoteBody = ({
  note,
  view,
  onNotesChange,
  onEnhancedChange,
}: NoteBodyProps) => {
  const streamingNoteId = useEnhanceStore((state) => state.noteId);
  const draft = useEnhanceStore((state) => state.draft);
  const isStreaming = streamingNoteId === note.id;

  if (isStreaming || view === "enhanced") {
    return (
      <MarkdownEditor
        key={`enhanced-${note.id}`}
        value={isStreaming ? draft : (note.enhancedMarkdown ?? "")}
        onChange={onEnhancedChange}
        editable={!isStreaming}
      />
    );
  }
  return (
    <MarkdownEditor
      key={`mine-${note.id}`}
      value={note.notesMarkdown}
      onChange={onNotesChange}
      placeholder="Escreva suas anotações… a FR junta tudo com a transcrição no fim."
      autoFocus={!note.notesMarkdown}
    />
  );
};
