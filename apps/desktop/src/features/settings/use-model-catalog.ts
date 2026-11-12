import { useQuery } from "@tanstack/react-query";
import {
  type LlmProvider,
  parseCompatibleCatalog,
  parseGatewayCatalog,
} from "@workspace/core";

import { httpFetch } from "@/lib/http-client.js";
import { normalizeBaseUrl } from "@/lib/llm.js";
import { LLM_SECRET_KEYS, readSecret } from "@/lib/native.js";

import { useSettings } from "./use-settings.js";

const GATEWAY_CATALOG_URL = "https://ai-gateway.vercel.sh/v1/models";
const CATALOG_STALE_MS = 60 * 60_000;

const readJson = async (url: string, headers: Record<string, string>) => {
  const response = await httpFetch(url, { method: "GET", headers });
  if (!response.ok)
    throw new Error(`Não consegui listar os modelos (${response.status}).`);
  return response.json();
};

const fetchGatewayCatalog = async () =>
  parseGatewayCatalog(await readJson(GATEWAY_CATALOG_URL, {}));

const fetchCompatibleCatalog = async (baseUrl: string) => {
  const key = await readSecret(LLM_SECRET_KEYS["openai-compatible"]);
  const headers: Record<string, string> = key
    ? { Authorization: `Bearer ${key}` }
    : {};
  return parseCompatibleCatalog(
    await readJson(`${normalizeBaseUrl(baseUrl)}/models`, headers),
  );
};

export const useModelCatalog = (provider: LlmProvider) => {
  const settings = useSettings();
  const baseUrl = provider === "gateway" ? "" : settings.llmBaseUrl.trim();
  return useQuery({
    queryKey: ["model-catalog", provider, baseUrl],
    queryFn: () =>
      provider === "gateway"
        ? fetchGatewayCatalog()
        : fetchCompatibleCatalog(baseUrl),
    enabled: provider === "gateway" || Boolean(baseUrl),
    staleTime: CATALOG_STALE_MS,
    retry: 1,
  });
};
