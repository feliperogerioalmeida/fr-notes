import { type Folder, FolderSchema } from "../domain/folder.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface FolderRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const toFolder = (row: FolderRow): Folder =>
  FolderSchema.parse({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

interface RenameFolderInput {
  id: string;
  name: string;
}

export const createFoldersRepository = (db: SqlClient) => {
  const listFolders = async (): Promise<Folder[]> => {
    const rows = await db.select<FolderRow>(
      "SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC",
    );
    return rows.map(toFolder);
  };

  const createFolder = async (name: string): Promise<string> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      "INSERT INTO folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [id, name.trim(), timestamp, timestamp],
    );
    return id;
  };

  const renameFolder = async ({ id, name }: RenameFolderInput) =>
    db.execute("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?", [
      name.trim(),
      nowIso(),
      id,
    ]);

  const deleteFolder = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE notes SET folder_id = NULL, updated_at = ? WHERE folder_id = ?",
      [timestamp, id],
    );
    await db.execute(
      "UPDATE folders SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  return { listFolders, createFolder, renameFolder, deleteFolder };
};

export type FoldersRepository = ReturnType<typeof createFoldersRepository>;
