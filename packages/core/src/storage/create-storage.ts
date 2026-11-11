import { createActionItemsRepository } from "./action-items-repository.js";
import { createChatRepository } from "./chat-repository.js";
import { createConnectionsRepository } from "./connections-repository.js";
import { createDictationsRepository } from "./dictations-repository.js";
import { createFoldersRepository } from "./folders-repository.js";
import { runMigrations } from "./migrations.js";
import { createNotesRepository } from "./notes-repository.js";
import { createSearchRepository } from "./search-repository.js";
import { createSettingsRepository } from "./settings-repository.js";
import type { SqlClient } from "./sql-client.js";
import { createTemplatesRepository } from "./templates-repository.js";
import { createTranscriptRepository } from "./transcript-repository.js";
import { createWebhooksRepository } from "./webhooks-repository.js";

export const createStorage = (db: SqlClient) => ({
  notes: createNotesRepository(db),
  transcript: createTranscriptRepository(db),
  folders: createFoldersRepository(db),
  templates: createTemplatesRepository(db),
  chat: createChatRepository(db),
  settings: createSettingsRepository(db),
  webhooks: createWebhooksRepository(db),
  dictations: createDictationsRepository(db),
  actionItems: createActionItemsRepository(db),
  connections: createConnectionsRepository(db),
  search: createSearchRepository(db),
});

export type Storage = ReturnType<typeof createStorage>;

export const initializeStorage = async (db: SqlClient): Promise<Storage> => {
  await runMigrations(db);
  const storage = createStorage(db);
  await storage.templates.seedBuiltInTemplates();
  return storage;
};
