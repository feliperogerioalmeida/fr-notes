import { type Settings, SettingsSchema } from "../domain/settings.js";
import { nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface SettingRow {
  key: string;
  value: string;
}

const parseValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export const createSettingsRepository = (db: SqlClient) => {
  const readSettings = async (): Promise<Settings> => {
    const rows = await db.select<SettingRow>("SELECT key, value FROM settings");
    const stored = Object.fromEntries(
      rows.map((row) => [row.key, parseValue(row.value)]),
    );
    const parsed = SettingsSchema.safeParse(stored);
    return parsed.success ? parsed.data : SettingsSchema.parse({});
  };

  const writeSettings = async (patch: Partial<Settings>): Promise<void> => {
    const timestamp = nowIso();
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      await db.execute(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, JSON.stringify(value), timestamp],
      );
    }
  };

  return { readSettings, writeSettings };
};

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
