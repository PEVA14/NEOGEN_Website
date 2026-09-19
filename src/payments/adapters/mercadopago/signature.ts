import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WEBHOOK SIGNATURE VERIFICATION — Mercado Pago's documented scheme, exactly.
 *
 * Source: "Configure notifications → Validate the origin of the notification"
 * (developers/en/docs/checkout-api-orders/notifications), read 2026-09-19.
 *
 *   x-signature: ts=<ms>,v1=<hex>
 *   manifest:    id:<data.id from the QUERY, lowercased>;request-id:<x-request-id>;ts:<ts>;
 *   v1 = hex(HMAC-SHA256(secret, manifest))
 *
 * A part whose value is absent (`data.id`, `x-request-id`) is omitted from
 * the manifest, as the documentation specifies.
 *
 * WHAT THE SIGNATURE COVERS — and what it does not. It binds the delivery to
 * a payment id, a request id and a time. It does NOT cover the JSON body. So
 * the body's `status` is never read for state: a verified delivery only tells
 * NEOGEN which order to go and ask Mercado Pago about (see the webhook route).
 *
 * NO TIMESTAMP WINDOW. The documentation offers one as optional. It is left
 * out deliberately: Mercado Pago retries for days, and whether a retry carries
 * a fresh `ts` is not documented — a window could reject genuine redeliveries.
 * Replaying a genuine notification is harmless here, because it only causes a
 * fresh status fetch; it cannot assert a state.
 */
export function manifestFor(parts: {
  dataId: string | null;
  requestId: string | null;
  ts: string;
}): string {
  const out: string[] = [];
  if (parts.dataId) out.push(`id:${parts.dataId.toLowerCase()}`);
  if (parts.requestId) out.push(`request-id:${parts.requestId}`);
  out.push(`ts:${parts.ts}`);
  return `${out.join(";")};`;
}

export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!/^\d{1,20}$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) return null;
  return { ts, v1: v1.toLowerCase() };
}

export function sign(secret: string, manifest: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

/** Constant-time comparison of the header's signature against our own. */
export function verifySignature(input: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) return false;
  const expected = sign(
    input.secret,
    manifestFor({ dataId: input.dataId, requestId: input.requestId, ts: parsed.ts }),
  );
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
