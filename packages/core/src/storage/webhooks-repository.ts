import {
  type Webhook,
  type WebhookDeliveryResult,
  type WebhookEvent,
  type WebhookInput,
  WebhookSchema,
} from "../domain/webhook.js";
import { createId, nowIso } from "../utils/ids.js";
import type { SqlClient } from "./sql-client.js";

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events_json: string;
  header_name: string | null;
  enabled: number;
  last_delivery_at: string | null;
  last_status: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const parseEvents = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const toWebhook = (row: WebhookRow): Webhook =>
  WebhookSchema.parse({
    id: row.id,
    name: row.name,
    url: row.url,
    events: parseEvents(row.events_json),
    headerName: row.header_name,
    enabled: Number(row.enabled) === 1,
    lastDeliveryAt: row.last_delivery_at,
    lastStatus: row.last_status === null ? null : Number(row.last_status),
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });

interface UpdateWebhookInput {
  id: string;
  input: WebhookInput;
}

interface RecordDeliveryInput {
  id: string;
  result: WebhookDeliveryResult;
}

export const createWebhooksRepository = (db: SqlClient) => {
  const listWebhooks = async (): Promise<Webhook[]> => {
    const rows = await db.select<WebhookRow>(
      "SELECT * FROM webhooks WHERE deleted_at IS NULL ORDER BY created_at ASC",
    );
    return rows.map(toWebhook);
  };

  const listWebhooksFor = async (event: WebhookEvent): Promise<Webhook[]> =>
    (await listWebhooks()).filter(
      (webhook) => webhook.enabled && webhook.events.includes(event),
    );

  const createWebhook = async (input: WebhookInput): Promise<string> => {
    const id = createId();
    const timestamp = nowIso();
    await db.execute(
      `INSERT INTO webhooks (id, name, url, events_json, header_name, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        input.url.trim(),
        JSON.stringify(input.events),
        input.headerName,
        input.enabled ? 1 : 0,
        timestamp,
        timestamp,
      ],
    );
    return id;
  };

  const updateWebhook = async ({ id, input }: UpdateWebhookInput) =>
    db.execute(
      `UPDATE webhooks SET name = ?, url = ?, events_json = ?, header_name = ?, enabled = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.name.trim(),
        input.url.trim(),
        JSON.stringify(input.events),
        input.headerName,
        input.enabled ? 1 : 0,
        nowIso(),
        id,
      ],
    );

  const deleteWebhook = async (id: string): Promise<void> => {
    const timestamp = nowIso();
    await db.execute(
      "UPDATE webhooks SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [timestamp, timestamp, id],
    );
  };

  const recordDelivery = async ({ id, result }: RecordDeliveryInput) =>
    db.execute(
      "UPDATE webhooks SET last_delivery_at = ?, last_status = ?, last_error = ? WHERE id = ?",
      [nowIso(), result.status, result.error, id],
    );

  return {
    listWebhooks,
    listWebhooksFor,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    recordDelivery,
  };
};

export type WebhooksRepository = ReturnType<typeof createWebhooksRepository>;
