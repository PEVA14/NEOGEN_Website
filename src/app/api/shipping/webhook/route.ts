import { signal } from "@/server/observe";
import { findByShipment } from "@/server/shipping/booking";
import { applyTrackingEvent, refreshOrderShipment } from "@/server/shipping/tracking";
import { activeShippingProvider } from "@/shipping";

/**
 * SHIPPING WEBHOOK — Skydropx parcel events (D1).
 *
 * Configure in Skydropx: Conexiones > Webhooks, URL
 * `https://<domain>/api/shipping/webhook`, HMAC authentication, the
 * "Envíos" (shipment/package) events. The adapter verifies the HMAC-SHA512
 * over the exact raw body before anything is read; a failure is 401 and
 * nothing else about the request is used.
 *
 * STATUS CODES. 200 for anything handled or deliberately ignored (an order
 * or quotation event, a duplicate, an out-of-order fact, a shipment NEOGEN
 * has not recorded yet) — a provider retrying those would change nothing.
 * 401 unauthenticated, 400 malformed, 503 when there is no provider here or
 * the write failed (a retry may help).
 */
const MAX_BODY_BYTES = 64 * 1024;

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  const provider = activeShippingProvider();
  if (!provider.isConfigured()) return json({ error: "shipping_unavailable" }, 503);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

  const verdict = await provider.verifyWebhook({ headers: request.headers, body });
  switch (verdict.kind) {
    case "unauthenticated":
      signal("shipping.webhook_unauthenticated", "warn");
      return json({ error: "invalid_signature" }, 401);
    case "malformed":
      return json({ error: "invalid_payload" }, 400);
    case "ignored":
      return json({ received: true, outcome: "ignored" }, 200);
    case "refresh": {
      const order = await findByShipment(provider.id, verdict.providerRef);
      if (!order) return json({ received: true, outcome: "unknown_shipment" }, 200);
      const outcome = await refreshOrderShipment(order.id);
      return outcome === "unreachable"
        ? json({ error: "provider_unreachable" }, 503)
        : json({ received: true, outcome }, 200);
    }
    case "verified": {
      const outcome = await applyTrackingEvent(provider.id, verdict.event);
      return outcome === "failed"
        ? json({ error: "not_persisted" }, 503)
        : json({ received: true, outcome }, 200);
    }
  }
}
