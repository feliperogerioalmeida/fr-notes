import type { TranscriptSource } from "../domain/transcript.js";

const ECHO_WINDOW_MS = 4000;
const MIN_TOKENS = 3;
const ECHO_SIMILARITY = 0.6;
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

export interface TimedText {
  source: TranscriptSource;
  text: string;
  startMs: number;
  endMs: number;
}

const tokenize = (text: string): string[] =>
  text
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .match(TOKEN_PATTERN) ?? [];

const overlapsInTime = (first: TimedText, second: TimedText): boolean =>
  first.startMs <= second.endMs + ECHO_WINDOW_MS &&
  second.startMs <= first.endMs + ECHO_WINDOW_MS;

export const measureContainment = (candidate: string, reference: string) => {
  const candidateTokens = tokenize(candidate);
  if (candidateTokens.length < MIN_TOKENS) return 0;
  const referenceTokens = new Set(tokenize(reference));
  const shared = candidateTokens.filter((token) => referenceTokens.has(token));
  return shared.length / candidateTokens.length;
};

interface EchoCheckInput {
  microphone: TimedText;
  system: TimedText[];
}

export const isLikelyEcho = ({
  microphone,
  system,
}: EchoCheckInput): boolean => {
  const nearby = system.filter((segment) =>
    overlapsInTime(segment, microphone),
  );
  if (nearby.length === 0) return false;
  const reference = nearby.map((segment) => segment.text).join(" ");
  return measureContainment(microphone.text, reference) >= ECHO_SIMILARITY;
};
