import type { Settings } from "@workspace/core";

const STORAGE_KEY = "fr-notes:llm-read-rate";
const CHARS_PER_TOKEN = 3.5;
const SMOOTHING = 0.5;
const MIN_SAMPLE_MS = 1_500;
const DEFAULT_TOKENS_PER_SECOND: Record<Settings["llmProvider"], number> = {
  "openai-compatible": 20,
  gateway: 1_500,
};

type RateSettings = Pick<Settings, "llmProvider" | "llmModel">;

const rateKey = ({ llmProvider, llmModel }: RateSettings) =>
  `${llmProvider}:${llmModel}`;

const readRates = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
};

export const estimateTokens = (chars: number) =>
  Math.ceil(chars / CHARS_PER_TOKEN);

export const estimateReadMs = (settings: RateSettings, chars: number) => {
  const rate =
    readRates()[rateKey(settings)] ??
    DEFAULT_TOKENS_PER_SECOND[settings.llmProvider];
  return (estimateTokens(chars) / rate) * 1_000;
};

interface RecordReadInput {
  settings: RateSettings;
  chars: number;
  elapsedMs: number;
}

export const recordReadRate = ({
  settings,
  chars,
  elapsedMs,
}: RecordReadInput) => {
  if (elapsedMs < MIN_SAMPLE_MS) return;
  const measured = estimateTokens(chars) / (elapsedMs / 1_000);
  const rates = readRates();
  const previous = rates[rateKey(settings)];
  rates[rateKey(settings)] =
    previous === undefined
      ? measured
      : previous * (1 - SMOOTHING) + measured * SMOOTHING;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
  } catch {
    return;
  }
};
