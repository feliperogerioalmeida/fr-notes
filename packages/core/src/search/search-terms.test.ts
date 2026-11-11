import { describe, expect, it } from "vitest";

import { cleanSnippet, splitHighlights } from "./highlight.js";
import {
  buildMatchQuery,
  countMatchedTerms,
  extractSearchTerms,
} from "./search-terms.js";

describe("search terms", () => {
  it("normalizes accents, drops tiny tokens and builds prefix queries", () => {
    const terms = extractSearchTerms("Orçamento de março, R$ 40 mil!");
    expect(terms).toEqual(["orcamento", "de", "marco", "40", "mil"]);
    expect(buildMatchQuery(["orcamento", "marco"], "all")).toBe(
      "orcamento* marco*",
    );
    expect(buildMatchQuery(["orcamento", "marco"], "any")).toBe(
      "orcamento* OR marco*",
    );
  });

  it("drops portuguese stopwords for questions", () => {
    expect(
      extractSearchTerms("Quando falamos do orçamento da Marina?", {
        dropStopwords: true,
      }),
    ).toEqual(["orcamento", "marina"]);
  });

  it("counts how many terms a text contains by prefix", () => {
    expect(
      countMatchedTerms("O orçamento aprovado da Marina", [
        "orcam",
        "marina",
        "pix",
      ]),
    ).toBe(2);
  });
});

describe("highlights", () => {
  it("splits snippet markers into parts", () => {
    expect(splitHighlights("o \u0002orçamento\u0003 aprovado")).toEqual([
      { text: "o ", highlighted: false },
      { text: "orçamento", highlighted: true },
      { text: " aprovado", highlighted: false },
    ]);
  });

  it("removes markdown noise from snippets", () => {
    expect(cleanSnippet("### Orçamento\n- [ ] **Felipe** — enviar")).toBe(
      "Orçamento Felipe — enviar",
    );
  });
});
