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
    expect(templates.filter((template) => template.isBuiltIn)).toHaveLength(6);
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
});
