import { LlmNotConfiguredError } from "./llm.js";
import {
  ACCESSIBILITY_REQUIRED_ERROR,
  CALENDAR_DENIED_ERROR,
  MISSING_DEEPGRAM_KEY_ERROR,
  NO_RECORDINGS_ERROR,
  SYSTEM_AUDIO_DENIED_ERROR,
} from "./native.js";

const MESSAGES: Record<string, string> = {
  [MISSING_DEEPGRAM_KEY_ERROR]:
    "Configure a chave da Deepgram em Configurações para transcrever.",
  [SYSTEM_AUDIO_DENIED_ERROR]:
    "Permita “Gravação de Áudio do Sistema” para transcrever os outros participantes.",
  [ACCESSIBILITY_REQUIRED_ERROR]:
    "Permita o FR Notes em Acessibilidade para digitar o ditado nos outros apps.",
  [CALENDAR_DENIED_ERROR]:
    "Permita o acesso ao Calendário em Configurações para ver suas reuniões.",
  calendar_event_read_only:
    "Este evento é só leitura: é um convite de outra pessoa ou de uma agenda que não aceita alterações.",
  calendar_event_not_found:
    "Não encontrei este evento no Calendário. Ele pode ter mudado em outro aparelho; atualize a agenda.",
  [NO_RECORDINGS_ERROR]:
    "Esta reunião não tem áudio guardado. Ligue “Guardar o áudio” em Configurações → Transcrição.",
};

const LLM_NOT_CONFIGURED_MESSAGE =
  "Configure o provedor, o modelo e a chave de IA em Configurações.";

export const readErrorCode = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const describeError = (error: unknown): string => {
  if (error instanceof LlmNotConfiguredError) return LLM_NOT_CONFIGURED_MESSAGE;
  const code = readErrorCode(error);
  return MESSAGES[code] ?? code;
};
