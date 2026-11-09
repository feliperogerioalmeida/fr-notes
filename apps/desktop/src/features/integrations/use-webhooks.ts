import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWebhookSecret,
  type Webhook,
  type WebhookInput,
} from "@workspace/core";

import { getStorage } from "@/lib/database.js";
import {
  readSecret,
  removeSecret,
  webhookHeaderKey,
  webhookSecretKey,
  writeSecret,
} from "@/lib/native.js";
import { QUERY_KEYS } from "@/lib/query-keys.js";

export const useWebhooksQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.webhooks,
    queryFn: async () => (await getStorage()).webhooks.listWebhooks(),
  });

const useInvalidateWebhooks = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.webhooks });
};

export interface SaveWebhookInput {
  id: string | null;
  input: WebhookInput;
  headerValue: string | null;
}

const storeHeaderValue = async (id: string, input: SaveWebhookInput) => {
  if (!input.input.headerName) return removeSecret(webhookHeaderKey(id));
  if (input.headerValue === null) return;
  await writeSecret(webhookHeaderKey(id), input.headerValue);
};

const persistWebhook = async (input: SaveWebhookInput): Promise<string> => {
  const { webhooks } = await getStorage();
  if (input.id) {
    await webhooks.updateWebhook({ id: input.id, input: input.input });
    await storeHeaderValue(input.id, input);
    return input.id;
  }
  const id = await webhooks.createWebhook(input.input);
  await writeSecret(webhookSecretKey(id), createWebhookSecret());
  await storeHeaderValue(id, input);
  return id;
};

export const useSaveWebhook = () => {
  const invalidate = useInvalidateWebhooks();
  return useMutation({ mutationFn: persistWebhook, onSuccess: invalidate });
};

const removeWebhook = async (webhook: Webhook) => {
  await (await getStorage()).webhooks.deleteWebhook(webhook.id);
  await removeSecret(webhookSecretKey(webhook.id));
  await removeSecret(webhookHeaderKey(webhook.id));
};

export const useDeleteWebhook = () => {
  const invalidate = useInvalidateWebhooks();
  return useMutation({ mutationFn: removeWebhook, onSuccess: invalidate });
};

export const useToggleWebhook = () => {
  const invalidate = useInvalidateWebhooks();
  return useMutation({
    mutationFn: async (webhook: Webhook) =>
      (await getStorage()).webhooks.updateWebhook({
        id: webhook.id,
        input: { ...webhook, enabled: !webhook.enabled },
      }),
    onSuccess: invalidate,
  });
};

export const readWebhookSecret = (webhook: Webhook) =>
  readSecret(webhookSecretKey(webhook.id));
