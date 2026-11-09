import {
  type Template,
  type TemplateInput,
  TemplateSchema,
} from "../domain/template.js";
import { BUILT_IN_TEMPLATES } from "../templates/built-in-templates.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  instructions: string;
  is_built_in: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const toTemplate = (row: TemplateRow): Template =>
  TemplateSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    isBuiltIn: Number(row.is_built_in) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

interface UpdateTemplateInput {
  id: string;
  input: TemplateInput;
}

export const createTemplatesRepository = (db: SqlClient) => {
  const listTemplates = async (): Promise<Template[]> => {
    const rows = await db.select<TemplateRow>(
      "SELECT * FROM templates WHERE deleted_at IS NULL ORDER BY is_built_in DESC, created_at ASC",
    );
    return rows.map(toTemplate);
  };

  const findTemplate = async (id: string): Promise<Template | null> => {
    const rows = await db.select<TemplateRow>(
      "SELECT * FROM templates WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    return rows[0] ? toTemplate(rows[0]) : null;
  };

  const createTemplate = async (input: TemplateInput): Promise<string> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      `INSERT INTO templates (id, name, description, instructions, is_built_in, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        input.name,
        input.description,
        input.instructions,
        timestamp,
        timestamp,
      ],
    );
    return id;
  };

  const updateTemplate = async ({ id, input }: UpdateTemplateInput) =>
    db.execute(
      "UPDATE templates SET name = ?, description = ?, instructions = ?, updated_at = ? WHERE id = ?",
      [input.name, input.description, input.instructions, nowIso(), id],
    );

  const deleteTemplate = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE templates SET deleted_at = ?, updated_at = ? WHERE id = ? AND is_built_in = 0",
      [timestamp, timestamp, id],
    );
  };

  const seedBuiltInTemplates = async (): Promise<void> => {
    const timestamp = nowIso();
    for (const template of BUILT_IN_TEMPLATES) {
      await db.execute(
        `INSERT OR IGNORE INTO templates (id, name, description, instructions, is_built_in, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [
          template.id,
          template.name,
          template.description,
          template.instructions,
          timestamp,
          timestamp,
        ],
      );
    }
  };

  return {
    listTemplates,
    findTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    seedBuiltInTemplates,
  };
};

export type TemplatesRepository = ReturnType<typeof createTemplatesRepository>;
