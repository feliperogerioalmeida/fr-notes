import {
  type Connection,
  type ConnectionProvider,
  ConnectionSchema,
} from "../domain/connection.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface ConnectionRow {
  id: string;
  provider: string;
  name: string;
  config_json: string;
  enabled: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const parseConfig = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const toConnection = (row: ConnectionRow): Connection =>
  ConnectionSchema.parse({
    id: row.id,
    provider: row.provider,
    name: row.name,
    config: parseConfig(row.config_json),
    enabled: Number(row.enabled) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

export interface ConnectionInput {
  provider: ConnectionProvider;
  name: string;
  config: Record<string, string>;
  enabled: boolean;
}

interface UpdateConnectionInput {
  id: string;
  input: ConnectionInput;
}

export const createConnectionsRepository = (db: SqlClient) => {
  const listConnections = async (): Promise<Connection[]> => {
    const rows = await db.select<ConnectionRow>(
      "SELECT * FROM connections WHERE deleted_at IS NULL ORDER BY created_at ASC",
    );
    return rows.map(toConnection);
  };

  const createConnection = async (input: ConnectionInput): Promise<string> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      `INSERT INTO connections (id, provider, name, config_json, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.provider,
        input.name.trim(),
        JSON.stringify(input.config),
        input.enabled ? 1 : 0,
        timestamp,
        timestamp,
      ],
    );
    return id;
  };

  const updateConnection = ({ id, input }: UpdateConnectionInput) =>
    db.execute(
      "UPDATE connections SET name = ?, config_json = ?, enabled = ?, updated_at = ? WHERE id = ?",
      [
        input.name.trim(),
        JSON.stringify(input.config),
        input.enabled ? 1 : 0,
        nowIso(),
        id,
      ],
    );

  const deleteConnection = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE connections SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  return {
    listConnections,
    createConnection,
    updateConnection,
    deleteConnection,
  };
};

export type ConnectionsRepository = ReturnType<
  typeof createConnectionsRepository
>;
