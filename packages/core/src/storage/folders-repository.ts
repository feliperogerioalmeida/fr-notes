import { type Folder, FolderSchema } from "../domain/folder.js";
import { listDescendantIds } from "../folders/folder-tree.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const toFolder = (row: FolderRow): Folder =>
  FolderSchema.parse({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

export class FolderCycleError extends Error {
  constructor() {
    super("folder_cycle");
  }
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
}

interface RenameFolderInput {
  id: string;
  name: string;
}

interface MoveFolderInput {
  id: string;
  parentId: string | null;
}

export const createFoldersRepository = (db: SqlClient) => {
  const listFolders = async (): Promise<Folder[]> => {
    const rows = await db.select<FolderRow>(
      "SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC",
    );
    return rows.map(toFolder);
  };

  const createFolder = async ({
    name,
    parentId = null,
  }: CreateFolderInput): Promise<string> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      "INSERT INTO folders (id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, name.trim(), parentId, timestamp, timestamp],
    );
    return id;
  };

  const renameFolder = async ({ id, name }: RenameFolderInput) =>
    db.execute("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?", [
      name.trim(),
      nowIso(),
      id,
    ]);

  const moveFolder = async ({ id, parentId }: MoveFolderInput) => {
    const folders = await listFolders();
    if (parentId && listDescendantIds(folders, id).has(parentId)) {
      throw new FolderCycleError();
    }
    await db.execute(
      "UPDATE folders SET parent_id = ?, updated_at = ? WHERE id = ?",
      [parentId, nowIso(), id],
    );
  };

  const deleteFolder = async (id: string): Promise<void> => {
    const folder = (await listFolders()).find((item) => item.id === id);
    const parentId = folder?.parentId ?? null;
    const timestamp = nowIso();
    await db.execute(
      "UPDATE notes SET folder_id = ?, updated_at = ? WHERE folder_id = ?",
      [parentId, timestamp, id],
    );
    await db.execute(
      "UPDATE folders SET parent_id = ?, updated_at = ? WHERE parent_id = ? AND deleted_at IS NULL",
      [parentId, timestamp, id],
    );
    await db.execute(
      "UPDATE folders SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  return { listFolders, createFolder, renameFolder, moveFolder, deleteFolder };
};

export type FoldersRepository = ReturnType<typeof createFoldersRepository>;
