import type { Note, Template } from "@workspace/core";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header.js";
import { useNoteChat } from "@/features/chat/use-note-chat.js";
import { useEnhanceJob } from "@/features/enhance/enhance-store.js";
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
import { NoteTitleField } from "@/features/notes/note-title-field.js";
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
  const isStreaming = Boolean(useEnhanceJob(note?.id));
  useEffect(() => {
    setView(note?.enhancedMarkdown ? "enhanced" : "mine");
  }, [note?.id, Boolean(note?.enhancedMarkdown)]);
  useEffect(() => {
    if (isStreaming) setView("enhanced");
  }, [isStreaming, note?.id]);
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
    <div className="flex w-full flex-col gap-4 px-10 pt-6 pb-40 xl:px-16">
      <NoteTitleField
        value={title}
        onChange={(next) => {
          setTitle(next);
          save({ title: next });
        }}
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

const useFocusMoment = () => {
  const [searchParams] = useSearchParams();
  const at = Number(searchParams.get("at"));
  return Number.isFinite(at) && at > 0 ? at : null;
};

const NoteWorkspace = ({ note }: { note: Note }) => {
  const focusMs = useFocusMoment();
  const [panel, setPanel] = useState<SidePanel | null>(
    focusMs ? "transcript" : null,
  );
  useEffect(() => {
    if (focusMs) setPanel("transcript");
  }, [focusMs]);
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
          focusMs={focusMs}
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
