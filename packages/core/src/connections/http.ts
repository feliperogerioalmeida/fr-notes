export interface HttpRequestInit {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type HttpFetch = (
  url: string,
  init: HttpRequestInit,
) => Promise<HttpResponse>;

export class ConnectionRequestError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    detail: string,
  ) {
    super(`${provider} ${status}: ${detail}`.slice(0, 300));
  }
}

interface RequestJsonInput {
  fetch: HttpFetch;
  provider: string;
  url: string;
  init: HttpRequestInit;
}

export const requestJson = async <Body>({
  fetch,
  provider,
  url,
  init,
}: RequestJsonInput): Promise<Body> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new ConnectionRequestError(
      provider,
      response.status,
      await response.text(),
    );
  }
  return (await response.json()) as Body;
};

export interface SentResult {
  externalId: string | null;
  url: string | null;
}
