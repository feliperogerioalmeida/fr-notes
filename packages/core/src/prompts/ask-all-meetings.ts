import type { ChatSource } from "../domain/chat.js";
import type { Note } from "../domain/note.js";
import {
  describeSpeaker,
  type TranscriptSegment,
} from "../domain/transcript.js";
import type {
  MeetingContextHits,
  MeetingExcerpt,
  NoteSummaryHit,
} from "../storage/search-repository.js";
import { formatElapsed, formatFullDate } from "../utils/dates.js";

export const ALL_MEETINGS_THREAD_ID = "all-meetings";

export const ASK_ALL_MEETINGS_SYSTEM_PROMPT = `You are the assistant inside FR Notes, a personal meeting notes app. The user asks questions about their past meetings. A search already found the numbered sources below: transcript moments and meeting notes.

- Answer in Brazilian Portuguese, short and direct, and call them "reunião", never "meeting". Use Markdown lists when they help.
- Use only the sources. After each fact, cite the source number in brackets, like [2]. Never cite a number that does not exist.
- When the question is about when something was said, give the meeting name and the date.
- If the sources do not answer the question, say "Não encontrei isso nas suas reuniões." and suggest other words to search for.
- In transcripts, "Eu" is the user. Speaker attribution is approximate.`;

export const ASK_ALL_SUGGESTIONS = [
  "O que ficou combinado nas últimas reuniões?",
  "Quais próximos passos estão comigo?",
  "Quem falou de orçamento e quando?",
  "Quais objeções os clientes levantaram?",
];

export type MeetingSourceKind = "transcript" | "notes";

export interface MeetingSource {
  index: number;
  noteId: string;
  atMs: number | null;
  title: string;
  date: string;
  kind: MeetingSourceKind;
  label: string;
  text: string;
}

const NOTES_LABEL = "Notas da reunião";
const UNTITLED = "Reunião sem título";

const noteOrigin = (note: Note, fallbackMs: number) =>
  note.recordingStartedAt
    ? new Date(note.recordingStartedAt).getTime()
    : fallbackMs;

const noteDate = (note: Note) =>
  formatFullDate(note.recordingStartedAt ?? note.createdAt);

type UnnumberedSource = Omit<MeetingSource, "index">;

const toTranscriptSource = (
  excerpt: MeetingExcerpt,
  note: Note,
): UnnumberedSource => {
  const origin = noteOrigin(
    note,
    excerpt.segments[0]?.startMs ?? excerpt.startMs,
  );
  const speakerOf = (segment: TranscriptSegment) =>
    describeSpeaker({
      source: segment.source,
      speaker: segment.speaker,
      speakerNames: note.speakerNames,
    });
  const hit = excerpt.segments.find(
    (segment) => segment.startMs === excerpt.startMs,
  );
  return {
    noteId: note.id,
    atMs: excerpt.startMs,
    title: note.title || UNTITLED,
    date: noteDate(note),
    kind: "transcript",
    label: [hit ? speakerOf(hit) : "", formatElapsed(excerpt.startMs - origin)]
      .filter(Boolean)
      .join(" · "),
    text: excerpt.segments
      .map(
        (segment) =>
          `[${formatElapsed(segment.startMs - origin)}] ${speakerOf(segment)}: ${segment.text.trim()}`,
      )
      .join("\n"),
  };
};

const toNotesSource = (
  summary: NoteSummaryHit,
  note: Note,
): UnnumberedSource => ({
  noteId: note.id,
  atMs: null,
  title: note.title || UNTITLED,
  date: noteDate(note),
  kind: "notes",
  label: NOTES_LABEL,
  text: summary.summary.trim(),
});

interface BuildSourcesInput {
  context: MeetingContextHits;
  notes: Note[];
}

export const buildMeetingSources = ({
  context,
  notes,
}: BuildSourcesInput): MeetingSource[] => {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const transcriptSources = context.excerpts.flatMap((excerpt) => {
    const note = byId.get(excerpt.noteId);
    return note ? [toTranscriptSource(excerpt, note)] : [];
  });
  const noteSources = context.summaries.flatMap((summary) => {
    const note = byId.get(summary.noteId);
    return note && summary.summary.trim() ? [toNotesSource(summary, note)] : [];
  });
  return [...transcriptSources, ...noteSources].map((source, position) => ({
    ...source,
    index: position + 1,
  }));
};

const escapeAttribute = (value: string) => value.replace(/"/g, "'");

export const formatSourcesForPrompt = (sources: MeetingSource[]): string =>
  [
    "<sources>",
    ...sources.map(
      (source) =>
        `<source id="${source.index}" meeting="${escapeAttribute(source.title)}" date="${source.date}" kind="${source.kind}">\n${source.text}\n</source>`,
    ),
    "</sources>",
  ].join("\n");

interface AskPromptInput {
  question: string;
  sources: MeetingSource[];
}

export const buildAskAllMeetingsPrompt = ({
  question,
  sources,
}: AskPromptInput): string =>
  [
    sources.length > 0
      ? formatSourcesForPrompt(sources)
      : "<sources>\nNenhum trecho encontrado para esta pergunta.\n</sources>",
    `<question>\n${question.trim()}\n</question>`,
  ].join("\n\n");

export const toChatSources = (sources: MeetingSource[]): ChatSource[] =>
  sources.map(({ index, noteId, atMs, title, label }) => ({
    index,
    noteId,
    atMs,
    title,
    label,
  }));

const CITATION = /\[(\d{1,2})\](?!\()/g;

export const linkCitations = (
  markdown: string,
  sources: ChatSource[],
): string => {
  const known = new Set(sources.map((source) => source.index));
  return markdown.replace(CITATION, (match, digits: string) =>
    known.has(Number(digits)) ? `[${digits}](#source-${digits})` : match,
  );
};
