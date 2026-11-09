import { z } from "zod";

import { ParticipantSchema } from "./calendar.js";

export const NOTE_STATUSES = ["draft", "recording", "done"] as const;

export const NoteStatusSchema = z.enum(NOTE_STATUSES);

export type NoteStatus = z.infer<typeof NoteStatusSchema>;

export const NoteSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  notesMarkdown: z.string(),
  enhancedMarkdown: z.string().nullable(),
  templateId: z.string().nullable(),
  folderId: z.string().nullable(),
  calendarEventId: z.string().nullable(),
  participants: z.array(ParticipantSchema),
  speakerNames: z.record(z.string(), z.string()),
  status: NoteStatusSchema,
  recordingStartedAt: z.string().nullable(),
  recordingEndedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Note = z.infer<typeof NoteSchema>;

export const NotePatchSchema = NoteSchema.pick({
  title: true,
  notesMarkdown: true,
  enhancedMarkdown: true,
  templateId: true,
  folderId: true,
  calendarEventId: true,
  participants: true,
  speakerNames: true,
  status: true,
  recordingStartedAt: true,
  recordingEndedAt: true,
}).partial();

export type NotePatch = z.infer<typeof NotePatchSchema>;
