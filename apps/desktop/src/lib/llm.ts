import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { Settings } from "@workspace/core";
import { createGateway, type ModelMessage, streamText } from "ai";

import { readSecret, SECRET_KEYS } from "./native.js";

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("llm_not_configured");
  }
}

type LlmSettings = Pick<
  Settings,
  "llmProvider" | "llmModel" | "llmBaseUrl" | "llmThinking"
>;

const OPENAI_COMPATIBLE_NAME = "fr-notes-llm";
const OPENAI_COMPATIBLE_OPTIONS_KEY = "frNotesLlm";

const TRAILING_URL_JUNK = /[\s,;/]+$/;

const normalizeBaseUrl = (url: string) =>
  url.trim().replace(TRAILING_URL_JUNK, "");

const buildModel = (settings: LlmSettings, apiKey: string | null) => {
  if (settings.llmProvider === "gateway") {
    return createGateway({ apiKey: apiKey ?? "", fetch: tauriFetch })(
      settings.llmModel,
    );
  }
  return createOpenAICompatible({
    name: OPENAI_COMPATIBLE_NAME,
    baseURL: normalizeBaseUrl(settings.llmBaseUrl),
    apiKey: apiKey ?? undefined,
    fetch: tauriFetch,
  }).chatModel(settings.llmModel);
};

const buildProviderOptions = (settings: LlmSettings) =>
  settings.llmProvider === "openai-compatible" && !settings.llmThinking
    ? { [OPENAI_COMPATIBLE_OPTIONS_KEY]: { reasoningEffort: "none" } }
    : undefined;

const isConfigured = (settings: LlmSettings, apiKey: string | null) => {
  if (!settings.llmModel.trim()) return false;
  if (settings.llmProvider === "gateway") return Boolean(apiKey);
  return Boolean(normalizeBaseUrl(settings.llmBaseUrl));
};

interface StreamCompletionInput {
  settings: LlmSettings;
  instructions: string;
  messages: ModelMessage[];
  signal?: AbortSignal;
  onText: (text: string) => void;
}

export const streamCompletion = async ({
  settings,
  instructions,
  messages,
  signal,
  onText,
}: StreamCompletionInput): Promise<string> => {
  const apiKey = await readSecret(SECRET_KEYS.llm);
  if (!isConfigured(settings, apiKey)) throw new LlmNotConfiguredError();
  let streamError: unknown = null;
  const result = streamText({
    model: buildModel(settings, apiKey),
    providerOptions: buildProviderOptions(settings),
    instructions,
    messages,
    abortSignal: signal,
    onError: ({ error }) => {
      streamError = error;
    },
  });
  let text = "";
  for await (const delta of result.textStream) {
    text += delta;
    onText(text);
  }
  if (streamError) throw streamError;
  return text;
};
