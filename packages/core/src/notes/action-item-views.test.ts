import { describe, expect, it } from "vitest";

import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";
import {
  ANY_OWNER_FILTER,
  groupActionItems,
  isMyActionItem,
  listActionItemOwners,
  matchesOwnerFilter,
  MINE_OWNER_FILTER,
} from "./action-item-views.js";

const item = (owner: string | null, noteId = "note-a"): ActionItem => ({
  id: `${owner}-${noteId}`,
  noteId,
  key: "key",
  text: "Tarefa",
  owner,
  dueText: null,
  done: false,
  position: 0,
  sentTo: [],
  createdAt: "",
  updatedAt: "",
  deletedAt: null,
});

const note = (id: string, startedAt: string): Note => ({
  id,
  title: id,
  notesMarkdown: "",
  enhancedMarkdown: null,
  templateId: null,
  folderId: null,
  calendarEventId: null,
  participants: [],
  speakerNames: {},
  status: "done",
  recordingStartedAt: startedAt,
  recordingEndedAt: null,
  createdAt: startedAt,
  updatedAt: startedAt,
  deletedAt: null,
});

describe("isMyActionItem", () => {
  it("counts my tasks, shared ones, the whole group and unassigned ones", () => {
    const me = "Felipe Rogério";
    expect(isMyActionItem(item("Felipe"), me)).toBe(true);
    expect(isMyActionItem(item("Felipe e Rafa"), me)).toBe(true);
    expect(isMyActionItem(item("Todos"), me)).toBe(true);
    expect(isMyActionItem(item("Turma"), me)).toBe(true);
    expect(isMyActionItem(item(null), me)).toBe(true);
    expect(isMyActionItem(item("Raphael / Alandy"), me)).toBe(false);
    expect(isMyActionItem(item("Larissa"), me)).toBe(false);
  });
});

describe("owner filters", () => {
  const items = [item("Felipe"), item("Alandy"), item("Alandy"), item(null)];

  it("lists owners by how many tasks they have", () => {
    expect(listActionItemOwners(items)).toEqual(["Alandy", "Felipe"]);
  });

  it("filters by mine, a person or anyone", () => {
    const count = (filter: string) =>
      items.filter((each) => matchesOwnerFilter(each, filter, "Felipe")).length;
    expect(count(MINE_OWNER_FILTER)).toBe(2);
    expect(count("Alandy")).toBe(2);
    expect(count(ANY_OWNER_FILTER)).toBe(4);
  });
});

describe("groupActionItems", () => {
  const notes = [
    note("old", "2026-11-01T10:00:00Z"),
    note("new", "2026-11-12T10:00:00Z"),
  ];
  const items = [
    item("Felipe", "old"),
    item("Alandy", "new"),
    item("Felipe", "new"),
  ];

  it("groups by meeting, newest first", () => {
    expect(
      groupActionItems({ items, notes, by: "note" }).map((group) => [
        group.key,
        group.items.length,
      ]),
    ).toEqual([
      ["new", 2],
      ["old", 1],
    ]);
  });

  it("groups by owner, busiest first", () => {
    expect(
      groupActionItems({ items, notes, by: "owner" }).map(
        (group) => group.title,
      ),
    ).toEqual(["Felipe", "Alandy"]);
  });
});
