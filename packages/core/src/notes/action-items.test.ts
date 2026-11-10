import { describe, expect, it } from "vitest";

import {
  extractActionItems,
  normalizeTaskBullets,
  setTaskChecked,
} from "./action-items.js";

const MARKDOWN = [
  "### Próximos passos",
  "- [ ] Felipe — enviar proposta de MVP (até sexta)",
  "- [x] **Marina** — compartilhar a planilha atual",
  "- [ ] Revisar orçamento com o financeiro",
  "- item comum, sem checkbox",
].join("\n");

describe("extractActionItems", () => {
  it("parses owner, task, deadline and state", () => {
    expect(extractActionItems(MARKDOWN)).toEqual([
      {
        key: "felipe enviar proposta de mvp",
        text: "enviar proposta de MVP",
        owner: "Felipe",
        dueText: "até sexta",
        done: false,
      },
      {
        key: "marina compartilhar a planilha atual",
        text: "compartilhar a planilha atual",
        owner: "Marina",
        dueText: null,
        done: true,
      },
      {
        key: "revisar orcamento com o financeiro",
        text: "Revisar orçamento com o financeiro",
        owner: null,
        dueText: null,
        done: false,
      },
    ]);
  });

  it("does not treat a long sentence before a dash as the owner", () => {
    const [item] = extractActionItems(
      "- [ ] Alinhar com o time de design e produto — antes do kickoff",
    );
    expect(item?.owner).toBeNull();
  });
});

describe("setTaskChecked", () => {
  it("toggles only the matching task line", () => {
    const updated = setTaskChecked({
      markdown: MARKDOWN,
      key: "felipe enviar proposta de mvp",
      done: true,
    });

    expect(updated.split("\n")[1]).toBe(
      "- [x] Felipe — enviar proposta de MVP (até sexta)",
    );
    expect(updated.split("\n")[2]).toBe(
      "- [x] **Marina** — compartilhar a planilha atual",
    );
  });
});

const SMALL_MODEL_OUTPUT = [
  "### Próximos passos",
  "*   - [ ] Felipe Rogério — Enviar proposta com escopo Fase 1 (deadLine: sexta-feira)",
  "* [ ] Marina Souza — Enviar planilha atual de pedidos",
].join("\n");

describe("normalizeTaskBullets", () => {
  it("fixes doubled and star bullets in front of checkboxes", () => {
    expect(normalizeTaskBullets(SMALL_MODEL_OUTPUT)).toBe(
      [
        "### Próximos passos",
        "- [ ] Felipe Rogério — Enviar proposta com escopo Fase 1 (deadLine: sexta-feira)",
        "- [ ] Marina Souza — Enviar planilha atual de pedidos",
      ].join("\n"),
    );
  });

  it("still extracts tasks written with a doubled bullet and a labeled deadline", () => {
    const [first] = extractActionItems(SMALL_MODEL_OUTPUT);
    expect(first).toMatchObject({
      owner: "Felipe Rogério",
      text: "Enviar proposta com escopo Fase 1",
      dueText: "sexta-feira",
    });
  });
});
