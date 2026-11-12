import { describe, expect, it } from "vitest";

import type {
  LiveSegmentEvent,
  TranscriptSegment,
} from "../domain/transcript.js";
import { buildLiveTranscript } from "./live-transcript.js";

const segment = (
  id: string,
  overrides: Partial<TranscriptSegment>,
): TranscriptSegment => ({
  id,
  noteId: "note",
  source: "system",
  text: "",
  startMs: 0,
  endMs: 0,
  speaker: 0,
  createdAt: "2026-11-12T00:00:00.000Z",
  ...overrides,
});

const interim = (overrides: Partial<LiveSegmentEvent>): LiveSegmentEvent => ({
  noteId: "note",
  source: "system",
  text: "",
  isFinal: false,
  startMs: 0,
  endMs: 0,
  segmentKey: "key",
  speaker: 0,
  ...overrides,
});

describe("buildLiveTranscript", () => {
  it("keeps the newest turns with speaker names", () => {
    const live = buildLiveTranscript({
      segments: [
        segment("a", { text: "Bom dia", startMs: 0, endMs: 900 }),
        segment("b", { text: "a todos", startMs: 1000, endMs: 1800 }),
        segment("c", {
          source: "microphone",
          speaker: null,
          text: "Oi",
          startMs: 9000,
          endMs: 9500,
        }),
      ],
      interim: [null, null],
      speakerNames: { "0": "Marina" },
      maxLines: 5,
    });
    expect(live.lines).toEqual([
      { key: "a", speaker: "Marina", text: "Bom dia a todos", mine: false },
      { key: "c", speaker: "Eu", text: "Oi", mine: true },
    ]);
  });

  it("trims to the most recent lines and lists partials in speaking order", () => {
    const segments = Array.from({ length: 5 }, (_, index) =>
      segment(String(index), {
        text: `fala ${index}`,
        speaker: index,
        startMs: index * 10_000,
        endMs: index * 10_000 + 500,
      }),
    );
    const live = buildLiveTranscript({
      segments,
      interim: [
        interim({
          source: "microphone",
          speaker: null,
          text: "estou",
          startMs: 60_000,
        }),
        interim({ text: "então", speaker: 1, startMs: 55_000 }),
      ],
      maxLines: 2,
    });
    expect(live.lines.map((line) => line.text)).toEqual(["fala 3", "fala 4"]);
    expect(live.partials).toEqual([
      {
        key: "partial-system",
        speaker: "Pessoa 2",
        text: "então",
        mine: false,
      },
      { key: "partial-microphone", speaker: "Eu", text: "estou", mine: true },
    ]);
  });

  it("drops empty partials", () => {
    const live = buildLiveTranscript({
      segments: [],
      interim: [interim({ text: "   " }), null],
    });
    expect(live.partials).toEqual([]);
  });
});
