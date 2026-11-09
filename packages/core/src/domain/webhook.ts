import { z } from "zod";

export const WEBHOOK_EVENTS = ["note.completed", "note.enhanced"] as const;

export const WebhookEventSchema = z.enum(WEBHOOK_EVENTS);

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  "note.completed": "Gravação finalizada",
  "note.enhanced": "Notas da IA geradas",
};

export const WebhookSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.url(),
  events: z.array(WebhookEventSchema).min(1),
  headerName: z.string().nullable(),
  enabled: z.boolean(),
  lastDeliveryAt: z.string().nullable(),
  lastStatus: z.number().int().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Webhook = z.infer<typeof WebhookSchema>;

export const WebhookInputSchema = WebhookSchema.pick({
  name: true,
  url: true,
  events: true,
  headerName: true,
  enabled: true,
});

export type WebhookInput = z.infer<typeof WebhookInputSchema>;

export interface WebhookDeliveryResult {
  status: number | null;
  error: string | null;
}
