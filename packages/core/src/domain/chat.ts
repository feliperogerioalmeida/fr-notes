import { z } from "zod";

export const CHAT_ROLES = ["user", "assistant"] as const;

export const ChatRoleSchema = z.enum(CHAT_ROLES);

export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatSourceSchema = z.object({
  index: z.number().int().positive(),
  noteId: z.string(),
  atMs: z.number().nullable(),
  title: z.string(),
  label: z.string(),
});

export type ChatSource = z.infer<typeof ChatSourceSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  noteId: z.string().min(1),
  role: ChatRoleSchema,
  content: z.string(),
  sources: z.array(ChatSourceSchema).default([]),
  createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
