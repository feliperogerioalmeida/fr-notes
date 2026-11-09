import {
  type TranscriptSegment,
  TranscriptSegmentSchema,
  type TranscriptSource,
} from "../domain/transcript.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface SegmentRow {
  id: string;
  note_id: string;
  source: string;
  text: string;
  start_ms: number;
  end_ms: number;
  speaker: number | null;
  created_at: string;
}

const toSegment = (row: SegmentRow): TranscriptSegment =>
  TranscriptSegmentSchema.parse({
    id: row.id,
    noteId: row.note_id,
    source: row.source,
    text: row.text,
    startMs: Number(row.start_ms),
    endMs: Number(row.end_ms),
    speaker: row.speaker === null ? null : Number(row.speaker),
    createdAt: row.created_at,
  });

export interface AppendSegmentInput {
  noteId: string;
  source: TranscriptSource;
  text: string;
  startMs: number;
  endMs: number;
  speaker?: number | null;
}

export const createTranscriptRepository = (db: SqlClient) => {
  const listSegments = async (noteId: string): Promise<TranscriptSegment[]> => {
    const rows = await db.select<SegmentRow>(
      "SELECT * FROM transcript_segments WHERE note_id = ? AND deleted_at IS NULL ORDER BY start_ms ASC",
      [noteId],
    );
    return rows.map(toSegment);
  };

  const appendSegment = async (
    input: AppendSegmentInput,
  ): Promise<TranscriptSegment> => {
    const segment: TranscriptSegment = {
      id: createId(),
      createdAt: nowIso(),
      noteId: input.noteId,
      source: input.source,
      text: input.text,
      startMs: Math.round(input.startMs),
      endMs: Math.round(input.endMs),
      speaker: input.speaker ?? null,
    };
    await db.execute(
      `INSERT INTO transcript_segments (id, note_id, source, text, start_ms, end_ms, speaker, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        segment.id,
        segment.noteId,
        segment.source,
        segment.text,
        segment.startMs,
        segment.endMs,
        segment.speaker,
        segment.createdAt,
        segment.createdAt,
      ],
    );
    return segment;
  };

  const deleteSegment = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE transcript_segments SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  return { listSegments, appendSegment, deleteSegment };
};

export type TranscriptRepository = ReturnType<
  typeof createTranscriptRepository
>;
