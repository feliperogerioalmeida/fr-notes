import { z } from "zod";

export const SentRefSchema = z.object({
  connectionId: z.string(),
  provider: z.string(),
  externalId: z.string().nullable(),
  url: z.string().nullable(),
  sentAt: z.string(),
});

export type SentRef = z.infer<typeof SentRefSchema>;

export const ActionItemSchema = z.object({
  id: z.string().min(1),
  noteId: z.string().min(1),
  key: z.string(),
  text: z.string(),
  owner: z.string().nullable(),
  dueText: z.string().nullable(),
  done: z.boolean(),
  position: z.number().int(),
  sentTo: z.array(SentRefSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;
