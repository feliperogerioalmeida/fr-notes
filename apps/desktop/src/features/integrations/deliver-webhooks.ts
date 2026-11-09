import { getVersion } from "@tauri-apps/api/app";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  buildWebhookPayload,
  type Note,
  signWebhookBody,
  type Webhook,
  type WebhookDeliveryResult,
  type WebhookEvent,
  type WebhookPayload,
} from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import {
  readSecret,
  webhookHeaderKey,
  webhookSecretKey,
} from "@/lib/native.js";
import { queryClient } from "@/lib/query-client.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

const TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [0, 2_000, 10_000];
const MS_PER_SECOND = 1000;
const AUTH_SCHEME = /^(Bearer|Basic|Token)\s/i;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isSuccess = (status: number) => status >= 200 && status < 300;

const formatAuthHeader = (headerName: string, value: string) =>
  headerName.toLowerCase() === "authorization" && !AUTH_SCHEME.test(value)
    ? `Bearer ${value}`
    : value;

const buildHeaders = async (webhook: Webhook, payload: WebhookPayload) => {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / MS_PER_SECOND));
  const secret = (await readSecret(webhookSecretKey(webhook.id))) ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": `FR-Notes/${payload.source.version}`,
    "X-FR-Notes-Event": payload.event,
    "X-FR-Notes-Delivery": payload.id,
    "X-FR-Notes-Timestamp": timestamp,
    "X-FR-Notes-Signature": await signWebhookBody({ secret, timestamp, body }),
  };
  const headerValue = webhook.headerName
    ? await readSecret(webhookHeaderKey(webhook.id))
    : null;
  if (webhook.headerName && headerValue) {
    headers[webhook.headerName] = formatAuthHeader(
      webhook.headerName,
      headerValue,
    );
  }
  return { body, headers };
};

const postOnce = async (
  webhook: Webhook,
  payload: WebhookPayload,
): Promise<WebhookDeliveryResult> => {
  try {
    const { body, headers } = await buildHeaders(webhook, payload);
    const response = await tauriFetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      status: response.status,
      error: isSuccess(response.status) ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

interface DeliverWebhookInput {
  webhook: Webhook;
  payload: WebhookPayload;
  attempts?: number;
}

export const deliverWebhook = async ({
  webhook,
  payload,
  attempts = RETRY_DELAYS_MS.length,
}: DeliverWebhookInput): Promise<WebhookDeliveryResult> => {
  let result: WebhookDeliveryResult = { status: null, error: "not_sent" };
  for (const delay of RETRY_DELAYS_MS.slice(0, attempts)) {
    await wait(delay);
    result = await postOnce(webhook, payload);
    if (result.status !== null && isSuccess(result.status)) break;
  }
  await (
    await getStorage()
  ).webhooks.recordDelivery({ id: webhook.id, result });
  await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.webhooks });
  return result;
};

const loadPayload = async (note: Note, event: WebhookEvent) => {
  const storage = await getStorage();
  const segments = await storage.transcript.listSegments(note.id);
  const folders = await storage.folders.listFolders();
  const template = note.templateId
    ? await storage.templates.findTemplate(note.templateId)
    : null;
  return buildWebhookPayload({
    event,
    note,
    segments,
    folder: folders.find((folder) => folder.id === note.folderId) ?? null,
    template,
    appVersion: await getVersion(),
  });
};

interface DispatchNoteEventInput {
  noteId: string;
  event: WebhookEvent;
}

export const dispatchNoteEvent = async ({
  noteId,
  event,
}: DispatchNoteEventInput): Promise<WebhookDeliveryResult[]> => {
  const storage = await getStorage();
  const webhooks = await storage.webhooks.listWebhooksFor(event);
  const note = await storage.notes.findNote(noteId);
  if (webhooks.length === 0 || !note) return [];
  const payload = await loadPayload(note, event);
  return Promise.all(
    webhooks.map((webhook) => deliverWebhook({ webhook, payload })),
  );
};

export const dispatchCurrentState = (note: Note) =>
  dispatchNoteEvent({
    noteId: note.id,
    event: note.enhancedMarkdown ? "note.enhanced" : "note.completed",
  });

const SAMPLE_NOTE: Note = {
  id: "00000000-0000-4000-8000-000000000000",
  title: "Teste de integração do FR Notes",
  notesMarkdown: "- exemplo de anotação",
  enhancedMarkdown: "### Resumo\n- Este é um envio de teste do FR Notes.",
  templateId: null,
  folderId: null,
  calendarEventId: null,
  participants: [{ name: "Participante de exemplo", email: null }],
  status: "done",
  recordingStartedAt: null,
  recordingEndedAt: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  deletedAt: null,
};

export const sendTestDelivery = async (
  webhook: Webhook,
): Promise<WebhookDeliveryResult> => {
  const payload = buildWebhookPayload({
    event: webhook.events[0] ?? "note.enhanced",
    note: { ...SAMPLE_NOTE, updatedAt: new Date().toISOString() },
    segments: [],
    folder: null,
    template: null,
    appVersion: await getVersion(),
  });
  return deliverWebhook({ webhook, payload, attempts: 1 });
};
