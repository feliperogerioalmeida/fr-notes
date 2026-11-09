import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Note } from "../domain/note.js";
import {
  buildWebhookPayload,
  createWebhookSecret,
  signWebhookBody,
} from "./webhook-payload.js";

const NOTE: Note = {
  id: "note-1",
  title: "Kickoff",
  notesMarkdown: "- prazo março",
  enhancedMarkdown: "### Resumo\n- Prazo em março",
  templateId: "builtin-general",
  folderId: null,
  calendarEventId: "event-1",
  participants: [{ name: "Marina", email: "marina@cliente.com" }],
  status: "done",
  recordingStartedAt: "2026-11-09T13:00:00.000Z",
  recordingEndedAt: "2026-11-09T13:30:00.000Z",
  createdAt: "2026-11-09T12:59:00.000Z",
  updatedAt: "2026-11-09T13:31:00.000Z",
  deletedAt: null,
};

describe("signWebhookBody", () => {
  it("matches a standard HMAC-SHA256 of timestamp.body", async () => {
    const secret = createWebhookSecret();
    const body = JSON.stringify({ hello: "mundo" });
    const timestamp = "1762693200";
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");

    expect(await signWebhookBody({ secret, timestamp, body })).toBe(
      `sha256=${expected}`,
    );
  });

  it("creates distinct prefixed secrets", () => {
    const first = createWebhookSecret();
    expect(first).toMatch(/^whsec_[0-9a-f]{64}$/);
    expect(createWebhookSecret()).not.toBe(first);
  });
});

describe("buildWebhookPayload", () => {
  it("describes the note, its folder, template and transcript", () => {
    const payload = buildWebhookPayload({
      event: "note.enhanced",
      note: NOTE,
      folder: null,
      template: {
        id: "builtin-general",
        name: "Reunião geral",
        description: "",
        instructions: "### Resumo",
        isBuiltIn: true,
        createdAt: NOTE.createdAt,
        updatedAt: NOTE.createdAt,
        deletedAt: null,
      },
      appVersion: "0.2.0",
      segments: [
        {
          id: "segment-1",
          noteId: "note-1",
          source: "system",
          text: "O prazo é março.",
          startMs: Date.parse("2026-11-09T13:01:00.000Z"),
          endMs: Date.parse("2026-11-09T13:01:04.000Z"),
          createdAt: NOTE.createdAt,
        },
      ],
    });

    expect(payload).toMatchObject({
      version: 1,
      event: "note.enhanced",
      source: { app: "FR Notes", version: "0.2.0" },
      note: {
        id: "note-1",
        enhancedMarkdown: "### Resumo\n- Prazo em março",
        template: { id: "builtin-general", name: "Reunião geral" },
        participants: [{ name: "Marina", email: "marina@cliente.com" }],
      },
      transcript: [
        {
          speaker: "Eles",
          text: "O prazo é março.",
          startedAt: "2026-11-09T13:01:00.000Z",
        },
      ],
    });
  });
});
