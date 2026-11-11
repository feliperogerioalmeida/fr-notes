import { z } from "zod";

export const TranscriptDigestSchema = z.object({
  id: z.string().min(1),
  noteId: z.string().min(1),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string(),
  createdAt: z.string(),
});

export type TranscriptDigest = z.infer<typeof TranscriptDigestSchema>;
