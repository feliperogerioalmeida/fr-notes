import { z } from "zod";

export const TRANSCRIPTION_LANGUAGES = ["pt-BR", "en", "multi"] as const;

export const THEMES = ["dark", "light", "system"] as const;

export const LLM_PROVIDERS = ["gateway", "openai-compatible"] as const;

export const MEETING_DETECTION_MODES = ["ask", "auto", "off"] as const;

export const DICTATION_TRIGGERS = [
  "fn",
  "alt-space",
  "ctrl-alt-space",
  "cmd-shift-space",
] as const;

export const RECORDING_SHORTCUTS = [
  "alt-shift-r",
  "ctrl-alt-r",
  "off",
] as const;

export const DEFAULT_TEMPLATE_ID = "builtin-general";

export const SettingsSchema = z.object({
  userName: z.string().default(""),
  userBio: z.string().default(""),
  transcriptionLanguage: z.enum(TRANSCRIPTION_LANGUAGES).default("pt-BR"),
  captureSystemAudio: z.boolean().default(true),
  echoCancellation: z.boolean().default(true),
  keepMeetingAudio: z.boolean().default(true),
  audioRetentionDays: z.number().int().min(0).default(30),
  meetingDetection: z.enum(MEETING_DETECTION_MODES).default("ask"),
  autoStopRecording: z.boolean().default(true),
  meetingReminders: z.boolean().default(true),
  speakerDetection: z.boolean().default(true),
  speakerDiagnostics: z.boolean().default(true),
  hiddenCalendarIds: z.array(z.string()).default([]),
  dictationEnabled: z.boolean().default(true),
  dictationTrigger: z.enum(DICTATION_TRIGGERS).default("fn"),
  dictationPolish: z.boolean().default(false),
  recordingShortcut: z.enum(RECORDING_SHORTCUTS).default("alt-shift-r"),
  keyterms: z.array(z.string()).default([]),
  defaultTemplateId: z.string().default(DEFAULT_TEMPLATE_ID),
  llmProvider: z.enum(LLM_PROVIDERS).default("gateway"),
  llmModel: z.string().default(""),
  llmBaseUrl: z.string().default(""),
  llmThinking: z.boolean().default(false),
  llmDigestDuringMeeting: z.boolean().default(true),
  theme: z.enum(THEMES).default("dark"),
});

export type Settings = z.infer<typeof SettingsSchema>;

export type LlmProvider = Settings["llmProvider"];

export type MeetingDetectionMode = Settings["meetingDetection"];

export type DictationTrigger = Settings["dictationTrigger"];

export type RecordingShortcut = Settings["recordingShortcut"];

export type TranscriptionLanguage = Settings["transcriptionLanguage"];

export type Theme = Settings["theme"];

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
