import { describe, expect, it } from "vitest";

import type { ActionItem } from "../domain/action-item.js";
import type { Connection } from "../domain/connection.js";
import type { Note } from "../domain/note.js";
import { listClickUpLists } from "./clickup.js";
import type { HttpFetch, HttpRequestInit } from "./http.js";
import { markdownToNotionBlocks } from "./notion.js";
import { sendActionItem, sendNote } from "./send.js";
import { markdownToSlack } from "./slack.js";

const NOTE: Note = {
  id: "note-1",
  title: "Kickoff — App de pedidos",
  notesMarkdown: "",
  enhancedMarkdown: "### Resumo\n- Prazo em março",
  templateId: null,
  folderId: null,
  calendarEventId: null,
  participants: [],
  speakerNames: {},
  status: "done",
  recordingStartedAt: "2026-11-09T13:00:00.000Z",
  recordingEndedAt: null,
  createdAt: "2026-11-09T13:00:00.000Z",
  updatedAt: "2026-11-09T13:00:00.000Z",
  deletedAt: null,
};

const ITEM: ActionItem = {
  id: "item-1",
  noteId: "note-1",
  key: "felipe enviar proposta",
  text: "enviar proposta",
  owner: "Felipe",
  dueText: "sexta",
  done: false,
  position: 0,
  sentTo: [],
  createdAt: NOTE.createdAt,
  updatedAt: NOTE.createdAt,
  deletedAt: null,
};

const buildConnection = (
  provider: Connection["provider"],
  config: Record<string, string>,
): Connection => ({
  id: "connection-1",
  provider,
  name: provider,
  config,
  enabled: true,
  createdAt: NOTE.createdAt,
  updatedAt: NOTE.createdAt,
  deletedAt: null,
});

interface Recorded {
  url: string;
  init: HttpRequestInit;
}

const createFakeFetch = (responses: unknown[]) => {
  const calls: Recorded[] = [];
  const fetch: HttpFetch = async (url, init) => {
    calls.push({ url, init });
    const body = responses.shift() ?? {};
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () =>
        typeof body === "string" ? body : JSON.stringify(body),
    };
  };
  return { fetch, calls };
};

const bodyOf = (call: Recorded | undefined) =>
  JSON.parse(call?.init.body ?? "{}");

describe("ClickUp", () => {
  it("creates a task in the configured list with the token header", async () => {
    const { fetch, calls } = createFakeFetch([
      { id: "86abc", url: "https://app.clickup.com/t/86abc" },
    ]);
    const result = await sendActionItem({
      connection: buildConnection("clickup", { listId: "901" }),
      token: "pk_123",
      note: NOTE,
      item: ITEM,
      fetch,
    });

    expect(calls[0]?.url).toBe("https://api.clickup.com/api/v2/list/901/task");
    expect(calls[0]?.init.headers.Authorization).toBe("pk_123");
    expect(bodyOf(calls[0]).name).toBe("Enviar proposta");
    expect(bodyOf(calls[0]).markdown_description).toContain(
      "Responsável: Felipe",
    );
    expect(result).toEqual({
      externalId: "86abc",
      url: "https://app.clickup.com/t/86abc",
    });
  });

  it("lists folderless and folder lists with their path", async () => {
    const { fetch } = createFakeFetch([
      { teams: [{ id: "t1", name: "FR" }] },
      { spaces: [{ id: "s1", name: "Clientes" }] },
      { lists: [{ id: "l1", name: "Backlog" }] },
      {
        folders: [
          { id: "f1", name: "Marina", lists: [{ id: "l2", name: "MVP" }] },
        ],
      },
    ]);

    expect(await listClickUpLists({ token: "pk", fetch })).toEqual([
      { id: "l1", name: "Backlog", path: "FR / Clientes" },
      { id: "l2", name: "MVP", path: "FR / Clientes / Marina" },
    ]);
  });
});

describe("Linear", () => {
  it("creates an issue in the configured team", async () => {
    const { fetch, calls } = createFakeFetch([
      {
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: "i1",
              identifier: "FR-12",
              url: "https://linear.app/fr/issue/FR-12",
            },
          },
        },
      },
    ]);
    const result = await sendActionItem({
      connection: buildConnection("linear", { teamId: "team-1" }),
      token: "lin_api_x",
      note: NOTE,
      item: ITEM,
      fetch,
    });

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(bodyOf(calls[0]).variables.input).toMatchObject({
      teamId: "team-1",
      title: "Enviar proposta",
    });
    expect(result.externalId).toBe("FR-12");
  });

  it("surfaces GraphQL errors", async () => {
    const { fetch } = createFakeFetch([
      { errors: [{ message: "Authentication required" }] },
    ]);
    await expect(
      sendActionItem({
        connection: buildConnection("linear", { teamId: "team-1" }),
        token: "bad",
        note: NOTE,
        item: ITEM,
        fetch,
      }),
    ).rejects.toThrow("Authentication required");
  });
});

describe("Notion", () => {
  it("creates a page using the database title property", async () => {
    const { fetch, calls } = createFakeFetch([
      {
        id: "db",
        properties: { Reunião: { type: "title" }, Data: { type: "date" } },
      },
      { id: "page-1", url: "https://notion.so/page-1" },
    ]);
    const result = await sendNote({
      connection: buildConnection("notion", { databaseId: "db" }),
      token: "secret_x",
      note: NOTE,
      summary: NOTE.enhancedMarkdown ?? "",
      fetch,
    });

    expect(calls[0]?.init.headers.Authorization).toBe("Bearer secret_x");
    expect(Object.keys(bodyOf(calls[1]).properties)).toEqual(["Reunião"]);
    expect(result.url).toBe("https://notion.so/page-1");
  });

  it("converts markdown into Notion blocks", () => {
    const blocks = markdownToNotionBlocks(
      "### Resumo\n- [x] feito\n- item\ntexto",
    ) as {
      type: string;
    }[];
    expect(blocks.map((block) => block.type)).toEqual([
      "heading_3",
      "to_do",
      "bulleted_list_item",
      "paragraph",
    ]);
  });
});

describe("Slack", () => {
  it("posts the note to the incoming webhook", async () => {
    const { fetch, calls } = createFakeFetch(["ok"]);
    await sendNote({
      connection: buildConnection("slack", {}),
      token: "https://hooks.slack.com/services/T/B/X",
      note: NOTE,
      summary: NOTE.enhancedMarkdown ?? "",
      fetch,
    });

    expect(calls[0]?.url).toBe("https://hooks.slack.com/services/T/B/X");
    expect(bodyOf(calls[0]).text).toBe(
      "*Kickoff — App de pedidos*\n\n*Resumo*\n• Prazo em março",
    );
  });

  it("converts task lists and bold to Slack mrkdwn", () => {
    expect(markdownToSlack("- [ ] **Felipe** — proposta\n- [x] feito")).toBe(
      "☐ *Felipe* — proposta\n☑ feito",
    );
  });
});

describe("unsupported actions", () => {
  it("refuses to send tasks to Notion", () => {
    expect(() =>
      sendActionItem({
        connection: buildConnection("notion", {}),
        token: "x",
        note: NOTE,
        item: ITEM,
        fetch: createFakeFetch([]).fetch,
      }),
    ).toThrow("notion não suporta tarefas");
  });
});
