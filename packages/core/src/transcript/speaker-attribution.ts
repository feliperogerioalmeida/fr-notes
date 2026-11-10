import type { SpeakerNames, TranscriptSegment } from "../domain/transcript.js";

export interface ActiveSpeakerObservation {
  atMs: number;
  activeNames: string[];
}

export interface SpeakerSuggestion {
  speaker: number;
  name: string;
  confidence: number;
  matchedMs: number;
}

interface AttributeSpeakersInput {
  segments: TranscriptSegment[];
  observations: ActiveSpeakerObservation[];
}

const MAX_OBSERVATION_SPAN_MS = 5_000;
const SCREEN_LAG_MS = 700;
const MIN_MATCHED_MS = 4_000;
const MIN_CONFIDENCE = 0.6;

interface ActiveInterval {
  startMs: number;
  endMs: number;
  name: string;
}

export const buildActiveIntervals = (
  observations: ActiveSpeakerObservation[],
): ActiveInterval[] => {
  const sorted = [...observations].sort((a, b) => a.atMs - b.atMs);
  return sorted.flatMap((observation, index) => {
    if (observation.activeNames.length !== 1) return [];
    const next =
      sorted[index + 1]?.atMs ?? observation.atMs + MAX_OBSERVATION_SPAN_MS;
    const endMs = Math.min(next, observation.atMs + MAX_OBSERVATION_SPAN_MS);
    return [
      {
        startMs: observation.atMs,
        endMs,
        name: observation.activeNames[0] as string,
      },
    ];
  });
};

const overlapMs = (segment: TranscriptSegment, interval: ActiveInterval) => {
  const start = Math.max(segment.startMs + SCREEN_LAG_MS, interval.startMs);
  const end = Math.min(segment.endMs + SCREEN_LAG_MS, interval.endMs);
  return Math.max(0, end - start);
};

const accumulateOverlaps = (
  segments: TranscriptSegment[],
  intervals: ActiveInterval[],
) => {
  const totals = new Map<number, Map<string, number>>();
  segments
    .filter(
      (segment) => segment.source === "system" && segment.speaker !== null,
    )
    .forEach((segment) => {
      const speaker = segment.speaker as number;
      const byName = totals.get(speaker) ?? new Map<string, number>();
      intervals.forEach((interval) => {
        const overlap = overlapMs(segment, interval);
        if (overlap > 0)
          byName.set(interval.name, (byName.get(interval.name) ?? 0) + overlap);
      });
      totals.set(speaker, byName);
    });
  return totals;
};

const pickSuggestion = (
  speaker: number,
  byName: Map<string, number>,
): SpeakerSuggestion | null => {
  const ranked = [...byName].sort((a, b) => b[1] - a[1]);
  const [best] = ranked;
  if (!best) return null;
  const total = ranked.reduce((sum, [, ms]) => sum + ms, 0);
  const confidence = total > 0 ? best[1] / total : 0;
  if (best[1] < MIN_MATCHED_MS || confidence < MIN_CONFIDENCE) return null;
  return { speaker, name: best[0], confidence, matchedMs: best[1] };
};

export const attributeSpeakers = ({
  segments,
  observations,
}: AttributeSpeakersInput): SpeakerSuggestion[] => {
  const intervals = buildActiveIntervals(observations);
  if (intervals.length === 0) return [];
  return [...accumulateOverlaps(segments, intervals)]
    .map(([speaker, byName]) => pickSuggestion(speaker, byName))
    .filter(
      (suggestion): suggestion is SpeakerSuggestion => suggestion !== null,
    )
    .sort((a, b) => a.speaker - b.speaker);
};

interface ApplySuggestionsInput {
  speakerNames: SpeakerNames;
  suggestions: SpeakerSuggestion[];
}

export const applySpeakerSuggestions = ({
  speakerNames,
  suggestions,
}: ApplySuggestionsInput) => {
  const applied = suggestions.filter(
    (suggestion) => !speakerNames[String(suggestion.speaker)],
  );
  const names = { ...speakerNames };
  applied.forEach((suggestion) => {
    names[String(suggestion.speaker)] = suggestion.name;
  });
  return { speakerNames: names, applied };
};
