import { describe, expect, it } from "vitest";

import {
  resolveDictationLlm,
  resolveLlmModel,
  SettingsSchema,
} from "./settings.js";

describe("SettingsSchema", () => {
  it("moves the legacy model to the provider that was in use", () => {
    const settings = SettingsSchema.parse({
      llmProvider: "openai-compatible",
      llmModel: "fr-notes",
    });
    expect(settings.llmCompatibleModel).toBe("fr-notes");
    expect(settings.llmGatewayModel).toBe("");
  });

  it("keeps a per-provider model that was already saved", () => {
    const settings = SettingsSchema.parse({
      llmProvider: "gateway",
      llmModel: "old",
      llmGatewayModel: "google/gemini-3.8-flash",
    });
    expect(settings.llmGatewayModel).toBe("google/gemini-3.8-flash");
  });
});

describe("resolveLlmModel", () => {
  it("returns the model of the active provider", () => {
    const settings = SettingsSchema.parse({
      llmProvider: "gateway",
      llmGatewayModel: " google/gemini-3.8-flash ",
      llmCompatibleModel: "fr-notes",
    });
    expect(resolveLlmModel(settings)).toBe("google/gemini-3.8-flash");
    expect(
      resolveLlmModel({ ...settings, llmProvider: "openai-compatible" }),
    ).toBe("fr-notes");
  });
});

describe("resolveDictationLlm", () => {
  const settings = SettingsSchema.parse({
    llmProvider: "gateway",
    llmGatewayModel: "alibaba/qwen3.7-plus",
    llmCompatibleModel: "fr-notes",
    llmThinking: true,
  });

  it("uses the notes model without reasoning by default", () => {
    const dictation = resolveDictationLlm(settings);
    expect(resolveLlmModel(dictation)).toBe("alibaba/qwen3.7-plus");
    expect(dictation.llmThinking).toBe(false);
  });

  it("uses its own provider and model when chosen", () => {
    const dictation = resolveDictationLlm({
      ...settings,
      dictationLlmProvider: "gateway",
      dictationLlmModel: "google/gemini-3.1-flash-lite",
    });
    expect(resolveLlmModel(dictation)).toBe("google/gemini-3.1-flash-lite");
  });

  it("falls back to the provider's notes model when no model is set", () => {
    const dictation = resolveDictationLlm({
      ...settings,
      dictationLlmProvider: "openai-compatible",
    });
    expect(dictation.llmProvider).toBe("openai-compatible");
    expect(resolveLlmModel(dictation)).toBe("fr-notes");
  });
});
