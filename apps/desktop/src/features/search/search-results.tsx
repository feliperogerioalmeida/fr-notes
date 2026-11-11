import {
  describeSpeaker,
  formatDayLabel,
  formatElapsed,
  type Note,
  type NoteSearchResult,
  type SearchHit,
} from "@workspace/core";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { FileText, LoaderCircle, SearchX } from "lucide-react";
import { useNavigate } from "react-router";

import { PageContainer, PageTitle } from "@/components/page-container.js";
import { PageHeader } from "@/components/page-header.js";
import { useNotesQuery } from "@/features/notes/use-notes.js";

import { HighlightedText } from "./highlighted-text.js";
import { useSearchResults } from "./use-search.js";

export const buildNoteLink = (noteId: string, atMs: number | null) =>
  atMs === null ? `/notes/${noteId}` : `/notes/${noteId}?at=${atMs}`;

const describeMoment = (hit: SearchHit, note: Note) => {
  if (hit.startMs === null || hit.source === null) return "Nas notas";
  const speaker = describeSpeaker({
    source: hit.source,
    speaker: hit.speaker,
    speakerNames: note.speakerNames,
  });
  const origin = note.recordingStartedAt
    ? new Date(note.recordingStartedAt).getTime()
    : hit.startMs;
  return `${speaker} · ${formatElapsed(hit.startMs - origin)}`;
};

interface HitRowProps {
  hit: SearchHit;
  note: Note;
  onOpen: (path: string) => void;
}

const HitRow = ({ hit, note, onOpen }: HitRowProps) => (
  <li>
    <button
      type="button"
      onClick={() => onOpen(buildNoteLink(note.id, hit.startMs))}
      className="hover:bg-accent ease-brand flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors duration-150"
    >
      <span className="text-caption text-muted-foreground inline-flex items-center gap-1.5">
        {hit.startMs === null && <FileText className="size-3" />}
        {describeMoment(hit, note)}
      </span>
      <span className="text-body-sm text-foreground line-clamp-2">
        <HighlightedText snippet={hit.snippet} />
      </span>
    </button>
  </li>
);

interface ResultCardProps {
  result: NoteSearchResult;
  note: Note;
  onOpen: (path: string) => void;
}

const ResultCard = ({ result, note, onOpen }: ResultCardProps) => (
  <article className="bg-card flex flex-col gap-1 rounded-xl border p-2">
    <button
      type="button"
      onClick={() => onOpen(buildNoteLink(note.id, null))}
      className="flex items-baseline justify-between gap-3 px-3 pt-1.5 text-left"
    >
      <span className="text-body-sm text-heading hover:text-brand truncate font-semibold">
        {note.title || "Sem título"}
      </span>
      <span className="text-caption text-muted-foreground shrink-0 first-letter:uppercase">
        {formatDayLabel(new Date(result.noteDate))}
      </span>
    </button>
    <ul className="flex flex-col">
      {result.hits.map((hit, index) => (
        <HitRow
          key={hit.segmentId ?? `note-${index}`}
          hit={hit}
          note={note}
          onOpen={onOpen}
        />
      ))}
    </ul>
  </article>
);

const EmptyResults = ({ query }: { query: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
    <SearchX className="text-muted-foreground size-6" />
    <p className="text-body-sm text-heading font-medium">
      Nada encontrado para “{query}”
    </p>
    <p className="text-caption text-muted-foreground max-w-sm">
      A busca olha títulos, suas anotações, as notas da IA e as transcrições.
      Tente outra palavra ou só o começo dela.
    </p>
  </div>
);

interface SearchResultsProps {
  query: string;
  onOpen: () => void;
}

export const SearchResults = ({ query, onOpen }: SearchResultsProps) => {
  const navigate = useNavigate();
  const { data: results = [], isFetching } = useSearchResults(query);
  const { data: notes = [] } = useNotesQuery();
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const visible = results.filter((result) => notesById.has(result.noteId));
  const open = (path: string) => {
    onOpen();
    navigate(path);
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader />
      <ScrollArea className="min-h-0 flex-1">
        <PageContainer className="max-w-[880px]">
          <PageTitle
            title={
              <>
                Busca
                {isFetching && (
                  <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
                )}
              </>
            }
            description={`${visible.length} ${visible.length === 1 ? "reunião" : "reuniões"} com “${query.trim()}”`}
          />
          {visible.length === 0 && !isFetching ? (
            <EmptyResults query={query.trim()} />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((result) => (
                <ResultCard
                  key={result.noteId}
                  result={result}
                  note={notesById.get(result.noteId) as Note}
                  onOpen={open}
                />
              ))}
            </div>
          )}
        </PageContainer>
      </ScrollArea>
    </div>
  );
};
