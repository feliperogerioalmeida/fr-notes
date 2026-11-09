import { describeParticipant } from "../domain/calendar.js";
import type { Note } from "../domain/note.js";
import type { Settings } from "../domain/settings.js";
import type { TranscriptSegment } from "../domain/transcript.js";
import { formatTranscriptForPrompt } from "../transcript/format-transcript.js";
import { formatFullDate, formatTime } from "../utils/dates.js";

const EMPTY_NOTES = "(no notes written)";
const EMPTY_TRANSCRIPT = "(no transcript captured)";

export interface MeetingContextInput {
  note: Note;
  segments: TranscriptSegment[];
  settings: Pick<Settings, "userName" | "userBio">;
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

export const buildMeetingContext = ({
  note,
  segments,
  settings,
}: MeetingContextInput): string =>
  [
    wrap("meeting", describeMeeting(note)),
    wrap("about_me", describeUser(settings)),
    wrap("my_notes", note.notesMarkdown.trim() || EMPTY_NOTES),
    wrap(
      "transcript",
      segments.length > 0
        ? formatTranscriptForPrompt(segments)
        : EMPTY_TRANSCRIPT,
    ),
  ].join("\n\n");
