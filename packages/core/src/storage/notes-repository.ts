import type { Participant } from "../domain/calendar.js";
import { type Note, type NotePatch, NoteSchema } from "../domain/note.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient, SqlValue } from "./sql-client.js";

interface NoteRow {
  id: string;
  title: string;
  notes_markdown: string;
  enhanced_markdown: string | null;
  template_id: string | null;
  folder_id: string | null;
  calendar_event_id: string | null;
  participants_json: string;
  status: string;
  recording_started_at: string | null;
  recording_ended_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const PATCH_COLUMNS: Record<keyof NotePatch, keyof NoteRow> = {
  title: "title",
  notesMarkdown: "notes_markdown",
  enhancedMarkdown: "enhanced_markdown",
  templateId: "template_id",
  folderId: "folder_id",
  calendarEventId: "calendar_event_id",
  participants: "participants_json",
  status: "status",
  recordingStartedAt: "recording_started_at",
  recordingEndedAt: "recording_ended_at",
};

const parseParticipants = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const toSqlValue = (value: NotePatch[keyof NotePatch]): SqlValue =>
  Array.isArray(value) ? JSON.stringify(value) : (value ?? null);

const toNote = (row: NoteRow): Note =>
  NoteSchema.parse({
    id: row.id,
    title: row.title,
    notesMarkdown: row.notes_markdown,
    enhancedMarkdown: row.enhanced_markdown,
    templateId: row.template_id,
    folderId: row.folder_id,
    calendarEventId: row.calendar_event_id,
    participants: parseParticipants(row.participants_json),
    status: row.status,
    recordingStartedAt: row.recording_started_at,
    recordingEndedAt: row.recording_ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

export interface ListNotesInput {
  folderId?: string | null;
  query?: string;
}

export interface CreateNoteInput {
  title?: string;
  folderId?: string | null;
  templateId?: string | null;
  calendarEventId?: string | null;
  participants?: Participant[];
}

interface UpdateNoteInput {
  id: string;
  patch: NotePatch;
}

const buildListFilters = ({ folderId, query }: ListNotesInput) => {
  const clauses = ["deleted_at IS NULL"];
  const params: SqlValue[] = [];
  if (folderId) {
    clauses.push("folder_id = ?");
    params.push(folderId);
  }
  if (query?.trim()) {
    const pattern = `%${query.trim()}%`;
    clauses.push(
      "(title LIKE ? OR notes_markdown LIKE ? OR enhanced_markdown LIKE ?)",
    );
    params.push(pattern, pattern, pattern);
  }
  return { where: clauses.join(" AND "), params };
};

const buildPatchAssignments = (patch: NotePatch) => {
  const entries = Object.entries(patch).filter(
    ([, value]) => value !== undefined,
  ) as [keyof NotePatch, NotePatch[keyof NotePatch]][];
  return {
    assignments: entries.map(([key]) => `${PATCH_COLUMNS[key]} = ?`),
    values: entries.map(([, value]) => toSqlValue(value)),
  };
};

export const createNotesRepository = (db: SqlClient) => {
  const findNote = async (id: string): Promise<Note | null> => {
    const rows = await db.select<NoteRow>(
      "SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    return rows[0] ? toNote(rows[0]) : null;
  };

  const findNoteByCalendarEvent = async (
    calendarEventId: string,
  ): Promise<Note | null> => {
    const rows = await db.select<NoteRow>(
      "SELECT * FROM notes WHERE calendar_event_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [calendarEventId],
    );
    return rows[0] ? toNote(rows[0]) : null;
  };

  const listNotes = async (input: ListNotesInput = {}): Promise<Note[]> => {
    const { where, params } = buildListFilters(input);
    const rows = await db.select<NoteRow>(
      `SELECT * FROM notes WHERE ${where} ORDER BY COALESCE(recording_started_at, created_at) DESC`,
      params,
    );
    return rows.map(toNote);
  };

  const createNote = async (input: CreateNoteInput = {}): Promise<Note> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      `INSERT INTO notes (id, title, notes_markdown, template_id, folder_id, calendar_event_id, participants_json, status, created_at, updated_at)
       VALUES (?, ?, '', ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        id,
        input.title ?? "",
        input.templateId ?? null,
        input.folderId ?? null,
        input.calendarEventId ?? null,
        JSON.stringify(input.participants ?? []),
        timestamp,
        timestamp,
      ],
    );
    const note = await findNote(id);
    if (!note) throw new Error(`Note ${id} was not persisted`);
    return note;
  };

  const updateNote = async ({ id, patch }: UpdateNoteInput): Promise<void> => {
    const { assignments, values } = buildPatchAssignments(patch);
    if (assignments.length === 0) return;
    await db.execute(
      `UPDATE notes SET ${assignments.join(", ")}, updated_at = ? WHERE id = ?`,
      [...values, nowIso(), id],
    );
  };

  const deleteNote = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  return {
    findNote,
    findNoteByCalendarEvent,
    listNotes,
    createNote,
    updateNote,
    deleteNote,
  };
};

export type NotesRepository = ReturnType<typeof createNotesRepository>;
