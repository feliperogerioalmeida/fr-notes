import { describe, expect, it } from "vitest";

import { isLikelyEcho, measureContainment } from "./echo-detection.js";

const BASE_MS = 1_700_000_000_000;

describe("measureContainment", () => {
  it("ignores accents, case and punctuation", () => {
    expect(
      measureContainment(
        "Orçamento aprovado é quarenta mil",
        "orcamento APROVADO e de quarenta mil!",
      ),
    ).toBe(1);
  });

  it("returns zero for very short candidates", () => {
    expect(measureContainment("sim", "sim")).toBe(0);
  });
});

describe("isLikelyEcho", () => {
  const system = [
    {
      source: "system" as const,
      text: "Hoje tudo chega pelo WhatsApp e a gente copia para uma planilha",
      startMs: BASE_MS,
      endMs: BASE_MS + 4000,
    },
  ];

  it("flags a microphone segment that repeats the other side", () => {
    expect(
      isLikelyEcho({
        microphone: {
          source: "microphone",
          text: "tudo chega pelo whatsapp e a gente copia pra planilha",
          startMs: BASE_MS + 300,
          endMs: BASE_MS + 4300,
        },
        system,
      }),
    ).toBe(true);
  });

  it("keeps a genuine reply from the user", () => {
    expect(
      isLikelyEcho({
        microphone: {
          source: "microphone",
          text: "E quantas pessoas mexem nessa planilha hoje?",
          startMs: BASE_MS + 4500,
          endMs: BASE_MS + 7000,
        },
        system,
      }),
    ).toBe(false);
  });

  it("ignores matching text that is far away in time", () => {
    expect(
      isLikelyEcho({
        microphone: {
          source: "microphone",
          text: "Hoje tudo chega pelo WhatsApp e a gente copia para uma planilha",
          startMs: BASE_MS + 60_000,
          endMs: BASE_MS + 64_000,
        },
        system,
      }),
    ).toBe(false);
  });
});
