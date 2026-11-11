import {
  type TranscriptDigest,
  TranscriptDigestSchema,
} from "../domain/digest.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface DigestRow {
  id: string;
  note_id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  created_at: string;
}

const toDigest = (row: DigestRow): TranscriptDigest =>
  TranscriptDigestSchema.parse({
    id: row.id,
    noteId: row.note_id,
    startMs: Number(row.start_ms),
    endMs: Number(row.end_ms),
    text: row.text,
    createdAt: row.created_at,
  });

export interface SaveDigestInput {
  noteId: string;
  startMs: number;
  endMs: number;
  text: string;
}

export const createDigestsRepository = (db: SqlClient) => {
  const listDigests = async (noteId: string): Promise<TranscriptDigest[]> => {
    const rows = await db.select<DigestRow>(
      "SELECT * FROM transcript_digests WHERE note_id = ? AND deleted_at IS NULL ORDER BY start_ms ASC",
      [noteId],
    );
    return rows.map(toDigest);
  };

  const saveDigest = async (input: SaveDigestInput): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      `INSERT INTO transcript_digests (id, note_id, start_ms, end_ms, text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        createId(),
        input.noteId,
        input.startMs,
        input.endMs,
        input.text.trim(),
        timestamp,
        timestamp,
      ],
    );
  };

  const clearDigests = async (noteId: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE transcript_digests SET deleted_at = ?, updated_at = ? WHERE note_id = ? AND deleted_at IS NULL",
      [timestamp, timestamp, noteId],
    );
  };

  return { listDigests, saveDigest, clearDigests };
};

export type DigestsRepository = ReturnType<typeof createDigestsRepository>;
