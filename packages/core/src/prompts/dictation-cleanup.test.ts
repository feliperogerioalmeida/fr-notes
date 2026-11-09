import { describe, expect, it } from "vitest";

import { buildDictationCleanupPrompt } from "./dictation-cleanup.js";

describe("buildDictationCleanupPrompt", () => {
  it("wraps the dictation and the target app", () => {
    expect(
      buildDictationCleanupPrompt({
        text: "  é tipo manda o relatório amanhã  ",
        targetAppName: "Slack",
      }),
    ).toBe(
      "<target_app>Slack</target_app>\n\n<dictation>\né tipo manda o relatório amanhã\n</dictation>",
    );
  });

  it("omits the target app when unknown", () => {
    expect(
      buildDictationCleanupPrompt({ text: "oi", targetAppName: null }),
    ).toBe("<dictation>\noi\n</dictation>");
  });
});
