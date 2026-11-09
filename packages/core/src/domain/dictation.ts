import { z } from "zod";

export const DictationSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  rawText: z.string(),
  polished: z.boolean(),
  inserted: z.boolean(),
  targetAppName: z.string().nullable(),
  targetAppBundleId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Dictation = z.infer<typeof DictationSchema>;

export type DictationInput = Pick<
  Dictation,
  | "text"
  | "rawText"
  | "polished"
  | "inserted"
  | "targetAppName"
  | "targetAppBundleId"
>;
