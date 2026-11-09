import { createHmac, timingSafeEqual } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createWebhookSecret, signWebhookBody } from "./webhook-payload.js";

const MAX_AGE_SECONDS = 300;
const PYTHON_HMAC_VECTOR =
  "sha256=7bde4c9df90fc5976f960f641ce32df08141ec9616cc66d79c1d820ec0438f93";

const isValidFrNotesRequest = (
  rawBody: string,
  headers: Record<string, string | undefined>,
  secret: string,
): boolean => {
  const timestamp = headers["x-fr-notes-timestamp"] ?? "";
  const received = headers["x-fr-notes-signature"] ?? "";
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!timestamp || Number.isNaN(age) || age > MAX_AGE_SECONDS) return false;
  const expected = `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
  return (
    expected.length === received.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  );
};

describe("documented webhook verification", () => {
  it("accepts app signatures and rejects tampering, wrong secrets and replays", async () => {
    const secret = createWebhookSecret();
    const body = JSON.stringify({ event: "note.enhanced", title: "Ação ✓" });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await signWebhookBody({ secret, timestamp, body });
    const headers = {
      "x-fr-notes-timestamp": timestamp,
      "x-fr-notes-signature": signature,
    };

    expect(isValidFrNotesRequest(body, headers, secret)).toBe(true);
    expect(
      isValidFrNotesRequest(body.replace("Ação", "Acao"), headers, secret),
    ).toBe(false);
    expect(isValidFrNotesRequest(body, headers, createWebhookSecret())).toBe(
      false,
    );
    expect(
      isValidFrNotesRequest(
        body,
        { ...headers, "x-fr-notes-timestamp": "1" },
        secret,
      ),
    ).toBe(false);
  });

  it("matches the signature computed by the documented Python verifier", async () => {
    const signature = await signWebhookBody({
      secret: `whsec_${"ab".repeat(32)}`,
      timestamp: "1762693200",
      body: '{"event":"note.completed","title":"Reunião ✓"}',
    });

    expect(signature).toBe(PYTHON_HMAC_VECTOR);
  });
});
