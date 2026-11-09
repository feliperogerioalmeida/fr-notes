import { openUrl } from "@tauri-apps/plugin-opener";
import {
  type ActionItem,
  type Connection,
  type Note,
  nowIso,
  sendActionItem,
  sendNote,
  type SentResult,
} from "@workspace/core";
import { toast } from "sonner";

import { getStorage } from "@/lib/database.js";
import { describeError } from "@/lib/errors.js";
import { httpFetch } from "@/lib/http-client.js";
import { connectionTokenKey, readSecret } from "@/lib/native.js";

import { refreshActionItems } from "./sync-action-items.js";

const readToken = async (connection: Connection) => {
  const token = await readSecret(connectionTokenKey(connection.id));
  if (!token) {
    throw new Error(`Chave de ${connection.name} não encontrada no Keychain.`);
  }
  return token;
};

const announce = (connection: Connection, result: SentResult) =>
  toast.success(`Enviado para ${connection.name}`, {
    action: result.url
      ? { label: "Abrir", onClick: () => void openUrl(result.url ?? "") }
      : undefined,
  });

export const wasSentTo = (item: ActionItem, connection: Connection) =>
  item.sentTo.some((ref) => ref.connectionId === connection.id);

interface DeliverInput {
  item: ActionItem;
  connection: Connection;
  token: string;
}

const deliverItem = async ({ item, connection, token }: DeliverInput) => {
  const storage = await getStorage();
  const note = await storage.notes.findNote(item.noteId);
  if (!note) throw new Error("Nota não encontrada.");
  const result = await sendActionItem({
    connection,
    item,
    note,
    token,
    fetch: httpFetch,
  });
  await storage.actionItems.recordSent({
    id: item.id,
    ref: {
      connectionId: connection.id,
      provider: connection.provider,
      externalId: result.externalId,
      url: result.url,
      sentAt: nowIso(),
    },
  });
  return result;
};

interface SendItemInput {
  item: ActionItem;
  connection: Connection;
}

export const sendItemTo = async ({ item, connection }: SendItemInput) => {
  try {
    const token = await readToken(connection);
    const result = await deliverItem({ item, connection, token });
    announce(connection, result);
  } catch (error) {
    toast.error(describeError(error));
  } finally {
    await refreshActionItems();
  }
};

interface SendItemsInput {
  items: ActionItem[];
  connection: Connection;
}

const describeBatch = (sent: number, connection: Connection) =>
  sent === 1
    ? `1 próximo passo enviado para ${connection.name}`
    : `${sent} próximos passos enviados para ${connection.name}`;

export const sendItemsTo = async ({ items, connection }: SendItemsInput) => {
  const pending = items.filter((item) => !wasSentTo(item, connection));
  if (pending.length === 0) {
    toast.message(`Tudo já foi enviado para ${connection.name}.`);
    return;
  }
  let sent = 0;
  try {
    const token = await readToken(connection);
    for (const item of pending) {
      await deliverItem({ item, connection, token });
      sent += 1;
    }
    toast.success(describeBatch(sent, connection));
  } catch (error) {
    toast.error(describeError(error), {
      description: sent > 0 ? describeBatch(sent, connection) : undefined,
    });
  } finally {
    await refreshActionItems();
  }
};

interface SendNoteInput {
  note: Note;
  connection: Connection;
}

export const sendNoteTo = async ({ note, connection }: SendNoteInput) => {
  try {
    const result = await sendNote({
      connection,
      note,
      summary: note.enhancedMarkdown ?? note.notesMarkdown,
      token: await readToken(connection),
      fetch: httpFetch,
    });
    announce(connection, result);
  } catch (error) {
    toast.error(describeError(error));
  }
};
