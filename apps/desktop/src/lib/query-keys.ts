import type { ListNotesInput } from "@workspace/core";

export const QUERY_KEYS = {
  notes: (filters: ListNotesInput = {}) => ["notes", filters] as const,
  allNotes: ["notes"] as const,
  note: (id: string) => ["note", id] as const,
  transcript: (noteId: string) => ["transcript", noteId] as const,
  chat: (noteId: string) => ["chat", noteId] as const,
  folders: ["folders"] as const,
  templates: ["templates"] as const,
  settings: ["settings"] as const,
  secrets: ["secrets"] as const,
  permissions: ["permissions"] as const,
  calendarEvents: ["calendar-events"] as const,
  calendarEventsRange: (daysBack: number, daysAhead: number) =>
    ["calendar-events", daysBack, daysAhead] as const,
  calendars: ["calendars"] as const,
  webhooks: ["webhooks"] as const,
  dictations: ["dictations"] as const,
};
