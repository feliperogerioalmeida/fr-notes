import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { HttpFetch } from "@workspace/core";

export const httpFetch: HttpFetch = async (url, init) => {
  const response = await tauriFetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
    text: () => response.text(),
  };
};
