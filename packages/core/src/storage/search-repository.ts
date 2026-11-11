import type {
  TranscriptSegment,
  TranscriptSource,
} from "../domain/transcript.js";
import { HIGHLIGHT_END, HIGHLIGHT_START } from "../search/highlight.js";
import {
  buildMatchQuery,
  countMatchedTerms,
  extractSearchTerms,
  type MatchMode,
} from "../search/search-terms.js";
import type { SqlClient } from "./sql-client.js";
import {
  toTranscriptSegment,
  type TranscriptRow,
} from "./transcript-repository.js";

const SNIPPET_TOKENS = 14;
const SEGMENT_HIT_LIMIT = 300;
const NOTE_HIT_LIMIT = 60;
const MAX_HITS_PER_NOTE = 4;
const CONTEXT_WINDOW_MS = 75_000;
const SAME_MOMENT_MS = 60_000;
const MAX_NOTE_SUMMARY_CHARS = 1_200;

const snippetSql = (table: string) =>
  `snippet(${table}, '${HIGHLIGHT_START}', '${HIGHLIGHT_END}', '…', -1, ${SNIPPET_TOKENS})`;

export interface SearchHit {
  segmentId: string | null;
  snippet: string;
  startMs: number | null;
  source: TranscriptSource | null;
  speaker: number | null;
}

export interface NoteSearchResult {
  noteId: string;
  noteDate: string;
  hits: SearchHit[];
}

interface NoteHitRow {
  note_id: string;
  note_date: string;
  snippet: string;
}

interface SegmentHitRow extends NoteHitRow {
  segment_id: string;
  start_ms: number;
  source: TranscriptSource;
  speaker: number | null;
  text: string;
}

export interface MeetingExcerpt {
  noteId: string;
  startMs: number;
  segments: TranscriptSegment[];
}

export interface NoteSummaryHit {
  noteId: string;
  summary: string;
}

export interface MeetingContextHits {
  excerpts: MeetingExcerpt[];
  summaries: NoteSummaryHit[];
}

interface FindExcerptsInput {
  question: string;
  maxExcerpts?: number;
  maxSummaries?: number;
}

const groupByNote = (noteRows: NoteHitRow[], segmentRows: SegmentHitRow[]) => {
  const results = new Map<string, NoteSearchResult>();
  const ensure = (row: NoteHitRow) => {
    const existing = results.get(row.note_id);
    if (existing) return existing;
    const created = { noteId: row.note_id, noteDate: row.note_date, hits: [] };
    results.set(row.note_id, created);
    return created;
  };
  noteRows.forEach((row) =>
    ensure(row).hits.push({
      segmentId: null,
      snippet: row.snippet,
      startMs: null,
      source: null,
      speaker: null,
    }),
  );
  segmentRows.forEach((row) => {
    const result = ensure(row);
    if (result.hits.length >= MAX_HITS_PER_NOTE) return;
    result.hits.push({
      segmentId: row.segment_id,
      snippet: row.snippet,
      startMs: Number(row.start_ms),
      source: row.source,
      speaker: row.speaker === null ? null : Number(row.speaker),
    });
  });
  return [...results.values()].sort((a, b) =>
    b.noteDate.localeCompare(a.noteDate),
  );
};

const pickDistinctMoments = (
  rows: SegmentHitRow[],
  terms: string[],
  limit: number,
) => {
  const ranked = [...rows]
    .map((row) => ({ row, score: countMatchedTerms(row.text, terms) }))
    .sort(
      (a, b) =>
        b.score - a.score || b.row.note_date.localeCompare(a.row.note_date),
    );
  const picked: SegmentHitRow[] = [];
  for (const { row } of ranked) {
    const nearby = picked.some(
      (item) =>
        item.note_id === row.note_id &&
        Math.abs(Number(item.start_ms) - Number(row.start_ms)) < SAME_MOMENT_MS,
    );
    if (!nearby) picked.push(row);
    if (picked.length >= limit) break;
  }
  return picked;
};

export const createSearchRepository = (db: SqlClient) => {
  const selectNoteHits = (match: string, limit: number) =>
    db.select<NoteHitRow & { body: string }>(
      `SELECT n.id AS note_id, COALESCE(n.recording_started_at, n.created_at) AS note_date,
              ${snippetSql("notes_fts")} AS snippet,
              COALESCE(n.enhanced_markdown, n.notes_markdown) AS body
       FROM notes_fts JOIN notes n ON n.rowid = notes_fts.docid
       WHERE notes_fts MATCH ? AND n.deleted_at IS NULL
       ORDER BY note_date DESC LIMIT ?`,
      [match, limit],
    );

  const selectSegmentHits = (match: string, limit: number) =>
    db.select<SegmentHitRow>(
      `SELECT s.id AS segment_id, s.note_id, s.start_ms, s.source, s.speaker, s.text,
              COALESCE(n.recording_started_at, n.created_at) AS note_date,
              ${snippetSql("segments_fts")} AS snippet
       FROM segments_fts
       JOIN transcript_segments s ON s.rowid = segments_fts.docid
       JOIN notes n ON n.id = s.note_id AND n.deleted_at IS NULL
       WHERE segments_fts MATCH ? AND s.deleted_at IS NULL
       ORDER BY note_date DESC, s.start_ms ASC LIMIT ?`,
      [match, limit],
    );

  const search = async (query: string): Promise<NoteSearchResult[]> => {
    const terms = extractSearchTerms(query);
    if (terms.length === 0) return [];
    const match = buildMatchQuery(terms, "all");
    const [noteRows, segmentRows] = await Promise.all([
      selectNoteHits(match, NOTE_HIT_LIMIT),
      selectSegmentHits(match, SEGMENT_HIT_LIMIT),
    ]);
    return groupByNote(noteRows, segmentRows);
  };

  const loadExcerpt = async (row: SegmentHitRow): Promise<MeetingExcerpt> => {
    const startMs = Number(row.start_ms);
    const rows = await db.select<TranscriptRow>(
      `SELECT * FROM transcript_segments
       WHERE note_id = ? AND deleted_at IS NULL AND start_ms BETWEEN ? AND ?
       ORDER BY start_ms ASC`,
      [row.note_id, startMs - CONTEXT_WINDOW_MS, startMs + CONTEXT_WINDOW_MS],
    );
    return {
      noteId: row.note_id,
      startMs,
      segments: rows.map(toTranscriptSegment),
    };
  };

  const findMeetingContext = async ({
    question,
    maxExcerpts = 6,
    maxSummaries = 3,
  }: FindExcerptsInput): Promise<MeetingContextHits> => {
    const terms = extractSearchTerms(question, { dropStopwords: true });
    if (terms.length === 0) return { excerpts: [], summaries: [] };
    const mode: MatchMode = "any";
    const match = buildMatchQuery(terms, mode);
    const [segmentRows, noteRows] = await Promise.all([
      selectSegmentHits(match, SEGMENT_HIT_LIMIT),
      selectNoteHits(match, NOTE_HIT_LIMIT),
    ]);
    const excerpts = await Promise.all(
      pickDistinctMoments(segmentRows, terms, maxExcerpts).map(loadExcerpt),
    );
    const summaries = [...noteRows]
      .sort(
        (a, b) =>
          countMatchedTerms(b.body, terms) - countMatchedTerms(a.body, terms),
      )
      .slice(0, maxSummaries)
      .map((row) => ({
        noteId: row.note_id,
        summary: row.body.slice(0, MAX_NOTE_SUMMARY_CHARS),
      }));
    return { excerpts, summaries };
  };

  return { search, findMeetingContext };
};

export type SearchRepository = ReturnType<typeof createSearchRepository>;
