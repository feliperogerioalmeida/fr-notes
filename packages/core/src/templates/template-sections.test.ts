import { describe, expect, it } from "vitest";

import { BUILT_IN_TEMPLATES } from "./built-in-templates.js";
import { parseTemplateSections } from "./template-sections.js";

describe("parseTemplateSections", () => {
  it("splits headings and hints", () => {
    expect(
      parseTemplateSections("### Resumo — 2 a 4 frases\n### Decisões"),
    ).toEqual([
      { title: "Resumo", hint: "2 a 4 frases" },
      { title: "Decisões", hint: null },
    ]);
  });

  it("returns no sections for free-form instructions", () => {
    expect(parseTemplateSections("Crie uma seção por pessoa.")).toEqual([]);
  });

  it("parses every built-in template that uses headings", () => {
    const kickoff = BUILT_IN_TEMPLATES.find(
      (item) => item.id === "builtin-kickoff",
    );
    expect(parseTemplateSections(kickoff?.instructions ?? "")).toHaveLength(6);
  });
});
