import { describe, expect, it } from "vitest";

import type { Note } from "../domain/note.js";
import { formatDuration, summarizeWeek } from "./note-stats.js";

const NOW = new Date(2026, 10, 12, 15, 0);

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
    const summary = summarizeWeek(
      [
        buildNote({
          recordingStartedAt: new Date(2026, 10, 10, 9, 0).toISOString(),
          recordingEndedAt: new Date(2026, 10, 10, 9, 45).toISOString(),
          enhancedMarkdown: "### Resumo",
        }),
        buildNote({ createdAt: new Date(2026, 10, 11, 14, 0).toISOString() }),
        buildNote({ createdAt: new Date(2026, 10, 6, 10, 0).toISOString() }),
      ],
      NOW,
    );

    expect(summary).toEqual({
      notesCount: 2,
      recordedMs: 45 * 60_000,
      enhancedCount: 1,
    });
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(120 * 60_000)).toBe("2 h");
    expect(formatDuration(95 * 60_000)).toBe("1 h 35 min");
  });
});
