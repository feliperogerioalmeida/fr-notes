import type { TranscriptDigest } from "../domain/digest.js";
import type { SpeakerNames, TranscriptSegment } from "../domain/transcript.js";
import { formatTranscriptFrom } from "../transcript/format-transcript.js";
import { formatElapsed } from "../utils/dates.js";

export const DIGEST_SYSTEM_PROMPT = `You condense one part of a meeting transcript while the meeting is still going on. A later step will use your summary instead of this part of the transcript to write the final notes, so nothing important can be lost.

- Write in Brazilian Portuguese, as short "-" bullets in chronological order.
- Keep every name, number, amount, date, deadline, decision, objection, open question and task with its owner, exactly as said.
- "Eu" is the user. Keep speaker names as they appear; attribution is approximate.
- Drop greetings, small talk and repetition. No title, no preamble, no closing remarks.`;

export const DIGEST_CHUNK_MS = 10 * 60_000;

interface DigestPromptInput {
  segments: TranscriptSegment[];
  speakerNames: SpeakerNames;
  originMs: number;
}

export const buildDigestPrompt = ({
  segments,
  speakerNames,
  originMs,
}: DigestPromptInput): string =>
  `<transcript_part>\n${formatTranscriptFrom({ segments, speakerNames, originMs })}\n</transcript_part>`;

export const selectUndigestedSegments = (
  segments: TranscriptSegment[],
  digests: TranscriptDigest[],
): TranscriptSegment[] => {
  const coveredUntil = Math.max(0, ...digests.map((digest) => digest.endMs));
  return segments.filter((segment) => segment.startMs >= coveredUntil);
};

const OTHERS_PREFIX = "Pessoa";

export const relabelSpeakers = (
  text: string,
  speakerNames: SpeakerNames,
): string =>
  Object.entries(speakerNames).reduce(
    (current, [index, name]) =>
      current.replace(
        new RegExp(`\\b${OTHERS_PREFIX} ${Number(index) + 1}\\b`, "g"),
        name,
      ),
    text,
  );

export const formatDigestsForPrompt = (
  digests: TranscriptDigest[],
  originMs: number,
): string =>
  digests
    .map(
      (digest) =>
        `[${formatElapsed(digest.startMs - originMs)}–${formatElapsed(digest.endMs - originMs)}]\n${digest.text.trim()}`,
    )
    .join("\n\n");
