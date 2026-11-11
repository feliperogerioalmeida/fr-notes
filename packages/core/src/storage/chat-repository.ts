import {
  type ChatMessage,
  ChatMessageSchema,
  type ChatRole,
  type ChatSource,
} from "../domain/chat.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface ChatRow {
  id: string;
  note_id: string;
  role: string;
  content: string;
  sources_json: string | null;
  created_at: string;
}

const parseSources = (raw: string | null): unknown => {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const toMessage = (row: ChatRow): ChatMessage =>
  ChatMessageSchema.parse({
    id: row.id,
    noteId: row.note_id,
    role: row.role,
    content: row.content,
    sources: parseSources(row.sources_json),
    createdAt: row.created_at,
  });

interface AppendMessageInput {
  noteId: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[];
}

export const createChatRepository = (db: SqlClient) => {
  const listMessages = async (noteId: string): Promise<ChatMessage[]> => {
    const rows = await db.select<ChatRow>(
      "SELECT * FROM chat_messages WHERE note_id = ? AND deleted_at IS NULL ORDER BY created_at ASC",
      [noteId],
    );
    return rows.map(toMessage);
  };

  const appendMessage = async (
    input: AppendMessageInput,
  ): Promise<ChatMessage> => {
    const message: ChatMessage = {
      id: createId(),
      createdAt: nowIso(),
      ...input,
      sources: input.sources ?? [],
    };
    await db.execute(
      `INSERT INTO chat_messages (id, note_id, role, content, sources_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.noteId,
        message.role,
        message.content,
        JSON.stringify(message.sources),
        message.createdAt,
        message.createdAt,
      ],
    );
    return message;
  };

  const clearMessages = async (noteId: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE chat_messages SET deleted_at = ?, updated_at = ? WHERE note_id = ? AND deleted_at IS NULL",
      [timestamp, timestamp, noteId],
    );
  };

  return { listMessages, appendMessage, clearMessages };
};

export type ChatRepository = ReturnType<typeof createChatRepository>;
