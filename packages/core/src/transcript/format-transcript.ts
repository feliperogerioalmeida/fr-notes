import {
  describeSpeaker,
  type SpeakerNames,
  type TranscriptSegment,
  type TranscriptSource,
} from "../domain/transcript.js";
import { formatElapsed } from "../utils/dates.js";

const MAX_TURN_GAP_MS = 4000;

export interface TranscriptTurn {
  key: string;
  source: TranscriptSource;
  speakerIndex: number | null;
  speaker: string;
  text: string;
  startMs: number;
  endMs: number;
}

const sortByStart = (segments: TranscriptSegment[]): TranscriptSegment[] =>
  [...segments].sort((first, second) => first.startMs - second.startMs);

const toTurn = (
  segment: TranscriptSegment,
  speakerNames: SpeakerNames,
): TranscriptTurn => ({
  key: segment.id,
  source: segment.source,
  speakerIndex: segment.speaker,
  speaker: describeSpeaker({
    source: segment.source,
    speaker: segment.speaker,
    speakerNames,
  }),
  text: segment.text.trim(),
  startMs: segment.startMs,
  endMs: segment.endMs,
});

const canMerge = (turn: TranscriptTurn, segment: TranscriptSegment): boolean =>
  turn.source === segment.source &&
  turn.speakerIndex === segment.speaker &&
  segment.startMs - turn.endMs <= MAX_TURN_GAP_MS;

export const groupIntoTurns = (
  segments: TranscriptSegment[],
  speakerNames: SpeakerNames = {},
): TranscriptTurn[] =>
  sortByStart(segments).reduce<TranscriptTurn[]>((turns, segment) => {
    const last = turns.at(-1);
    if (!last || !canMerge(last, segment)) {
      return [...turns, toTurn(segment, speakerNames)];
    }
    last.text = `${last.text} ${segment.text.trim()}`;
    last.endMs = Math.max(last.endMs, segment.endMs);
    return turns;
  }, []);

export const formatTranscriptForPrompt = (
  segments: TranscriptSegment[],
  speakerNames: SpeakerNames = {},
): string => {
  const turns = groupIntoTurns(segments, speakerNames);
  const origin = turns[0]?.startMs ?? 0;
  return turns
    .map(
      (turn) =>
        `[${formatElapsed(turn.startMs - origin)}] ${turn.speaker}: ${turn.text}`,
    )
    .join("\n");
};
