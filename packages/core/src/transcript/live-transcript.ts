import {
  describeSpeaker,
  type LiveSegmentEvent,
  type SpeakerNames,
  type TranscriptSegment,
} from "../domain/transcript.js";
import { groupIntoTurns } from "./format-transcript.js";

export const LIVE_TRANSCRIPT_LINES = 12;

export interface LiveTranscriptLine {
  key: string;
  speaker: string;
  text: string;
  mine: boolean;
}

export interface LiveTranscript {
  lines: LiveTranscriptLine[];
  partials: LiveTranscriptLine[];
}

interface BuildLiveTranscriptInput {
  segments: TranscriptSegment[];
  interim: (LiveSegmentEvent | null)[];
  speakerNames?: SpeakerNames;
  maxLines?: number;
}

const toPartial = (
  segment: LiveSegmentEvent,
  speakerNames: SpeakerNames,
): LiveTranscriptLine => ({
  key: `partial-${segment.source}`,
  speaker: describeSpeaker({
    source: segment.source,
    speaker: segment.speaker,
    speakerNames,
  }),
  text: segment.text.trim(),
  mine: segment.source === "microphone",
});

export const buildLiveTranscript = ({
  segments,
  interim,
  speakerNames = {},
  maxLines = LIVE_TRANSCRIPT_LINES,
}: BuildLiveTranscriptInput): LiveTranscript => ({
  lines: groupIntoTurns(segments, speakerNames)
    .filter((turn) => turn.text)
    .slice(-maxLines)
    .map(({ key, speaker, text, source }) => ({
      key,
      speaker,
      text,
      mine: source === "microphone",
    })),
  partials: interim
    .filter((segment): segment is LiveSegmentEvent =>
      Boolean(segment?.text.trim()),
    )
    .sort((first, second) => first.startMs - second.startMs)
    .map((segment) => toPartial(segment, speakerNames)),
});
