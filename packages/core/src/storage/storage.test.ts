import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";

import { initializeStorage } from "./create-storage.js";
import type { SqlClient } from "./sql-client.js";

const createMemoryClient = async (): Promise<SqlClient> => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  return {
    select: async <Row>(
      query: string,
      params: (string | number | null)[] = [],
    ) => {
      const statement = db.prepare(query);
      statement.bind(params);
      const rows: Row[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as Row);
      statement.free();
      return rows;
    },
    execute: async (query, params = []) => {
      db.run(query, params);
    },
  };
};

describe("storage", () => {
  it("runs every migration and seeds the built-in templates once", async () => {
    const client = await createMemoryClient();
    await initializeStorage(client);
    const storage = await initializeStorage(client);

    const templates = await storage.templates.listTemplates();
    expect(templates.filter((template) => template.isBuiltIn)).toHaveLength(7);
  });

  it("refreshes built-in templates saved by an older version", async () => {
    const client = await createMemoryClient();
    await initializeStorage(client);
    await client.execute(
      "UPDATE templates SET instructions = 'old' WHERE id = 'builtin-general'",
    );
    const storage = await initializeStorage(client);

    const general = (await storage.templates.listTemplates()).find(
      (template) => template.id === "builtin-general",
    );
    expect(general?.instructions).toContain("uma seção ### por assunto");
  });

  it("persists calendar participants and soft deletes segments", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const note = await storage.notes.createNote({
      title: "Kickoff",
      calendarEventId: "event-1:1700000000000",
      participants: [{ name: "Marina", email: "marina@cliente.com" }],
    });
    const segment = await storage.transcript.appendSegment({
      noteId: note.id,
      source: "microphone",
      text: "eco",
      startMs: 1,
      endMs: 2,
    });
    await storage.transcript.deleteSegment(segment.id);

    const reloaded = await storage.notes.findNote(note.id);
    expect(reloaded?.participants).toEqual([
      { name: "Marina", email: "marina@cliente.com" },
    ]);
    expect(reloaded?.calendarEventId).toBe("event-1:1700000000000");
    expect(await storage.transcript.listSegments(note.id)).toHaveLength(0);
  });

  it("updates participants through a patch", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const note = await storage.notes.createNote();
    await storage.notes.updateNote({
      id: note.id,
      patch: { participants: [{ name: null, email: "joao@cliente.com" }] },
    });

    const reloaded = await storage.notes.findNote(note.id);
    expect(reloaded?.participants).toEqual([
      { name: null, email: "joao@cliente.com" },
    ]);
  });

  it("stores webhooks and filters them by event", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const id = await storage.webhooks.createWebhook({
      name: "FR Hub",
      url: "https://hub.example.com/hooks/notes",
      events: ["note.enhanced"],
      headerName: "Authorization",
      enabled: true,
    });
    await storage.webhooks.recordDelivery({
      id,
      result: { status: 200, error: null },
    });

    expect(
      await storage.webhooks.listWebhooksFor("note.completed"),
    ).toHaveLength(0);
    const [webhook] = await storage.webhooks.listWebhooksFor("note.enhanced");
    expect(webhook?.lastStatus).toBe(200);
    expect(webhook?.headerName).toBe("Authorization");
  });

  it("persists speaker indexes and speaker names", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const note = await storage.notes.createNote();
    await storage.transcript.appendSegment({
      noteId: note.id,
      source: "system",
      text: "Pode ser",
      startMs: 1,
      endMs: 2,
      speaker: 1,
    });
    await storage.notes.updateNote({
      id: note.id,
      patch: { speakerNames: { "1": "Marina" } },
    });

    const [segment] = await storage.transcript.listSegments(note.id);
    const reloaded = await storage.notes.findNote(note.id);
    expect(segment?.speaker).toBe(1);
    expect(reloaded?.speakerNames).toEqual({ "1": "Marina" });
  });

  it("keeps the dictation history newest first", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const base = {
      polished: false,
      inserted: true,
      targetAppName: "Slack",
      targetAppBundleId: "com.tinyspeck.slackmacgap",
    };
    await storage.dictations.appendDictation({
      ...base,
      text: "primeiro",
      rawText: "primeiro",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const id = await storage.dictations.appendDictation({
      ...base,
      text: "segundo",
      rawText: "segundo",
    });

    expect(
      (await storage.dictations.listDictations()).map((item) => item.text),
    ).toEqual(["segundo", "primeiro"]);
    await storage.dictations.deleteDictation(id);
    expect(await storage.dictations.listDictations()).toHaveLength(1);
  });

  it("syncs action items from markdown keeping sent state", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const note = await storage.notes.createNote();
    const first = await storage.actionItems.syncFromMarkdown({
      noteId: note.id,
      markdown:
        "- [ ] Felipe — enviar proposta (sexta)\n- [ ] Marina — mandar planilha",
    });
    const proposal = first[0];
    if (!proposal) throw new Error("missing item");
    await storage.actionItems.recordSent({
      id: proposal.id,
      ref: {
        connectionId: "c1",
        provider: "clickup",
        externalId: "86abc",
        url: "https://app.clickup.com/t/86abc",
        sentAt: "2026-11-09T15:00:00.000Z",
      },
    });

    const second = await storage.actionItems.syncFromMarkdown({
      noteId: note.id,
      markdown: "- [x] Felipe — enviar proposta (sexta)",
    });

    expect(second).toHaveLength(1);
    expect(second[0]?.id).toBe(proposal.id);
    expect(second[0]?.done).toBe(true);
    expect(second[0]?.sentTo[0]?.url).toBe("https://app.clickup.com/t/86abc");
    expect(await storage.actionItems.listAll()).toHaveLength(1);
  });

  it("stores connections with their config", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    await storage.connections.createConnection({
      provider: "clickup",
      name: "ClickUp — FR Digital",
      config: { listId: "901", listName: "Backlog" },
      enabled: true,
    });

    const [connection] = await storage.connections.listConnections();
    expect(connection?.config).toEqual({ listId: "901", listName: "Backlog" });
  });

  it("nests folders, refuses cycles and keeps notes when deleting", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const clients = await storage.folders.createFolder({ name: "Clientes" });
    const marina = await storage.folders.createFolder({
      name: "Marina",
      parentId: clients,
    });
    const kickoff = await storage.folders.createFolder({
      name: "Kickoff",
      parentId: marina,
    });
    const note = await storage.notes.createNote({ folderId: marina });

    await expect(
      storage.folders.moveFolder({ id: clients, parentId: kickoff }),
    ).rejects.toThrow("folder_cycle");

    await storage.folders.deleteFolder(marina);
    const folders = await storage.folders.listFolders();
    expect(folders.map((folder) => folder.name)).toEqual([
      "Clientes",
      "Kickoff",
    ]);
    expect(folders.find((folder) => folder.id === kickoff)?.parentId).toBe(
      clients,
    );
    expect((await storage.notes.findNote(note.id))?.folderId).toBe(clients);
  });

  it("finds notes and transcript moments ignoring accents", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const note = await storage.notes.createNote({
      title: "Descoberta — Pedidos",
    });
    await storage.notes.updateNote({
      id: note.id,
      patch: { enhancedMarkdown: "### Orçamento\n- Aprovado: R$ 40 mil" },
    });
    const base = Date.UTC(2026, 10, 10, 13);
    const lines = [
      "Bom dia, vamos começar.",
      "O orçamento aprovado é de quarenta mil.",
      "Precisamos estar no ar até março.",
    ];
    for (const [index, text] of lines.entries()) {
      await storage.transcript.appendSegment({
        noteId: note.id,
        source: "system",
        text,
        startMs: base + index * 10_000,
        endMs: base + index * 10_000 + 9_000,
        speaker: 0,
      });
    }

    const [result] = await storage.search.search("orcamento");
    expect(result?.noteId).toBe(note.id);
    expect(result?.hits.map((hit) => hit.snippet)).toEqual([
      expect.stringContaining("\u0002Orçamento\u0003"),
      expect.stringContaining("\u0002orçamento\u0003"),
    ]);
    expect(await storage.search.search("marco")).toHaveLength(1);

    const context = await storage.search.findMeetingContext({
      question: "Quando falamos do orçamento?",
    });
    expect(context.excerpts).toHaveLength(1);
    expect(
      context.excerpts[0]?.segments.map((segment) => segment.text),
    ).toEqual(lines);
    expect(context.summaries[0]?.summary).toContain("40 mil");

    await storage.notes.updateNote({
      id: note.id,
      patch: { enhancedMarkdown: "### Cronograma\n- Campanha de outono" },
    });
    expect((await storage.search.search("outono"))[0]?.hits).toHaveLength(1);
    await storage.notes.deleteNote(note.id);
    expect(await storage.search.search("orcamento")).toEqual([]);
  });

  it("saves, lists and clears transcript digests", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    await storage.digests.saveDigest({
      noteId: "n",
      startMs: 0,
      endMs: 600_000,
      text: " - A ",
    });
    await storage.digests.saveDigest({
      noteId: "n",
      startMs: 600_000,
      endMs: 1_200_000,
      text: "- B",
    });
    expect(
      (await storage.digests.listDigests("n")).map((digest) => digest.text),
    ).toEqual(["- A", "- B"]);
    await storage.digests.clearDigests("n");
    expect(await storage.digests.listDigests("n")).toEqual([]);
  });

  it("replaces a transcript and keeps search in sync", async () => {
    const storage = await initializeStorage(await createMemoryClient());
    const note = await storage.notes.createNote({ title: "Kickoff" });
    await storage.transcript.appendSegment({
      noteId: note.id,
      source: "system",
      text: "versão ao vivo com erro",
      startMs: 0,
      endMs: 1_000,
    });
    const replaced = await storage.transcript.replaceSegments(note.id, [
      {
        source: "system",
        text: "Versão corrigida do áudio",
        startMs: 0,
        endMs: 1_000,
        speaker: 0,
      },
      { source: "microphone", text: "Combinado", startMs: 2_000, endMs: 3_000 },
    ]);
    expect(replaced).toBe(2);
    expect(
      (await storage.transcript.listSegments(note.id)).map((item) => item.text),
    ).toEqual(["Versão corrigida do áudio", "Combinado"]);
    expect(await storage.search.search("erro")).toEqual([]);
    expect(await storage.search.search("corrigida")).toHaveLength(1);
  });
});
