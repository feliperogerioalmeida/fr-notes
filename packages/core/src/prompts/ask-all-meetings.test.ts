import { describe, expect, it } from "vitest";

import type { Note } from "../domain/note.js";
import type { TranscriptSegment } from "../domain/transcript.js";
import {
  buildAskAllMeetingsPrompt,
  buildMeetingSources,
  linkCitations,
  toChatSources,
} from "./ask-all-meetings.js";

const STARTED = Date.UTC(2026, 10, 10, 13, 0, 0);

const note: Note = {
  id: "note-1",
  title: "Descoberta — Pedidos",
  notesMarkdown: "",
  enhancedMarkdown: "### Orçamento\n- R$ 40 mil",
  templateId: null,
  folderId: null,
  calendarEventId: null,
  participants: [],
  speakerNames: { "0": "Marina Souza" },
  status: "done",
  recordingStartedAt: new Date(STARTED).toISOString(),
  recordingEndedAt: null,
  createdAt: new Date(STARTED).toISOString(),
  updatedAt: new Date(STARTED).toISOString(),
  deletedAt: null,
};

const segment = (startMs: number, text: string): TranscriptSegment => ({
  id: `s-${startMs}`,
  noteId: "note-1",
  source: "system",
  text,
  startMs,
  endMs: startMs + 5_000,
  speaker: 0,
  createdAt: new Date(STARTED).toISOString(),
});

describe("ask all meetings", () => {
  const sources = buildMeetingSources({
    notes: [note],
    context: {
      excerpts: [
        {
          noteId: "note-1",
          startMs: STARTED + 90_000,
          segments: [
            segment(STARTED + 80_000, "Temos pressa."),
            segment(
              STARTED + 90_000,
              "O orçamento aprovado é de quarenta mil.",
            ),
          ],
        },
      ],
      summaries: [{ noteId: "note-1", summary: "### Orçamento\n- R$ 40 mil" }],
    },
  });

  it("numbers transcript moments before meeting notes", () => {
    expect(
      sources.map((source) => [source.index, source.kind, source.label]),
    ).toEqual([
      [1, "transcript", "Marina Souza · 01:30"],
      [2, "notes", "Notas da reunião"],
    ]);
    expect(sources[0]?.text).toBe(
      "[01:20] Marina Souza: Temos pressa.\n[01:30] Marina Souza: O orçamento aprovado é de quarenta mil.",
    );
  });

  it("builds a prompt with every source and the question", () => {
    const prompt = buildAskAllMeetingsPrompt({
      question: "Qual o orçamento?",
      sources,
    });
    expect(prompt).toContain('<source id="1" meeting="Descoberta — Pedidos"');
    expect(prompt).toContain('kind="notes"');
    expect(prompt).toContain("<question>\nQual o orçamento?\n</question>");
  });

  it("links only citations that exist", () => {
    expect(
      linkCitations(
        "Foi aprovado [1], veja [2] e [7].",
        toChatSources(sources),
      ),
    ).toBe("Foi aprovado [1](#source-1), veja [2](#source-2) e [7].");
  });
});
