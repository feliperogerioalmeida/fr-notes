import { type CalendarEvent, type Note, toParticipants } from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export interface PrepareNoteInput {
  folderId?: string | null;
  event?: CalendarEvent | null;
}

const createEventNote = async (event: CalendarEvent): Promise<Note> => {
  const storage = await getStorage();
  const existing = await storage.notes.findNoteByCalendarEvent(event.id);
  if (existing) return existing;
  return storage.notes.createNote({
    title: event.title,
    calendarEventId: event.id,
    participants: toParticipants(event),
  });
};

export const prepareNote = async ({
  folderId = null,
  event = null,
}: PrepareNoteInput): Promise<Note> => {
  const storage = await getStorage();
  const note = event
    ? await createEventNote(event)
    : await storage.notes.createNote({ folderId });
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allNotes });
  return note;
};
