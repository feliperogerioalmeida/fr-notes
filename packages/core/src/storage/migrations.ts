import type { SqlClient } from "./sql-client.js";

interface Migration {
  version: number;
  statements: string[];
}

const SYNCED_COLUMNS = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT`;

const FTS_TOKENIZER = `tokenize=unicode61 "remove_diacritics=2"`;

const NOTE_SEARCH_BODY = (row: string) =>
  `COALESCE(${row}.title, '') || char(10) || COALESCE(${row}.notes_markdown, '') || char(10) || COALESCE(${row}.enhanced_markdown, '')`;

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        notes_markdown TEXT NOT NULL DEFAULT '',
        enhanced_markdown TEXT,
        template_id TEXT,
        folder_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        recording_started_at TEXT,
        recording_ended_at TEXT,${SYNCED_COLUMNS}
      )`,
      `CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes (created_at)`,
      `CREATE TABLE IF NOT EXISTS transcript_segments (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        source TEXT NOT NULL,
        text TEXT NOT NULL,
        start_ms INTEGER NOT NULL,
        end_ms INTEGER NOT NULL,${SYNCED_COLUMNS}
      )`,
      `CREATE INDEX IF NOT EXISTS idx_segments_note ON transcript_segments (note_id, start_ms)`,
      `CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,${SYNCED_COLUMNS}
      )`,
      `CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        instructions TEXT NOT NULL,
        is_built_in INTEGER NOT NULL DEFAULT 0,${SYNCED_COLUMNS}
      )`,
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,${SYNCED_COLUMNS}
      )`,
      `CREATE INDEX IF NOT EXISTS idx_chat_note ON chat_messages (note_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    statements: [
      "ALTER TABLE notes ADD COLUMN calendar_event_id TEXT",
      "ALTER TABLE notes ADD COLUMN participants_json TEXT NOT NULL DEFAULT '[]'",
      "CREATE INDEX IF NOT EXISTS idx_notes_calendar_event ON notes (calendar_event_id)",
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        events_json TEXT NOT NULL DEFAULT '[]',
        header_name TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_delivery_at TEXT,
        last_status INTEGER,
        last_error TEXT,${SYNCED_COLUMNS}
      )`,
    ],
  },
  {
    version: 4,
    statements: [
      "ALTER TABLE transcript_segments ADD COLUMN speaker INTEGER",
      "ALTER TABLE notes ADD COLUMN speaker_names_json TEXT NOT NULL DEFAULT '{}'",
    ],
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS dictations (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        polished INTEGER NOT NULL DEFAULT 0,
        inserted INTEGER NOT NULL DEFAULT 0,
        target_app_name TEXT,
        target_app_bundle_id TEXT,${SYNCED_COLUMNS}
      )`,
      "CREATE INDEX IF NOT EXISTS idx_dictations_created_at ON dictations (created_at)",
    ],
  },
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS action_items (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        item_key TEXT NOT NULL,
        text TEXT NOT NULL,
        owner TEXT,
        due_text TEXT,
        done INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        sent_to_json TEXT NOT NULL DEFAULT '[]',${SYNCED_COLUMNS}
      )`,
      "CREATE INDEX IF NOT EXISTS idx_action_items_note ON action_items (note_id, position)",
      `CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        name TEXT NOT NULL,
        config_json TEXT NOT NULL DEFAULT '{}',
        enabled INTEGER NOT NULL DEFAULT 1,${SYNCED_COLUMNS}
      )`,
    ],
  },
  {
    version: 7,
    statements: [
      "ALTER TABLE folders ADD COLUMN parent_id TEXT",
      "CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders (parent_id)",
    ],
  },
  {
    version: 8,
    statements: [
      `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts4(body, ${FTS_TOKENIZER})`,
      `CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts4(body, ${FTS_TOKENIZER})`,
      `CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes
       WHEN new.deleted_at IS NULL BEGIN
         INSERT INTO notes_fts(docid, body) VALUES (new.rowid, ${NOTE_SEARCH_BODY("new")});
       END`,
      `CREATE TRIGGER IF NOT EXISTS notes_fts_update
       AFTER UPDATE OF title, notes_markdown, enhanced_markdown, deleted_at ON notes BEGIN
         DELETE FROM notes_fts WHERE docid = old.rowid;
         INSERT INTO notes_fts(docid, body)
           SELECT new.rowid, ${NOTE_SEARCH_BODY("new")} WHERE new.deleted_at IS NULL;
       END`,
      `CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
         DELETE FROM notes_fts WHERE docid = old.rowid;
       END`,
      `CREATE TRIGGER IF NOT EXISTS segments_fts_insert AFTER INSERT ON transcript_segments
       WHEN new.deleted_at IS NULL BEGIN
         INSERT INTO segments_fts(docid, body) VALUES (new.rowid, new.text);
       END`,
      `CREATE TRIGGER IF NOT EXISTS segments_fts_update
       AFTER UPDATE OF text, deleted_at ON transcript_segments BEGIN
         DELETE FROM segments_fts WHERE docid = old.rowid;
         INSERT INTO segments_fts(docid, body)
           SELECT new.rowid, new.text WHERE new.deleted_at IS NULL;
       END`,
      `CREATE TRIGGER IF NOT EXISTS segments_fts_delete AFTER DELETE ON transcript_segments BEGIN
         DELETE FROM segments_fts WHERE docid = old.rowid;
       END`,
      `INSERT INTO notes_fts(docid, body)
       SELECT rowid, ${NOTE_SEARCH_BODY("notes")} FROM notes WHERE deleted_at IS NULL`,
      `INSERT INTO segments_fts(docid, body)
       SELECT rowid, text FROM transcript_segments WHERE deleted_at IS NULL`,
    ],
  },
];

const ensureMigrationsTable = (db: SqlClient): Promise<void> =>
  db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`,
  );

const readAppliedVersions = async (db: SqlClient): Promise<Set<number>> => {
  const rows = await db.select<{ version: number }>(
    "SELECT version FROM schema_migrations",
  );
  return new Set(rows.map((row) => row.version));
};

const applyMigration = async (
  db: SqlClient,
  migration: Migration,
): Promise<void> => {
  for (const statement of migration.statements) {
    await db.execute(statement);
  }
  await db.execute(
    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    [migration.version, new Date().toISOString()],
  );
};

export const runMigrations = async (db: SqlClient): Promise<void> => {
  await ensureMigrationsTable(db);
  const applied = await readAppliedVersions(db);
  const pending = MIGRATIONS.filter(
    (migration) => !applied.has(migration.version),
  );
  for (const migration of pending) {
    await applyMigration(db, migration);
  }
};
