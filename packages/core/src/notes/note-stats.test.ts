import { describe, expect, it } from "vitest";

import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";
import { formatDuration, pluralize, summarizeWeek } from "./note-stats.js";

const NOW = new Date(2026, 10, 12, 15, 0);

const buildItem = (overrides: Partial<ActionItem>): ActionItem => ({
  id: "item",
  noteId: "this-week",
  key: "key",
  text: "Enviar proposta",
  owner: null,
  dueText: null,
  done: false,
  position: 0,
  sentTo: [],
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  deletedAt: null,
  ...overrides,
});

const buildNote = (overrides: Partial<Note>): Note => ({
  id: "note",
  title: "",
  notesMarkdown: "",
  enhancedMarkdown: null,
  templateId: null,
  folderId: null,
  calendarEventId: null,
  participants: [],
  speakerNames: {},
  status: "done",
  recordingStartedAt: null,
  recordingEndedAt: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  deletedAt: null,
  ...overrides,
});

describe("summarizeWeek", () => {
  it("counts notes and recorded time since Monday", () => {
    const summary = summarizeWeek({
      notes: [
        buildNote({
          id: "this-week",
          recordingStartedAt: new Date(2026, 10, 10, 9, 0).toISOString(),
          recordingEndedAt: new Date(2026, 10, 10, 9, 45).toISOString(),
        }),
        buildNote({
          id: "also-this-week",
          createdAt: new Date(2026, 10, 11, 14, 0).toISOString(),
        }),
        buildNote({
          id: "last-week",
          createdAt: new Date(2026, 10, 6, 10, 0).toISOString(),
        }),
      ],
      actionItems: [
        buildItem({ id: "open" }),
        buildItem({ id: "done", done: true }),
        buildItem({ id: "old", noteId: "last-week" }),
      ],
      now: NOW,
    });

    expect(summary).toEqual({
      notesCount: 2,
      recordedMs: 45 * 60_000,
      openStepsCount: 1,
    });
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(120 * 60_000)).toBe("2h");
    expect(formatDuration(95 * 60_000)).toBe("1h35");
    expect(formatDuration(65 * 60_000)).toBe("1h05");
  });
});

describe("pluralize", () => {
  it("picks the singular only for one", () => {
    const forms = { one: "nota", other: "notas" };
    expect(pluralize(1, forms)).toBe("nota");
    expect(pluralize(0, forms)).toBe("notas");
    expect(pluralize(3, forms)).toBe("notas");
  });
});
