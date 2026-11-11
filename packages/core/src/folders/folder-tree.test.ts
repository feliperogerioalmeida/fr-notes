import { describe, expect, it } from "vitest";

import type { Folder } from "../domain/folder.js";
import {
  buildFolderTree,
  describeFolderPath,
  flattenFolderTree,
  listDescendantIds,
} from "./folder-tree.js";

const folder = (
  id: string,
  name: string,
  parentId: string | null = null,
): Folder => ({
  id,
  name,
  parentId,
  createdAt: "2026-11-10T00:00:00.000Z",
  updatedAt: "2026-11-10T00:00:00.000Z",
  deletedAt: null,
});

const FOLDERS = [
  folder("fr", "FR Digital"),
  folder("clientes", "Clientes"),
  folder("marina", "Marina", "clientes"),
  folder("kickoff", "Kickoff", "marina"),
  folder("orphan", "Órfã", "apagada"),
];

describe("folder tree", () => {
  it("nests folders by parent, sorted by name, with orphans at the root", () => {
    const flat = flattenFolderTree(buildFolderTree(FOLDERS));
    expect(flat.map((node) => [node.folder.name, node.depth])).toEqual([
      ["Clientes", 0],
      ["Marina", 1],
      ["Kickoff", 2],
      ["FR Digital", 0],
      ["Órfã", 0],
    ]);
  });

  it("lists a folder with all of its descendants", () => {
    expect([...listDescendantIds(FOLDERS, "clientes")].sort()).toEqual([
      "clientes",
      "kickoff",
      "marina",
    ]);
  });

  it("describes the path from the root", () => {
    expect(
      describeFolderPath(FOLDERS, "kickoff").map((item) => item.name),
    ).toEqual(["Clientes", "Marina", "Kickoff"]);
  });

  it("survives a corrupted cycle", () => {
    const looped = [folder("a", "A", "b"), folder("b", "B", "a")];
    expect(flattenFolderTree(buildFolderTree(looped))).toEqual([]);
    expect(describeFolderPath(looped, "a").map((item) => item.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
