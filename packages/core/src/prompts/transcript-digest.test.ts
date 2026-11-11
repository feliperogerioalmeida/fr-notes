import { describe, expect, it } from "vitest";

import type { TranscriptDigest } from "../domain/digest.js";
import type { Note } from "../domain/note.js";
import type { TranscriptSegment } from "../domain/transcript.js";
import { buildMeetingContext } from "./meeting-context.js";
import {
  buildDigestPrompt,
  relabelSpeakers,
  selectUndigestedSegments,
} from "./transcript-digest.js";

const STARTED = Date.UTC(2026, 10, 10, 13, 0, 0);
const MINUTE = 60_000;

const note: Note = {
  id: "note",
  title: "Kickoff",
  notesMarkdown: "",
  enhancedMarkdown: null,
  templateId: null,
  folderId: null,
  calendarEventId: null,
  participants: [],
  speakerNames: { "0": "Marina" },
  status: "done",
  recordingStartedAt: new Date(STARTED).toISOString(),
  recordingEndedAt: null,
  createdAt: new Date(STARTED).toISOString(),
  updatedAt: new Date(STARTED).toISOString(),
  deletedAt: null,
};

const segment = (minute: number, text: string): TranscriptSegment => ({
  id: `s${minute}`,
  noteId: "note",
  source: "system",
  text,
  startMs: STARTED + minute * MINUTE,
  endMs: STARTED + minute * MINUTE + 30_000,
  speaker: 0,
  createdAt: new Date(STARTED).toISOString(),
});

const SEGMENTS = [
  segment(1, "Orçamento de quarenta mil."),
  segment(9, "Prazo em março."),
  segment(12, "Vamos usar PIX."),
];

const DIGEST: TranscriptDigest = {
  id: "d1",
  noteId: "note",
  startMs: STARTED + MINUTE,
  endMs: STARTED + 10 * MINUTE,
  text: "- Orçamento: R$ 40 mil\n- Prazo: março",
  createdAt: new Date(STARTED).toISOString(),
};

describe("transcript digests", () => {
  it("keeps only segments after the last digest", () => {
    expect(
      selectUndigestedSegments(SEGMENTS, [DIGEST]).map((item) => item.id),
    ).toEqual(["s12"]);
  });

  it("formats a digest prompt with times from the start of the recording", () => {
    expect(
      buildDigestPrompt({
        segments: [SEGMENTS[2] as TranscriptSegment],
        speakerNames: note.speakerNames,
        originMs: STARTED,
      }),
    ).toBe(
      "<transcript_part>\n[12:00] Marina: Vamos usar PIX.\n</transcript_part>",
    );
  });

  it("replaces digested parts of the transcript with their summary", () => {
    const context = buildMeetingContext({
      note,
      segments: SEGMENTS,
      settings: { userName: "Felipe", userBio: "" },
      digests: [DIGEST],
    });
    expect(context).toContain(
      "<transcript_summary>\n[01:00–10:00]\n- Orçamento: R$ 40 mil",
    );
    expect(context).toContain(
      "<transcript>\n[12:00] Marina: Vamos usar PIX.\n</transcript>",
    );
    expect(context).not.toContain("quarenta mil");
  });

  it("renames automatic speaker labels written before the voices got names", () => {
    expect(
      relabelSpeakers("- Pessoa 1 aprovou; Pessoa 12 discordou", {
        "0": "Marina",
      }),
    ).toBe("- Marina aprovou; Pessoa 12 discordou");
  });
});
