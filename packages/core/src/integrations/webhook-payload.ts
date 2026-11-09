import type { Folder } from "../domain/folder.js";
import type { Note } from "../domain/note.js";
import type { Template } from "../domain/template.js";
import {
  describeSpeaker,
  type SpeakerNames,
  type TranscriptSegment,
} from "../domain/transcript.js";
import type { WebhookEvent } from "../domain/webhook.js";
import { createId, nowIso } from "../utils/ids.js";

export const WEBHOOK_PAYLOAD_VERSION = 1;

interface BuildWebhookPayloadInput {
  event: WebhookEvent;
  note: Note;
  segments: TranscriptSegment[];
  folder: Folder | null;
  template: Template | null;
  appVersion: string;
}

const toIso = (ms: number) => new Date(ms).toISOString();

const describeTranscript = (
  segments: TranscriptSegment[],
  speakerNames: SpeakerNames,
) =>
  segments.map((segment) => ({
    speaker: describeSpeaker({
      source: segment.source,
      speaker: segment.speaker,
      speakerNames,
    }),
    source: segment.source,
    text: segment.text,
    startedAt: toIso(segment.startMs),
    endedAt: toIso(segment.endMs),
  }));

const describeNote = ({
  note,
  folder,
  template,
}: Pick<BuildWebhookPayloadInput, "note" | "folder" | "template">) => ({
  id: note.id,
  title: note.title,
  status: note.status,
  myNotesMarkdown: note.notesMarkdown,
  enhancedMarkdown: note.enhancedMarkdown,
  participants: note.participants,
  calendarEventId: note.calendarEventId,
  folder: folder ? { id: folder.id, name: folder.name } : null,
  template: template ? { id: template.id, name: template.name } : null,
  recordingStartedAt: note.recordingStartedAt,
  recordingEndedAt: note.recordingEndedAt,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

export const buildWebhookPayload = ({
  event,
  segments,
  appVersion,
  ...context
}: BuildWebhookPayloadInput) => ({
  version: WEBHOOK_PAYLOAD_VERSION,
  id: createId(),
  event,
  sentAt: nowIso(),
  source: { app: "FR Notes", version: appVersion },
  note: describeNote(context),
  transcript: describeTranscript(segments, context.note.speakerNames),
});

export type WebhookPayload = ReturnType<typeof buildWebhookPayload>;

const HEX_RADIX = 16;
const HEX_PAD = 2;

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(HEX_PAD, "0"))
    .join("");

interface SignWebhookInput {
  secret: string;
  timestamp: string;
  body: string;
}

export const signWebhookBody = async ({
  secret,
  timestamp,
  body,
}: SignWebhookInput): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  return `sha256=${toHex(signature)}`;
};

const SECRET_BYTES = 32;

export const createWebhookSecret = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
  return `whsec_${toHex(bytes.buffer)}`;
};
