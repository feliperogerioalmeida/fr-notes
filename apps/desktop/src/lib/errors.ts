import { LlmNotConfiguredError } from "./llm.js";
import {
  CALENDAR_DENIED_ERROR,
  MISSING_DEEPGRAM_KEY_ERROR,
  SYSTEM_AUDIO_DENIED_ERROR,
} from "./native.js";

const MESSAGES: Record<string, string> = {
  [MISSING_DEEPGRAM_KEY_ERROR]:
    "Configure a chave da Deepgram em Configurações para transcrever.",
  [SYSTEM_AUDIO_DENIED_ERROR]:
    "Permita “Gravação de Áudio do Sistema” para transcrever os outros participantes.",
  [CALENDAR_DENIED_ERROR]:
    "Permita o acesso ao Calendário em Configurações para ver suas reuniões.",
};

const LLM_NOT_CONFIGURED_MESSAGE =
  "Configure o provedor, o modelo e a chave de IA em Configurações.";

export const describeError = (error: unknown): string => {
  if (error instanceof LlmNotConfiguredError) return LLM_NOT_CONFIGURED_MESSAGE;
  const raw = error instanceof Error ? error.message : String(error);
  return MESSAGES[raw] ?? raw;
};
