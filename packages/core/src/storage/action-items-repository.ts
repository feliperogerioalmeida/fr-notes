import {
  type ActionItem,
  ActionItemSchema,
  type SentRef,
} from "../domain/action-item.js";
import {
  extractActionItems,
  type ParsedActionItem,
} from "../notes/action-items.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface ActionItemRow {
  id: string;
  note_id: string;
  item_key: string;
  text: string;
  owner: string | null;
  due_text: string | null;
  done: number;
  position: number;
  sent_to_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const parseSentTo = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const toActionItem = (row: ActionItemRow): ActionItem =>
  ActionItemSchema.parse({
    id: row.id,
    noteId: row.note_id,
    key: row.item_key,
    text: row.text,
    owner: row.owner,
    dueText: row.due_text,
    done: Number(row.done) === 1,
    position: Number(row.position),
    sentTo: parseSentTo(row.sent_to_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

interface SyncInput {
  noteId: string;
  markdown: string;
}

interface SetDoneInput {
  id: string;
  done: boolean;
}

interface RecordSentInput {
  id: string;
  ref: SentRef;
}

export const createActionItemsRepository = (db: SqlClient) => {
  const listForNote = async (noteId: string): Promise<ActionItem[]> => {
    const rows = await db.select<ActionItemRow>(
      "SELECT * FROM action_items WHERE note_id = ? AND deleted_at IS NULL ORDER BY position ASC",
      [noteId],
    );
    return rows.map(toActionItem);
  };

  const listAll = async (): Promise<ActionItem[]> => {
    const rows = await db.select<ActionItemRow>(
      `SELECT action_items.* FROM action_items
       JOIN notes ON notes.id = action_items.note_id AND notes.deleted_at IS NULL
       WHERE action_items.deleted_at IS NULL
       ORDER BY action_items.created_at DESC, action_items.position ASC`,
    );
    return rows.map(toActionItem);
  };

  const upsertParsed = async (
    noteId: string,
    parsed: ParsedActionItem,
    position: number,
    existing: ActionItem | undefined,
  ) => {
    const timestamp = nowIso();
    if (existing) {
      await db.execute(
        "UPDATE action_items SET text = ?, owner = ?, due_text = ?, done = ?, position = ?, updated_at = ? WHERE id = ?",
        [
          parsed.text,
          parsed.owner,
          parsed.dueText,
          parsed.done ? 1 : 0,
          position,
          timestamp,
          existing.id,
        ],
      );
      return;
    }
    await db.execute(
      `INSERT INTO action_items (id, note_id, item_key, text, owner, due_text, done, position, sent_to_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
      [
        createId(),
        noteId,
        parsed.key,
        parsed.text,
        parsed.owner,
        parsed.dueText,
        parsed.done ? 1 : 0,
        position,
        timestamp,
        timestamp,
      ],
    );
  };

  const removeMissing = async (current: ActionItem[], keys: Set<string>) => {
    const timestamp = nowIso();
    for (const item of current.filter((entry) => !keys.has(entry.key))) {
      await db.execute(
        "UPDATE action_items SET deleted_at = ?, updated_at = ? WHERE id = ?",
        [timestamp, timestamp, item.id],
      );
    }
  };

  const syncFromMarkdown = async ({ noteId, markdown }: SyncInput) => {
    const parsed = extractActionItems(markdown);
    const current = await listForNote(noteId);
    const byKey = new Map(current.map((item) => [item.key, item]));
    for (const [position, item] of parsed.entries()) {
      await upsertParsed(noteId, item, position, byKey.get(item.key));
    }
    await removeMissing(current, new Set(parsed.map((item) => item.key)));
    return listForNote(noteId);
  };

  const setDone = ({ id, done }: SetDoneInput) =>
    db.execute(
      "UPDATE action_items SET done = ?, updated_at = ? WHERE id = ?",
      [done ? 1 : 0, nowIso(), id],
    );

  const recordSent = async ({ id, ref }: RecordSentInput) => {
    const rows = await db.select<ActionItemRow>(
      "SELECT * FROM action_items WHERE id = ?",
      [id],
    );
    const item = rows[0] ? toActionItem(rows[0]) : null;
    if (!item) return;
    await db.execute(
      "UPDATE action_items SET sent_to_json = ?, updated_at = ? WHERE id = ?",
      [JSON.stringify([...item.sentTo, ref]), nowIso(), id],
    );
  };

  return { listForNote, listAll, syncFromMarkdown, setDone, recordSent };
};

export type ActionItemsRepository = ReturnType<
  typeof createActionItemsRepository
>;
