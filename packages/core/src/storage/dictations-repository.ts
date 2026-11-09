import {
  type Dictation,
  type DictationInput,
  DictationSchema,
} from "../domain/dictation.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface DictationRow {
  id: string;
  text: string;
  raw_text: string;
  polished: number;
  inserted: number;
  target_app_name: string | null;
  target_app_bundle_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const DEFAULT_LIMIT = 200;

const toDictation = (row: DictationRow): Dictation =>
  DictationSchema.parse({
    id: row.id,
    text: row.text,
    rawText: row.raw_text,
    polished: Number(row.polished) === 1,
    inserted: Number(row.inserted) === 1,
    targetAppName: row.target_app_name,
    targetAppBundleId: row.target_app_bundle_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

export const createDictationsRepository = (db: SqlClient) => {
  const listDictations = async (
    limit: number = DEFAULT_LIMIT,
  ): Promise<Dictation[]> => {
    const rows = await db.select<DictationRow>(
      "SELECT * FROM dictations WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?",
      [limit],
    );
    return rows.map(toDictation);
  };

  const appendDictation = async (input: DictationInput): Promise<string> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      `INSERT INTO dictations (id, text, raw_text, polished, inserted, target_app_name, target_app_bundle_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.text,
        input.rawText,
        input.polished ? 1 : 0,
        input.inserted ? 1 : 0,
        input.targetAppName,
        input.targetAppBundleId,
        timestamp,
        timestamp,
      ],
    );
    return id;
  };

  const deleteDictation = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE dictations SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  return { listDictations, appendDictation, deleteDictation };
};

export type DictationsRepository = ReturnType<
  typeof createDictationsRepository
>;
