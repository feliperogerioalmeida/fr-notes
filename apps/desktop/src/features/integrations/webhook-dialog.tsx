import {
  type Webhook,
  WEBHOOK_EVENT_LABELS,
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from "@workspace/core";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/ui/dialog";
import { Input } from "@workspace/ui/components/ui/input";
import { PasswordInput } from "@workspace/ui/components/ui/password-input";
import { Switch } from "@workspace/ui/components/ui/switch";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { SelectSetting } from "@/features/settings/settings-controls.js";
import { SettingsField } from "@/features/settings/settings-section.js";
import { describeError } from "@/lib/errors.js";

import { useSaveWebhook } from "./use-webhooks.js";

type AuthMode = "none" | "authorization" | "x-api-key" | "custom";

const AUTH_OPTIONS: { value: AuthMode; label: string }[] = [
  { value: "none", label: "Nenhuma" },
  { value: "authorization", label: "Authorization: Bearer <chave>" },
  { value: "x-api-key", label: "X-API-Key: <chave>" },
  { value: "custom", label: "Outro cabeçalho" },
];

const AUTH_HEADERS: Record<Exclude<AuthMode, "none" | "custom">, string> = {
  authorization: "Authorization",
  "x-api-key": "X-API-Key",
};

interface FormState {
  name: string;
  url: string;
  events: WebhookEvent[];
  authMode: AuthMode;
  customHeader: string;
  headerValue: string;
}

const detectAuthMode = (headerName: string | null): AuthMode => {
  if (!headerName) return "none";
  if (headerName === AUTH_HEADERS.authorization) return "authorization";
  if (headerName === AUTH_HEADERS["x-api-key"]) return "x-api-key";
  return "custom";
};

const toFormState = (webhook: Webhook | null): FormState => ({
  name: webhook?.name ?? "",
  url: webhook?.url ?? "",
  events: webhook?.events ?? [...WEBHOOK_EVENTS],
  authMode: detectAuthMode(webhook?.headerName ?? null),
  customHeader: webhook?.headerName ?? "",
  headerValue: "",
});

const resolveHeaderName = (form: FormState): string | null => {
  if (form.authMode === "none") return null;
  if (form.authMode === "custom") return form.customHeader.trim() || null;
  return AUTH_HEADERS[form.authMode];
};

const toggleEvent = (events: WebhookEvent[], event: WebhookEvent) =>
  events.includes(event)
    ? events.filter((item) => item !== event)
    : [...events, event];

interface WebhookDialogProps {
  webhook: Webhook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WebhookDialog = ({
  webhook,
  open,
  onOpenChange,
}: WebhookDialogProps) => {
  const [form, setForm] = useState<FormState>(toFormState(webhook));
  const saveWebhook = useSaveWebhook();
  useEffect(() => setForm(toFormState(webhook)), [webhook, open]);
  const update = (patch: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...patch }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await saveWebhook.mutateAsync({
        id: webhook?.id ?? null,
        input: {
          name: form.name,
          url: form.url,
          events: form.events,
          headerName: resolveHeaderName(form),
          enabled: webhook?.enabled ?? true,
        },
        headerValue: form.headerValue.trim() || null,
      });
      toast.success("Integração salva");
      onOpenChange(false);
    } catch (error) {
      toast.error(describeError(error));
    }
  };
  const canSave =
    form.name.trim() &&
    form.url.trim().startsWith("http") &&
    form.events.length;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>
              {webhook ? "Editar integração" : "Nova integração"}
            </DialogTitle>
            <DialogDescription>
              O FR Notes envia a nota em JSON (POST) para esta URL quando os
              eventos escolhidos acontecem.
            </DialogDescription>
          </DialogHeader>
          <SettingsField label="Nome" htmlFor="webhook-name">
            <Input
              id="webhook-name"
              value={form.name}
              placeholder="FR Hub, n8n, Make…"
              onChange={(event) => update({ name: event.target.value })}
            />
          </SettingsField>
          <SettingsField label="URL" htmlFor="webhook-url">
            <Input
              id="webhook-url"
              value={form.url}
              placeholder="https://seu-sistema.com/webhooks/fr-notes"
              onChange={(event) => update({ url: event.target.value })}
            />
          </SettingsField>
          <div className="flex flex-col gap-2">
            <span className="text-body-sm text-heading font-medium">
              Enviar quando
            </span>
            {WEBHOOK_EVENTS.map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-body-sm">
                  {WEBHOOK_EVENT_LABELS[item]}{" "}
                  <code className="text-caption text-muted-foreground">
                    {item}
                  </code>
                </span>
                <Switch
                  checked={form.events.includes(item)}
                  onCheckedChange={() =>
                    update({ events: toggleEvent(form.events, item) })
                  }
                  aria-label={WEBHOOK_EVENT_LABELS[item]}
                />
              </div>
            ))}
          </div>
          <SettingsField
            label="Autenticação no sistema de destino"
            htmlFor="webhook-auth"
            hint="A API key do outro sistema fica guardada no Keychain."
          >
            <SelectSetting
              id="webhook-auth"
              value={form.authMode}
              options={AUTH_OPTIONS}
              onChange={(authMode) => update({ authMode })}
            />
          </SettingsField>
          {form.authMode === "custom" && (
            <SettingsField label="Nome do cabeçalho" htmlFor="webhook-header">
              <Input
                id="webhook-header"
                value={form.customHeader}
                placeholder="X-Token"
                onChange={(event) =>
                  update({ customHeader: event.target.value })
                }
              />
            </SettingsField>
          )}
          {form.authMode !== "none" && (
            <SettingsField label="API key" htmlFor="webhook-key">
              <PasswordInput
                id="webhook-key"
                value={form.headerValue}
                placeholder={webhook ? "•••••••• (mantida)" : "Cole a chave"}
                onChange={(event) =>
                  update({ headerValue: event.target.value })
                }
              />
            </SettingsField>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSave || saveWebhook.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
