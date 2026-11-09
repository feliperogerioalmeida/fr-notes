import Database from "@tauri-apps/plugin-sql";
import {
  initializeStorage,
  type SqlClient,
  type Storage,
} from "@workspace/core";

const DATABASE_URL = "sqlite:fr-notes.db";

const createSqlClient = (database: Database): SqlClient => ({
  select: <Row>(query: string, params: unknown[] = []) =>
    database.select<Row[]>(query, params),
  execute: async (query: string, params: unknown[] = []) => {
    await database.execute(query, params);
  },
});

let storagePromise: Promise<Storage> | null = null;

const openStorage = async (): Promise<Storage> => {
  const database = await Database.load(DATABASE_URL);
  await database.execute("PRAGMA journal_mode = WAL");
  return initializeStorage(createSqlClient(database));
};

export const getStorage = (): Promise<Storage> => {
  storagePromise ??= openStorage();
  return storagePromise;
};
