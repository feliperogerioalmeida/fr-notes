import type { Note, Template } from "@workspace/core";
import { Input } from "@workspace/ui/components/ui/input";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header.js";
import { useNoteChat } from "@/features/chat/use-note-chat.js";
import { useEnhanceStore } from "@/features/enhance/enhance-store.js";
import { runEnhancement } from "@/features/enhance/run-enhancement.js";
import { NoteActionBar } from "@/features/notes/note-action-bar.js";
import { NoteActionsMenu } from "@/features/notes/note-actions-menu.js";
import {
  NoteBody,
  type NoteView,
  NoteViewToggle,
} from "@/features/notes/note-body.js";
import { NoteMeta } from "@/features/notes/note-meta.js";
import {
  NoteSidePanel,
  type SidePanel,
} from "@/features/notes/note-side-panel.js";
import { useNoteQuery, useUpdateNote } from "@/features/notes/use-notes.js";
import { useTranscriptQuery } from "@/features/transcript/use-transcript.js";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback.js";
import { describeError } from "@/lib/errors.js";

const SAVE_DELAY_MS = 600;

const useNoteAutosave = (noteId: string) => {
  const updateNote = useUpdateNote();
  return useDebouncedCallback(
    (patch: Parameters<typeof updateNote.mutate>[0]["patch"]) =>
      updateNote.mutate({ id: noteId, patch }),
    SAVE_DELAY_MS,
  );
};

const useNoteView = (note: Note | null | undefined) => {
  const [view, setView] = useState<NoteView>("mine");
  const streamingNoteId = useEnhanceStore((state) => state.noteId);
  useEffect(() => {
    setView(note?.enhancedMarkdown ? "enhanced" : "mine");
  }, [note?.id, Boolean(note?.enhancedMarkdown)]);
  useEffect(() => {
    if (streamingNoteId && streamingNoteId === note?.id) setView("enhanced");
  }, [streamingNoteId, note?.id]);
  return [view, setView] as const;
};

const enhanceWith = async (noteId: string, template: Template) => {
  try {
    await runEnhancement({ noteId, templateId: template.id });
  } catch (error) {
    toast.error(describeError(error));
  }
};

const NoteEditorColumn = ({ note }: { note: Note }) => {
  const save = useNoteAutosave(note.id);
  const [view, setView] = useNoteView(note);
  const [title, setTitle] = useState(note.title);
  useEffect(() => setTitle(note.title), [note.id, note.title]);
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-10 pt-6 pb-40">
      <Input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          save({ title: event.target.value });
        }}
        placeholder="Nova nota"
        className="text-heading h-auto border-0 bg-transparent px-0 py-1 text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-3xl dark:bg-transparent"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NoteMeta note={note} />
        {note.enhancedMarkdown && (
          <NoteViewToggle view={view} onChange={setView} />
        )}
      </div>
      <NoteBody
        note={note}
        view={view}
        onNotesChange={(notesMarkdown) => save({ notesMarkdown })}
        onEnhancedChange={(enhancedMarkdown) => save({ enhancedMarkdown })}
      />
    </div>
  );
};

const NoteWorkspace = ({ note }: { note: Note }) => {
  const [panel, setPanel] = useState<SidePanel | null>(null);
  const chat = useNoteChat(note.id);
  const { data: segments = [] } = useTranscriptQuery(note.id);
  const togglePanel = (next: SidePanel) =>
    setPanel((current) => (current === next ? null : next));
  const ask = (question: string) => {
    setPanel("chat");
    void chat.send(question);
  };
  return (
    <div className="flex h-full min-h-0">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <PageHeader actions={<NoteActionsMenu note={note} />} />
        <ScrollArea className="min-h-0 flex-1">
          <NoteEditorColumn note={note} />
        </ScrollArea>
        <div className="gradient-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-6 pt-10 pb-5">
          <div className="pointer-events-auto flex w-full justify-center">
            <NoteActionBar
              note={note}
              hasTranscript={segments.length > 0}
              panel={panel}
              onTogglePanel={togglePanel}
              onAsk={ask}
              onEnhance={(template) => void enhanceWith(note.id, template)}
            />
          </div>
        </div>
      </div>
      {panel && (
        <NoteSidePanel
          noteId={note.id}
          panel={panel}
          chat={chat}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
};

export const NotePage = () => {
  const { noteId } = useParams();
  const { data: note, isLoading } = useNoteQuery(noteId);
  if (isLoading) return null;
  if (!note) {
    return (
      <p className="text-muted-foreground p-10">Esta nota não existe mais.</p>
    );
  }
  return <NoteWorkspace key={note.id} note={note} />;
};
