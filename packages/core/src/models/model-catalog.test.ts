import { describe, expect, it } from "vitest";

import {
  formatContextWindow,
  formatModelPrice,
  parseCompatibleCatalog,
  parseGatewayCatalog,
} from "./model-catalog.js";

const GATEWAY_RESPONSE = {
  object: "list",
  data: [
    {
      id: "google/gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash Lite",
      owned_by: "google",
      type: "language",
      context_window: 1_000_000,
      tags: ["fast"],
      pricing: { input: "0.00000025", output: "0.0000015" },
    },
    {
      id: "alibaba/qwen3.7-plus",
      name: "Qwen 3.7 Plus",
      owned_by: "alibaba",
      type: "language",
      context_window: 1_000_000,
      tags: ["reasoning", "tool-use"],
      pricing: { input: "0.0000004", output: "0.0000016" },
    },
    { id: "openai/text-embedding-3", type: "embedding" },
    {
      id: "old/model",
      type: "language",
      deprecated_at: 1_700_000_000,
    },
    { broken: true },
  ],
};

describe("parseGatewayCatalog", () => {
  it("keeps language models sorted by provider, with price and traits", () => {
    const models = parseGatewayCatalog(GATEWAY_RESPONSE);
    expect(models.map((model) => model.id)).toEqual([
      "alibaba/qwen3.7-plus",
      "google/gemini-3.1-flash-lite",
    ]);
    expect(models[0]).toMatchObject({
      name: "Qwen 3.7 Plus",
      provider: "alibaba",
      reasons: true,
      fast: false,
    });
    expect(models[0]?.inputPerMillion).toBeCloseTo(0.4);
    expect(models[1]?.fast).toBe(true);
  });
});

describe("parseCompatibleCatalog", () => {
  it("lists the models an OpenAI-compatible server reports", () => {
    expect(
      parseCompatibleCatalog({
        object: "list",
        data: [{ id: "fr-notes", owned_by: "library" }, { id: "qwen3.5:4b" }],
      }).map((model) => model.id),
    ).toEqual(["fr-notes", "qwen3.5:4b"]);
  });
});

describe("formatting", () => {
  it("formats the price per million tokens and the context window", () => {
    const [model] = parseGatewayCatalog(GATEWAY_RESPONSE);
    expect(model && formatModelPrice(model)).toBe(
      "US$ 0,40 / 1,60 por 1M tokens",
    );
    expect(formatContextWindow(1_000_000)).toBe("1M tokens");
    expect(formatContextWindow(131_072)).toBe("131k tokens");
    expect(formatContextWindow(null)).toBeNull();
  });
});
