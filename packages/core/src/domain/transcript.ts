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
  speaker: z.number().int().nonnegative().nullable().default(null),
  createdAt: z.string(),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export type SpeakerNames = Record<string, string>;

const OTHERS_FALLBACK_LABEL = "Pessoa";

interface DescribeSpeakerInput {
  source: TranscriptSource;
  speaker: number | null;
  speakerNames?: SpeakerNames;
}

export const describeSpeaker = ({
  source,
  speaker,
  speakerNames = {},
}: DescribeSpeakerInput): string => {
  if (source === "microphone" || speaker === null)
    return SPEAKER_LABELS[source];
  return (
    speakerNames[String(speaker)] ?? `${OTHERS_FALLBACK_LABEL} ${speaker + 1}`
  );
};

export const LiveSegmentEventSchema = z.object({
  noteId: z.string(),
  source: TranscriptSourceSchema,
  text: z.string(),
  isFinal: z.boolean(),
  startMs: z.number(),
  endMs: z.number(),
  segmentKey: z.string(),
  speaker: z.number().nullable().default(null),
});

export type LiveSegmentEvent = z.infer<typeof LiveSegmentEventSchema>;
