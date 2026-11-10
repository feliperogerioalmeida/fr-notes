import { describe, expect, it } from "vitest";

import type { TranscriptSegment } from "../domain/transcript.js";
import {
  applySpeakerSuggestions,
  attributeSpeakers,
  buildActiveIntervals,
} from "./speaker-attribution.js";

const segment = (
  overrides: Partial<TranscriptSegment> &
    Pick<TranscriptSegment, "startMs" | "endMs">,
): TranscriptSegment => ({
  id: `segment-${overrides.startMs}`,
  noteId: "note",
  source: "system",
  text: "texto",
  speaker: 0,
  createdAt: "2026-11-09T12:00:00.000Z",
  ...overrides,
});

const everySecond = (fromMs: number, toMs: number, activeNames: string[]) =>
  Array.from({ length: (toMs - fromMs) / 1_000 }, (_, index) => ({
    atMs: fromMs + index * 1_000,
    activeNames,
  }));

describe("buildActiveIntervals", () => {
  it("keeps single-speaker observations and caps stale ones", () => {
    const intervals = buildActiveIntervals([
      { atMs: 0, activeNames: ["Marina"] },
      { atMs: 1_000, activeNames: ["Marina", "João"] },
      { atMs: 2_000, activeNames: ["João"] },
      { atMs: 60_000, activeNames: [] },
    ]);
    expect(intervals).toEqual([
      { startMs: 0, endMs: 1_000, name: "Marina" },
      { startMs: 2_000, endMs: 7_000, name: "João" },
    ]);
  });
});

describe("attributeSpeakers", () => {
  const observations = [
    ...everySecond(0, 10_000, ["Marina Souza"]),
    ...everySecond(10_000, 20_000, ["João Lima"]),
  ];

  it("names each diarized voice after whoever was active on screen", () => {
    const suggestions = attributeSpeakers({
      observations,
      segments: [
        segment({ startMs: 0, endMs: 9_000, speaker: 0 }),
        segment({ startMs: 10_000, endMs: 19_000, speaker: 1 }),
        segment({
          startMs: 0,
          endMs: 19_000,
          source: "microphone",
          speaker: null,
        }),
      ],
    });
    expect(suggestions.map(({ speaker, name }) => ({ speaker, name }))).toEqual(
      [
        { speaker: 0, name: "Marina Souza" },
        { speaker: 1, name: "João Lima" },
      ],
    );
  });

  it("stays silent when the evidence is short or split", () => {
    const suggestions = attributeSpeakers({
      observations,
      segments: [
        segment({ startMs: 2_000, endMs: 4_000, speaker: 0 }),
        segment({ startMs: 5_000, endMs: 15_000, speaker: 1 }),
      ],
    });
    expect(suggestions).toEqual([]);
  });
});

describe("applySpeakerSuggestions", () => {
  it("never overrides a name the user chose", () => {
    const result = applySpeakerSuggestions({
      speakerNames: { "0": "Marina (cliente)" },
      suggestions: [
        { speaker: 0, name: "Marina Souza", confidence: 1, matchedMs: 9_000 },
        { speaker: 1, name: "João Lima", confidence: 1, matchedMs: 9_000 },
      ],
    });
    expect(result.speakerNames).toEqual({
      "0": "Marina (cliente)",
      "1": "João Lima",
    });
    expect(result.applied.map((item) => item.name)).toEqual(["João Lima"]);
  });
});
