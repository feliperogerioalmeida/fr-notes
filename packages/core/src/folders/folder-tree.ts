import type { Folder } from "../domain/folder.js";

export interface FolderNode {
  folder: Folder;
  depth: number;
  children: FolderNode[];
}

const compareByName = (a: Folder, b: Folder) =>
  a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });

const groupByParent = (folders: Folder[]) => {
  const ids = new Set(folders.map((folder) => folder.id));
  const byParent = new Map<string | null, Folder[]>();
  folders.forEach((folder) => {
    const parentId =
      folder.parentId && ids.has(folder.parentId) ? folder.parentId : null;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), folder]);
  });
  return byParent;
};

export const buildFolderTree = (folders: Folder[]): FolderNode[] => {
  const byParent = groupByParent(folders);
  const visited = new Set<string>();
  const build = (parentId: string | null, depth: number): FolderNode[] =>
    [...(byParent.get(parentId) ?? [])]
      .sort(compareByName)
      .filter((folder) => !visited.has(folder.id))
      .map((folder) => {
        visited.add(folder.id);
        return { folder, depth, children: build(folder.id, depth + 1) };
      });
  return build(null, 0);
};

export const flattenFolderTree = (nodes: FolderNode[]): FolderNode[] =>
  nodes.flatMap((node) => [node, ...flattenFolderTree(node.children)]);

export const listDescendantIds = (
  folders: Folder[],
  id: string,
): Set<string> => {
  const byParent = groupByParent(folders);
  const descendants = new Set<string>([id]);
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    (byParent.get(current) ?? []).forEach((child) => {
      if (descendants.has(child.id)) return;
      descendants.add(child.id);
      queue.push(child.id);
    });
  }
  return descendants;
};

export const describeFolderPath = (folders: Folder[], id: string): Folder[] => {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: Folder[] = [];
  let current = byId.get(id);
  while (current && !path.includes(current)) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
};
