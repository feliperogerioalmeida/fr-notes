import { describe, expect, it } from "vitest";

import { importTranscript, parseLooseDate } from "./import-transcript.js";

const NOW = new Date(2026, 10, 12, 15, 0);

const GRANOLA_EXPORT = `Meeting Title: Pipeline de projetos com Alan e Rafa
Date: Nov 12
Meeting participants: Felipe De Almeida

Transcript:
Alandy Barreto: Opa, tu me escuta bem, Felipe?
Me: Escuto sim.
Revenda Daten: Ele estava num evento em São Paulo.
Them: Então a gente começa.
Alandy Barreto: Vamos adiantando.
Speaker A: Pode ser.`;

describe("importTranscript", () => {
  it("reads a transcript copied from Granola", () => {
    const imported = importTranscript({
      text: GRANOLA_EXPORT,
      selfNames: ["Felipe"],
      now: NOW,
    });
    expect(imported.title).toBe("Pipeline de projetos com Alan e Rafa");
    expect(new Date(imported.startedAtMs).getDate()).toBe(12);
    expect(imported.segments.map((segment) => segment.speaker)).toEqual([
      0,
      null,
      1,
      2,
      0,
      3,
    ]);
    expect(imported.segments[1]?.source).toBe("microphone");
    expect(imported.speakerNames).toEqual({
      "0": "Alandy Barreto",
      "1": "Revenda Daten",
    });
    expect(imported.participants).toEqual([
      { name: "Alandy Barreto", email: null },
      { name: "Revenda Daten", email: null },
    ]);
  });

  it("starts at the time chosen for the import", () => {
    const { startedAtMs } = importTranscript({
      text: GRANOLA_EXPORT,
      startTime: "19:00",
      now: NOW,
    });
    const startedAt = new Date(startedAtMs);
    expect([startedAt.getDate(), startedAt.getHours()]).toEqual([12, 19]);
  });

  it("keeps the order of the turns on a synthetic clock", () => {
    const { segments, startedAtMs, endedAtMs } = importTranscript({
      text: GRANOLA_EXPORT,
      now: NOW,
    });
    const starts = segments.map((segment) => segment.startMs);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(segments[0]?.startMs).toBe(startedAtMs);
    expect(endedAtMs).toBe(segments.at(-1)?.endMs);
  });

  it("reads the transcript FR Notes copies, with timestamps", () => {
    const imported = importTranscript({
      text: "[00:00] Eu: Bom dia\n[00:04] Marina: Bom dia, vamos lá\ncontinuando a frase",
      fallbackTitle: "reuniao.txt",
      now: NOW,
    });
    expect(imported.title).toBe("reuniao.txt");
    expect(imported.segments.map((segment) => segment.text)).toEqual([
      "Bom dia",
      "Bom dia, vamos lá continuando a frase",
    ]);
  });

  it("does not take a time inside a sentence for a speaker", () => {
    const imported = importTranscript({
      text: "Rafa: Se der 9:20 ele não entra.\n9:20 é muito, mano.",
      now: NOW,
    });
    expect(imported.segments).toHaveLength(1);
    expect(imported.segments[0]?.text).toBe(
      "Se der 9:20 ele não entra. 9:20 é muito, mano.",
    );
  });
});

describe("parseLooseDate", () => {
  it("understands month names in English and Portuguese", () => {
    expect(parseLooseDate("Nov 12", NOW)?.getMonth()).toBe(10);
    expect(parseLooseDate("3 de março de 2026", NOW)?.getFullYear()).toBe(2026);
  });

  it("places a date without a year in the past", () => {
    expect(parseLooseDate("Dec 20", NOW)?.getFullYear()).toBe(2025);
  });

  it("returns null when there is no date", () => {
    expect(parseLooseDate("sem data", NOW)).toBeNull();
  });
});
