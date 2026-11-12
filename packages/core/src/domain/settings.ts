import { z } from "zod";

export const TRANSCRIPTION_LANGUAGES = ["pt-BR", "en", "multi"] as const;

export const THEMES = ["dark", "light", "system"] as const;

export const LLM_PROVIDERS = ["gateway", "openai-compatible"] as const;

export const FEATURE_LLM_PROVIDERS = ["same", ...LLM_PROVIDERS] as const;

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

const SettingsObjectSchema = z.object({
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
  dictationLlmProvider: z.enum(FEATURE_LLM_PROVIDERS).default("same"),
  dictationLlmModel: z.string().default(""),
  recordingShortcut: z.enum(RECORDING_SHORTCUTS).default("alt-shift-r"),
  keyterms: z.array(z.string()).default([]),
  defaultTemplateId: z.string().default(DEFAULT_TEMPLATE_ID),
  llmProvider: z.enum(LLM_PROVIDERS).default("gateway"),
  llmGatewayModel: z.string().default(""),
  llmCompatibleModel: z.string().default(""),
  llmBaseUrl: z.string().default(""),
  llmThinking: z.boolean().default(false),
  llmDigestDuringMeeting: z.boolean().default(true),
  askLlmProvider: z.enum(FEATURE_LLM_PROVIDERS).default("same"),
  askLlmModel: z.string().default(""),
  theme: z.enum(THEMES).default("dark"),
});

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const LLM_MODEL_SETTING = {
  gateway: "llmGatewayModel",
  "openai-compatible": "llmCompatibleModel",
} as const satisfies Record<LlmProvider, string>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const migrateLegacyModel = (stored: unknown) => {
  if (!isRecord(stored) || typeof stored.llmModel !== "string") return stored;
  const provider =
    stored.llmProvider === "openai-compatible"
      ? "openai-compatible"
      : "gateway";
  const target = LLM_MODEL_SETTING[provider];
  if (typeof stored[target] === "string") return stored;
  return { ...stored, [target]: stored.llmModel };
};

export const SettingsSchema = z.preprocess(
  migrateLegacyModel,
  SettingsObjectSchema,
);

export type Settings = z.infer<typeof SettingsObjectSchema>;

export const resolveLlmModel = (
  settings: Pick<
    Settings,
    "llmProvider" | "llmGatewayModel" | "llmCompatibleModel"
  >,
): string => settings[LLM_MODEL_SETTING[settings.llmProvider]].trim();

export type MeetingDetectionMode = Settings["meetingDetection"];

export type DictationTrigger = Settings["dictationTrigger"];

export type RecordingShortcut = Settings["recordingShortcut"];

export type TranscriptionLanguage = Settings["transcriptionLanguage"];

export type Theme = Settings["theme"];

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});

export type FeatureLlmProvider = Settings["dictationLlmProvider"];

export const FEATURE_LLM_SETTINGS = {
  ask: { provider: "askLlmProvider", model: "askLlmModel" },
  dictation: { provider: "dictationLlmProvider", model: "dictationLlmModel" },
} as const;

export type LlmFeature = keyof typeof FEATURE_LLM_SETTINGS;

const FEATURES_WITHOUT_REASONING: LlmFeature[] = ["dictation"];

export const resolveFeatureLlm = (
  settings: Settings,
  feature: LlmFeature,
): Settings => {
  const keys = FEATURE_LLM_SETTINGS[feature];
  const choice = settings[keys.provider];
  const provider = choice === "same" ? settings.llmProvider : choice;
  const model = choice === "same" ? "" : settings[keys.model].trim();
  return {
    ...settings,
    llmProvider: provider,
    llmThinking: FEATURES_WITHOUT_REASONING.includes(feature)
      ? false
      : settings.llmThinking,
    ...(model ? { [LLM_MODEL_SETTING[provider]]: model } : {}),
  };
};
