import {
  SPEAKER_LABELS,
  type TranscriptSegment,
  type TranscriptSource,
} from "../domain/transcript.js";
import { formatElapsed } from "../utils/dates.js";

const MAX_TURN_GAP_MS = 4000;

export interface TranscriptTurn {
  key: string;
  source: TranscriptSource;
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
}

const sortByStart = (segments: TranscriptSegment[]): TranscriptSegment[] =>
  [...segments].sort((first, second) => first.startMs - second.startMs);

const toTurn = (segment: TranscriptSegment): TranscriptTurn => ({
  key: segment.id,
  source: segment.source,
  speaker: SPEAKER_LABELS[segment.source],
  text: segment.text.trim(),
  startMs: segment.startMs,
  endMs: segment.endMs,
});

const canMerge = (turn: TranscriptTurn, segment: TranscriptSegment): boolean =>
  turn.source === segment.source &&
  segment.startMs - turn.endMs <= MAX_TURN_GAP_MS;

export const groupIntoTurns = (
  segments: TranscriptSegment[],
): TranscriptTurn[] =>
  sortByStart(segments).reduce<TranscriptTurn[]>((turns, segment) => {
    const last = turns.at(-1);
    if (!last || !canMerge(last, segment)) return [...turns, toTurn(segment)];
    last.text = `${last.text} ${segment.text.trim()}`;
    last.endMs = Math.max(last.endMs, segment.endMs);
    return turns;
  }, []);

export const formatTranscriptForPrompt = (
  segments: TranscriptSegment[],
): string => {
  const turns = groupIntoTurns(segments);
  const origin = turns[0]?.startMs ?? 0;
  return turns
    .map(
      (turn) =>
        `[${formatElapsed(turn.startMs - origin)}] ${turn.speaker}: ${turn.text}`,
    )
    .join("\n");
};
