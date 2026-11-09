import type { ActionItem } from "../domain/action-item.js";
import type { Connection, ConnectionProvider } from "../domain/connection.js";
import type { Note } from "../domain/note.js";
import { createClickUpTask } from "./clickup.js";
import type { HttpFetch, SentResult } from "./http.js";
import { createLinearIssue } from "./linear.js";
import { createNotionPage } from "./notion.js";
import {
  buildSlackNoteText,
  buildSlackTaskText,
  postSlackMessage,
} from "./slack.js";

export class UnsupportedConnectionError extends Error {
  constructor(provider: ConnectionProvider, action: string) {
    super(`${provider} não suporta ${action}`);
  }
}

interface SendContext {
  connection: Connection;
  token: string;
  note: Note;
  fetch: HttpFetch;
}

interface SendActionItemInput extends SendContext {
  item: ActionItem;
}

type TaskSender = (input: SendActionItemInput) => Promise<SentResult>;

const TASK_SENDERS: Partial<Record<ConnectionProvider, TaskSender>> = {
  clickup: ({ connection, token, note, item, fetch }) =>
    createClickUpTask({
      token,
      fetch,
      item,
      note,
      listId: connection.config.listId ?? "",
    }),
  linear: ({ connection, token, note, item, fetch }) =>
    createLinearIssue({
      token,
      fetch,
      item,
      note,
      teamId: connection.config.teamId ?? "",
    }),
  slack: ({ token, note, item, fetch }) =>
    postSlackMessage({
      webhookUrl: token,
      fetch,
      text: buildSlackTaskText(item, note),
    }),
};

export const sendActionItem = (
  input: SendActionItemInput,
): Promise<SentResult> => {
  const sender = TASK_SENDERS[input.connection.provider];
  if (!sender) {
    throw new UnsupportedConnectionError(input.connection.provider, "tarefas");
  }
  return sender(input);
};

interface SendNoteInput extends SendContext {
  summary: string;
}

type NoteSender = (input: SendNoteInput) => Promise<SentResult>;

const NOTE_SENDERS: Partial<Record<ConnectionProvider, NoteSender>> = {
  notion: ({ connection, token, note, summary, fetch }) =>
    createNotionPage({
      token,
      fetch,
      note,
      summary,
      databaseId: connection.config.databaseId ?? "",
    }),
  slack: ({ token, note, summary, fetch }) =>
    postSlackMessage({
      webhookUrl: token,
      fetch,
      text: buildSlackNoteText(note, summary),
    }),
};

export const sendNote = (input: SendNoteInput): Promise<SentResult> => {
  const sender = NOTE_SENDERS[input.connection.provider];
  if (!sender) {
    throw new UnsupportedConnectionError(input.connection.provider, "notas");
  }
  return sender(input);
};
