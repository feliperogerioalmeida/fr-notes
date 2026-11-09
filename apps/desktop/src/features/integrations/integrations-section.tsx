import { openUrl } from "@tauri-apps/plugin-opener";
import { formatTime, type Webhook } from "@workspace/core";
import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import { Switch } from "@workspace/ui/components/ui/switch";
import { cn } from "@workspace/ui/lib/utils";
import { BookOpen, KeyRound, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SettingsSection } from "@/features/settings/settings-section.js";

import { sendTestDelivery } from "./deliver-webhooks.js";
import {
  readWebhookSecret,
  useDeleteWebhook,
  useToggleWebhook,
  useWebhooksQuery,
} from "./use-webhooks.js";
import { WebhookDialog } from "./webhook-dialog.js";

const DOCS_URL =
  "https://github.com/feliperogerioalmeida/fr-notes/blob/main/docs/webhooks.md";

const DeliveryBadge = ({ webhook }: { webhook: Webhook }) => {
  if (!webhook.lastDeliveryAt) {
    return <Badge variant="secondary">Nunca enviado</Badge>;
  }
  const ok = webhook.lastError === null;
  return (
    <Badge
      className={cn(
        "border-transparent",
        ok
          ? "bg-success-subtle text-success-foreground"
          : "bg-danger-subtle text-danger-foreground",
      )}
      title={webhook.lastError ?? undefined}
    >
      {ok ? `OK ${webhook.lastStatus}` : (webhook.lastError ?? "Erro")} ·{" "}
      {formatTime(webhook.lastDeliveryAt)}
    </Badge>
  );
};

const copySecret = async (webhook: Webhook) => {
  const secret = await readWebhookSecret(webhook);
  if (!secret) {
    toast.error("Segredo não encontrado no Keychain.");
    return;
  }
  await navigator.clipboard.writeText(secret);
  toast.success("Segredo de assinatura copiado");
};

const testDelivery = async (webhook: Webhook) => {
  const result = await sendTestDelivery(webhook);
  if (result.error) {
    toast.error(`Falhou: ${result.error}`);
    return;
  }
  toast.success(`Entregue (HTTP ${result.status})`);
};

interface WebhookRowProps {
  webhook: Webhook;
  onEdit: () => void;
}

const WebhookRow = ({ webhook, onEdit }: WebhookRowProps) => {
  const toggle = useToggleWebhook();
  const remove = useDeleteWebhook();
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-sm text-heading font-medium">
            {webhook.name}
          </span>
          <span className="text-caption text-muted-foreground truncate">
            {webhook.url}
          </span>
        </div>
        <Switch
          checked={webhook.enabled}
          onCheckedChange={() => toggle.mutate(webhook)}
          aria-label={`Ativar ${webhook.name}`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {webhook.events.map((event) => (
            <Badge key={event} variant="outline" className="font-mono">
              {event}
            </Badge>
          ))}
          <DeliveryBadge webhook={webhook} />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => void testDelivery(webhook)}
          >
            <Send />
            Testar
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void copySecret(webhook)}
            aria-label="Copiar segredo de assinatura"
            title="Copiar segredo de assinatura"
          >
            <KeyRound />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEdit}
            aria-label="Editar"
          >
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => remove.mutate(webhook)}
            aria-label="Apagar"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const IntegrationsSection = () => {
  const { data: webhooks = [] } = useWebhooksQuery();
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const openEditor = (webhook: Webhook | null) => {
    setEditing(webhook);
    setIsDialogOpen(true);
  };
  return (
    <SettingsSection>
      {webhooks.map((webhook) => (
        <WebhookRow
          key={webhook.id}
          webhook={webhook}
          onEdit={() => openEditor(webhook)}
        />
      ))}
      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void openUrl(DOCS_URL)}
        >
          <BookOpen />
          Formato e verificação
        </Button>
        <Button size="sm" variant="secondary" onClick={() => openEditor(null)}>
          <Plus />
          Nova integração
        </Button>
      </div>
      <WebhookDialog
        webhook={editing}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </SettingsSection>
  );
};
