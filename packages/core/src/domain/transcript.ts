import { z } from "zod";

export const TRANSCRIPT_SOURCES = ["microphone", "system"] as const;

export const TranscriptSourceSchema = z.enum(TRANSCRIPT_SOURCES);

export type TranscriptSource = z.infer<typeof TranscriptSourceSchema>;

export const SPEAKER_LABELS: Record<TranscriptSource, string> = {
  microphone: "Eu",
  system: "Eles",
};

export const TranscriptSegmentSchema = z.object({
  id: z.string().min(1),
  noteId: z.string().min(1),
  source: TranscriptSourceSchema,
  text: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const LiveSegmentEventSchema = z.object({
  noteId: z.string(),
  source: TranscriptSourceSchema,
  text: z.string(),
  isFinal: z.boolean(),
  startMs: z.number(),
  endMs: z.number(),
  segmentKey: z.string(),
});

export type LiveSegmentEvent = z.infer<typeof LiveSegmentEventSchema>;
