import { z } from "zod";

export const TRANSCRIPTION_LANGUAGES = ["pt-BR", "en", "multi"] as const;

export const THEMES = ["dark", "light", "system"] as const;

export const LLM_PROVIDERS = ["gateway", "openai-compatible"] as const;

export const MEETING_DETECTION_MODES = ["ask", "auto", "off"] as const;

export const DEFAULT_TEMPLATE_ID = "builtin-general";

export const SettingsSchema = z.object({
  userName: z.string().default(""),
  userBio: z.string().default(""),
  transcriptionLanguage: z.enum(TRANSCRIPTION_LANGUAGES).default("pt-BR"),
  captureSystemAudio: z.boolean().default(true),
  echoCancellation: z.boolean().default(true),
  meetingDetection: z.enum(MEETING_DETECTION_MODES).default("ask"),
  autoStopRecording: z.boolean().default(true),
  meetingReminders: z.boolean().default(true),
  hiddenCalendarIds: z.array(z.string()).default([]),
  keyterms: z.array(z.string()).default([]),
  defaultTemplateId: z.string().default(DEFAULT_TEMPLATE_ID),
  llmProvider: z.enum(LLM_PROVIDERS).default("gateway"),
  llmModel: z.string().default(""),
  llmBaseUrl: z.string().default(""),
  theme: z.enum(THEMES).default("dark"),
});

export type Settings = z.infer<typeof SettingsSchema>;

export type LlmProvider = Settings["llmProvider"];

export type MeetingDetectionMode = Settings["meetingDetection"];

export type TranscriptionLanguage = Settings["transcriptionLanguage"];

export type Theme = Settings["theme"];

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
