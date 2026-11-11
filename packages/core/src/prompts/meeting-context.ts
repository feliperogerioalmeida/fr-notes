import { describeParticipant } from "../domain/calendar.js";
import type { TranscriptDigest } from "../domain/digest.js";
import type { Note } from "../domain/note.js";
import type { Settings } from "../domain/settings.js";
import type { TranscriptSegment } from "../domain/transcript.js";
import { formatTranscriptFrom } from "../transcript/format-transcript.js";
import { formatFullDate, formatTime } from "../utils/dates.js";
import {
  formatDigestsForPrompt,
  relabelSpeakers,
  selectUndigestedSegments,
} from "./transcript-digest.js";

const EMPTY_NOTES = "(no notes written)";
const EMPTY_TRANSCRIPT = "(no transcript captured)";

export interface MeetingContextInput {
  note: Note;
  segments: TranscriptSegment[];
  settings: Pick<Settings, "userName" | "userBio">;
  digests?: TranscriptDigest[];
}

const wrap = (tag: string, body: string): string =>
  `<${tag}>\n${body.trim()}\n</${tag}>`;

const describeParticipants = (note: Note): string =>
  note.participants
    .map((participant) =>
      participant.email
        ? `${describeParticipant(participant)} <${participant.email}>`
        : describeParticipant(participant),
    )
    .join(", ");

const describeMeeting = (note: Note): string => {
  const startedAt = note.recordingStartedAt ?? note.createdAt;
  const participants = describeParticipants(note);
  return [
    `Title: ${note.title.trim() || "(untitled)"}`,
    `Date: ${formatFullDate(startedAt)}, ${formatTime(startedAt)}`,
    participants
      ? `Other participants (from the calendar): ${participants}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const describeUser = ({
  userName,
  userBio,
}: MeetingContextInput["settings"]): string =>
  [
    `Name: ${userName.trim() || "(unknown)"}`,
    userBio.trim() ? `About: ${userBio.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

const meetingOrigin = (note: Note, segments: TranscriptSegment[]) =>
  note.recordingStartedAt
    ? new Date(note.recordingStartedAt).getTime()
    : (segments[0]?.startMs ?? 0);

const describeTranscript = (
  note: Note,
  segments: TranscriptSegment[],
  digests: TranscriptDigest[],
): string[] => {
  const originMs = meetingOrigin(note, segments);
  const remaining = selectUndigestedSegments(segments, digests);
  const transcript =
    remaining.length > 0
      ? formatTranscriptFrom({
          segments: remaining,
          speakerNames: note.speakerNames,
          originMs,
        })
      : EMPTY_TRANSCRIPT;
  if (digests.length === 0) return [wrap("transcript", transcript)];
  const relabeled = digests.map((digest) => ({
    ...digest,
    text: relabelSpeakers(digest.text, note.speakerNames),
  }));
  return [
    wrap("transcript_summary", formatDigestsForPrompt(relabeled, originMs)),
    wrap("transcript", transcript),
  ];
};

export const buildMeetingContext = ({
  note,
  segments,
  settings,
  digests = [],
}: MeetingContextInput): string =>
  [
    wrap("meeting", describeMeeting(note)),
    wrap("about_me", describeUser(settings)),
    wrap("my_notes", note.notesMarkdown.trim() || EMPTY_NOTES),
    ...describeTranscript(note, segments, digests),
  ].join("\n\n");
