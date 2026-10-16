import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * SKYDROPX WEBHOOK SIGNATURE — "Autenticación HMAC (recomendada)", from the
 * API reference's Webhooks section (2026-10-15):
 *
 *   Authorization: HMAC <signature>
 *   signature = lowercase hex of HMAC-SHA512(secret, raw request body)
 *
 * The header's NAME is configurable at Skydropx (3–25 characters, no
 * spaces); its value always carries the `HMAC ` scheme. The body is hashed
 * exactly as received — never re-serialised — and compared in constant time.
 * The less secure bearer-token mode is deliberately not accepted.
 */
export function verifySkydropxSignature(input: {
  secret: string;
  header: string | null;
  body: string;
}): boolean {
  const match = /^HMAC\s+([0-9a-f]{128})$/i.exec(input.header?.trim() ?? "");
  if (!match || !input.secret) return false;
  const expected = createHmac("sha512", input.secret).update(input.body, "utf8").digest("hex");
  const given = match[1].toLowerCase();
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/** For tests and the fake provider: sign a body as Skydropx would. */
export function signSkydropxBody(secret: string, body: string): string {
  return `HMAC ${createHmac("sha512", secret).update(body, "utf8").digest("hex")}`;
}
