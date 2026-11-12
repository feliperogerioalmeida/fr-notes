import { z } from "zod";

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number | null;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  reasons: boolean;
  fast: boolean;
}

const TOKENS_PER_MILLION = 1_000_000;
const LANGUAGE_TYPE = "language";

const GatewayModelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  owned_by: z.string().optional(),
  type: z.string().optional(),
  context_window: z.number().nullable().optional(),
  deprecated_at: z.unknown().optional(),
  tags: z.array(z.string()).nullable().optional(),
  pricing: z
    .object({
      input: z.string().optional(),
      output: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const ModelListSchema = z.object({
  data: z.array(z.unknown()),
});

const CompatibleModelSchema = z.object({
  id: z.string(),
  owned_by: z.string().optional(),
});

const perMillion = (perToken: string | undefined) => {
  const value = Number(perToken);
  if (!perToken || Number.isNaN(value)) return null;
  return value * TOKENS_PER_MILLION;
};

const providerOf = (id: string, ownedBy: string | undefined) =>
  ownedBy ?? id.split("/")[0] ?? "";

const parseEach = <Item>(raw: unknown, schema: z.ZodType<Item>): Item[] =>
  ModelListSchema.parse(raw).data.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });

const byProviderThenName = (first: CatalogModel, second: CatalogModel) =>
  first.provider.localeCompare(second.provider) ||
  first.name.localeCompare(second.name);

export const parseGatewayCatalog = (raw: unknown): CatalogModel[] =>
  parseEach(raw, GatewayModelSchema)
    .filter((model) => model.type === LANGUAGE_TYPE && !model.deprecated_at)
    .map((model) => {
      const tags = model.tags ?? [];
      return {
        id: model.id,
        name: model.name ?? model.id,
        provider: providerOf(model.id, model.owned_by),
        contextWindow: model.context_window ?? null,
        inputPerMillion: perMillion(model.pricing?.input),
        outputPerMillion: perMillion(model.pricing?.output),
        reasons: tags.includes("reasoning"),
        fast: tags.includes("fast"),
      };
    })
    .sort(byProviderThenName);

export const parseCompatibleCatalog = (raw: unknown): CatalogModel[] =>
  parseEach(raw, CompatibleModelSchema)
    .map((model) => ({
      id: model.id,
      name: model.id,
      provider: providerOf(model.id, model.owned_by),
      contextWindow: null,
      inputPerMillion: null,
      outputPerMillion: null,
      reasons: false,
      fast: false,
    }))
    .sort(byProviderThenName);

const THOUSAND = 1_000;
const MILLION = 1_000_000;

const compactTokens = (tokens: number) => {
  if (tokens >= MILLION) return `${Number((tokens / MILLION).toFixed(1))}M`;
  if (tokens >= THOUSAND) return `${Math.round(tokens / THOUSAND)}k`;
  return String(tokens);
};

const PRICE = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatContextWindow = (tokens: number | null): string | null =>
  tokens ? `${compactTokens(tokens)} tokens` : null;

export const formatModelPrice = (model: CatalogModel): string | null => {
  if (model.inputPerMillion === null || model.outputPerMillion === null) {
    return null;
  }
  return `US$ ${PRICE.format(model.inputPerMillion)} / ${PRICE.format(model.outputPerMillion)} por 1M tokens`;
};
