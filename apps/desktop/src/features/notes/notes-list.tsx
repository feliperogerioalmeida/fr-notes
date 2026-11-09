import { formatTime, groupByDay, type Note } from "@workspace/core";
import { cn } from "@workspace/ui/lib/utils";
import { FileText, Sparkles } from "lucide-react";
import { NavLink } from "react-router";

import { AudioLevelBars } from "@/features/recording/audio-level-bars.js";
import { useRecordingStore } from "@/features/recording/recording-store.js";

const PREVIEW_LENGTH = 140;
const MARKDOWN_NOISE = /[#*_>`[\]-]+/g;

const buildPreview = (note: Note) =>
  (note.enhancedMarkdown ?? note.notesMarkdown)
    .replace(MARKDOWN_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_LENGTH);

const noteDate = (note: Note) => note.recordingStartedAt ?? note.createdAt;

const NoteIcon = ({ note }: { note: Note }) => {
  const isRecording = useRecordingStore((state) => state.noteId === note.id);
  const level = useRecordingStore((state) =>
    Math.max(state.levels.microphone, state.levels.system),
  );
  if (isRecording) return <AudioLevelBars level={level} active />;
  if (note.enhancedMarkdown)
    return <Sparkles className="text-muted-foreground size-4" />;
  return <FileText className="text-muted-foreground size-4" />;
};

const NoteRow = ({ note }: { note: Note }) => {
  const preview = buildPreview(note);
  return (
    <NavLink
      to={`/notes/${note.id}`}
      className={({ isActive }) =>
        cn(
          "ease-brand group hover:bg-accent flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150",
          isActive && "bg-accent",
        )
      }
    >
      <span className="bg-secondary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
        <NoteIcon note={note} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-body-sm text-heading truncate font-medium">
            {note.title.trim() || "Sem título"}
          </span>
          <span className="text-caption text-muted-foreground shrink-0 tabular-nums">
            {formatTime(noteDate(note))}
          </span>
        </span>
        {preview && (
          <span className="text-caption text-muted-foreground line-clamp-1">
            {preview}
          </span>
        )}
      </span>
    </NavLink>
  );
};

interface NotesListProps {
  notes: Note[];
  emptyState: React.ReactNode;
}

export const NotesList = ({ notes, emptyState }: NotesListProps) => {
  if (notes.length === 0) return <>{emptyState}</>;
  const groups = groupByDay({ items: notes, getDate: noteDate });
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-1">
          <h2 className="text-label text-muted-foreground px-3 pb-1 uppercase">
            {group.label}
          </h2>
          {group.items.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </section>
      ))}
    </div>
  );
};
