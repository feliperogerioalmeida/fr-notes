import type { ActionItem } from "../domain/action-item.js";
import type { Note } from "../domain/note.js";

export const MINE_OWNER_FILTER = "mine";
export const ANY_OWNER_FILTER = "any";

const COLLECTIVE_OWNERS = [
  "todos",
  "todas",
  "turma",
  "time",
  "equipe",
  "nós",
  "eu",
];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const firstName = (name: string) => normalize(name).split(/\s+/)[0] ?? "";

const OWNER_SEPARATOR = /\s*(?:\/|,|&|\be\b)\s*/;

export const isMyActionItem = (item: ActionItem, userName: string) => {
  const owner = item.owner?.trim();
  if (!owner) return true;
  if (COLLECTIVE_OWNERS.includes(normalize(owner))) return true;
  const me = firstName(userName);
  if (!me) return false;
  return owner
    .split(OWNER_SEPARATOR)
    .some((person) => firstName(person) === me);
};

export const matchesOwnerFilter = (
  item: ActionItem,
  filter: string,
  userName: string,
) => {
  if (filter === ANY_OWNER_FILTER) return true;
  if (filter === MINE_OWNER_FILTER) return isMyActionItem(item, userName);
  return (item.owner?.trim() ?? "") === filter;
};

export const listActionItemOwners = (items: ActionItem[]): string[] => {
  const counts = items.reduce<Map<string, number>>((all, item) => {
    const owner = item.owner?.trim();
    if (owner) all.set(owner, (all.get(owner) ?? 0) + 1);
    return all;
  }, new Map());
  return [...counts.entries()]
    .sort(
      (first, second) =>
        second[1] - first[1] || first[0].localeCompare(second[0]),
    )
    .map(([owner]) => owner);
};

export type ActionItemGrouping = "note" | "owner";

export interface ActionItemGroup {
  key: string;
  title: string;
  note: Note | null;
  items: ActionItem[];
}

const NO_OWNER = "Sem responsável";

const noteTime = (note: Note) =>
  new Date(note.recordingStartedAt ?? note.createdAt).getTime();

const groupByNote = (items: ActionItem[], notes: Note[]): ActionItemGroup[] => {
  const itemsByNote = items.reduce<Map<string, ActionItem[]>>((all, item) => {
    all.set(item.noteId, [...(all.get(item.noteId) ?? []), item]);
    return all;
  }, new Map());
  return notes
    .filter((note) => itemsByNote.has(note.id))
    .sort((first, second) => noteTime(second) - noteTime(first))
    .map((note) => ({
      key: note.id,
      title: note.title,
      note,
      items: itemsByNote.get(note.id) ?? [],
    }));
};

const groupByOwner = (items: ActionItem[]): ActionItemGroup[] => {
  const groups = new Map<string, ActionItemGroup>();
  items.forEach((item) => {
    const owner = item.owner?.trim() || NO_OWNER;
    const group = groups.get(owner) ?? {
      key: owner,
      title: owner,
      note: null,
      items: [],
    };
    group.items.push(item);
    groups.set(owner, group);
  });
  return [...groups.values()].sort(
    (first, second) => second.items.length - first.items.length,
  );
};

interface GroupActionItemsInput {
  items: ActionItem[];
  notes: Note[];
  by: ActionItemGrouping;
}

export const groupActionItems = ({
  items,
  notes,
  by,
}: GroupActionItemsInput) =>
  by === "note" ? groupByNote(items, notes) : groupByOwner(items);
