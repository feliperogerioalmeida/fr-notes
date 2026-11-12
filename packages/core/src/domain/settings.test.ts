import { describe, expect, it } from "vitest";

import { resolveLlmModel, SettingsSchema } from "./settings.js";

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
