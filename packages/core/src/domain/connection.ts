import { z } from "zod";

export const CONNECTION_PROVIDERS = [
  "clickup",
  "linear",
  "notion",
  "slack",
] as const;

export const ConnectionProviderSchema = z.enum(CONNECTION_PROVIDERS);

export type ConnectionProvider = z.infer<typeof ConnectionProviderSchema>;

export const ConnectionSchema = z.object({
  id: z.string().min(1),
  provider: ConnectionProviderSchema,
  name: z.string(),
  config: z.record(z.string(), z.string()),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export type Connection = z.infer<typeof ConnectionSchema>;

export type ConnectionCapability = "task" | "note";

export interface ConnectionCatalogEntry {
  provider: ConnectionProvider;
  name: string;
  description: string;
  capabilities: ConnectionCapability[];
  tokenLabel: string;
  tokenHint: string;
}

export const CONNECTION_CATALOG: ConnectionCatalogEntry[] = [
  {
    provider: "clickup",
    name: "ClickUp",
    description: "Tarefas na lista que você escolher.",
    capabilities: ["task"],
    tokenLabel: "Token pessoal da API",
    tokenHint: "ClickUp → Settings → Apps → API Token (começa com pk_).",
  },
  {
    provider: "linear",
    name: "Linear",
    description: "Issues no time que você escolher.",
    capabilities: ["task"],
    tokenLabel: "Personal API key",
    tokenHint: "Linear → Settings → Security & access → Personal API keys.",
  },
  {
    provider: "notion",
    name: "Notion",
    description: "Notas como páginas num banco.",
    capabilities: ["note"],
    tokenLabel: "Token da integração interna",
    tokenHint:
      "notion.so/my-integrations → nova integração interna; depois compartilhe o banco com ela.",
  },
  {
    provider: "slack",
    name: "Slack",
    description: "Resumo e tarefas num canal.",
    capabilities: ["note", "task"],
    tokenLabel: "URL do Incoming Webhook",
    tokenHint:
      "api.slack.com/apps → seu app → Incoming Webhooks → copie a URL do canal.",
  },
];

export const findCatalogEntry = (
  provider: ConnectionProvider,
): ConnectionCatalogEntry =>
  CONNECTION_CATALOG.find((entry) => entry.provider === provider) ??
  (CONNECTION_CATALOG[0] as ConnectionCatalogEntry);

export const describeProviderName = (provider: string): string => {
  const parsed = ConnectionProviderSchema.safeParse(provider);
  return parsed.success ? findCatalogEntry(parsed.data).name : provider;
};
