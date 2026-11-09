import { describe, expect, it } from "vitest";

import { parseEnhancedNotes } from "./enhance-notes.js";

describe("parseEnhancedNotes", () => {
  it("extracts the leading H1 as the title", () => {
    const result = parseEnhancedNotes(
      "# Kickoff do app FR Notes\n\n### Resumo\n- Começamos",
    );

    expect(result.title).toBe("Kickoff do app FR Notes");
    expect(result.markdown).toBe("### Resumo\n- Começamos");
  });

  it("keeps the whole output when there is no title line", () => {
    const result = parseEnhancedNotes("### Resumo\n- Sem título");

    expect(result.title).toBeNull();
    expect(result.markdown).toBe("### Resumo\n- Sem título");
  });
});
