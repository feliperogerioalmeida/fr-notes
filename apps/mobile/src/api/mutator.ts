import { API_URL } from "@/config/env";
import { authClient } from "@/lib/auth-client";

const NO_CONTENT_STATUS = 204;

export class ApiError extends Error {
  status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.status = status;
  }
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
    };
    return payload.message ?? payload.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
};

const readBody = async (response: Response): Promise<unknown> => {
  if (response.status === NO_CONTENT_STATUS) return undefined;

  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

export const apiFetch = async <T>(
  url: string,
  init: RequestInit,
): Promise<T> => {
  const cookies = authClient.getCookie();

  const response = await fetch(`${API_URL}${url}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      message: await readErrorMessage(response),
    });
  }

  return {
    data: await readBody(response),
    status: response.status,
    headers: response.headers,
  } as T;
};
