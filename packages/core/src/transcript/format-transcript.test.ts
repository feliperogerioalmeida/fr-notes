import { describe, expect, it } from "vitest";

import type { TranscriptSegment } from "../domain/transcript.js";
import {
  formatTranscriptForPrompt,
  groupIntoTurns,
} from "./format-transcript.js";

const BASE_MS = 1_700_000_000_000;

const buildSegment = (
  overrides: Partial<TranscriptSegment> & Pick<TranscriptSegment, "startMs">,
): TranscriptSegment => ({
  id: `segment-${overrides.startMs}`,
  noteId: "note-1",
  source: "microphone",
  text: "texto",
  endMs: overrides.startMs + 1000,
  speaker: null,
  createdAt: new Date(BASE_MS).toISOString(),
  ...overrides,
});

describe("groupIntoTurns", () => {
  it("merges consecutive segments from the same source", () => {
    const turns = groupIntoTurns([
      buildSegment({ startMs: BASE_MS, text: "Oi," }),
      buildSegment({ startMs: BASE_MS + 1500, text: "tudo bem?" }),
      buildSegment({
        startMs: BASE_MS + 3000,
        source: "system",
        text: "Tudo!",
      }),
    ]);

    expect(turns).toHaveLength(2);
    expect(turns[0]?.text).toBe("Oi, tudo bem?");
    expect(turns[1]?.speaker).toBe("Eles");
  });

  it("orders segments from both sources by start time", () => {
    const turns = groupIntoTurns([
      buildSegment({
        startMs: BASE_MS + 5000,
        source: "system",
        text: "depois",
      }),
      buildSegment({ startMs: BASE_MS, text: "antes" }),
    ]);

    expect(turns.map((turn) => turn.text)).toEqual(["antes", "depois"]);
  });
});

describe("formatTranscriptForPrompt", () => {
  it("labels speakers with elapsed timestamps", () => {
    const output = formatTranscriptForPrompt([
      buildSegment({ startMs: BASE_MS, text: "Vamos começar." }),
      buildSegment({
        startMs: BASE_MS + 65_000,
        source: "system",
        text: "Pode ser.",
      }),
    ]);

    expect(output).toBe("[00:00] Eu: Vamos começar.\n[01:05] Eles: Pode ser.");
  });
});

describe("speaker diarization", () => {
  it("keeps different people apart and uses assigned names", () => {
    const turns = groupIntoTurns(
      [
        buildSegment({
          startMs: BASE_MS,
          source: "system",
          speaker: 0,
          text: "Oi",
        }),
        buildSegment({
          startMs: BASE_MS + 1000,
          source: "system",
          speaker: 1,
          text: "Olá",
        }),
      ],
      { "0": "Marina" },
    );

    expect(turns.map((turn) => turn.speaker)).toEqual(["Marina", "Pessoa 2"]);
  });
});
