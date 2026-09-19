import { activeProvider, paymentAvailable } from "@/payments";
import { settleFromProvider } from "@/server/payments";

/**
 * PAYMENT WEBHOOK — one endpoint, provider-independent, idempotent.
 *
 * Configure this URL in the provider's dashboard
 * (`https://<domain>/api/payments/webhook`; for Mercado Pago, the "Order
 * (Mercado Pago)" topic). The ACTIVE ADAPTER decides whether a delivery is
 * authentic; nothing here knows a provider's scheme.
 *
 * THE PIPELINE, in order, and why each step is where it is:
 *
 *   1. SIZE AND AVAILABILITY. No processor configured → 503, so a
 *      misconfigured deployment receiving real callbacks looks broken to the
 *      provider (and is retried and noticed) instead of swallowing them.
 *
 *   2. AUTHENTICATE before reading anything. The adapter verifies the
 *      signature against the raw request; a failure is 401 and nothing else
 *      about the request is used.
 *
 *   3. NEVER TRUST THE BODY FOR STATE. A signature proves who sent the
 *      notification and which payment it concerns — for Mercado Pago it does
 *      not cover the body at all. So the verified reference is used to ASK the
 *      provider for the payment's state (`settleFromProvider`), and that
 *      answer is what is applied.
 *
 *   4. DEDUPLICATE on the provider fact (payment + state), globally, before
 *      the order is loaded. Redeliveries — which are routine — cost one
 *      status fetch and one indexed lookup.
 *
 *   5. ORDERING is not handled by timestamps. A late or replayed state is an
 *      illegal transition against the current one, and the table refuses it;
 *      `paid` cannot regress because no transition leads back from it.
 *
 * STATUS CODES. 200 for anything handled or deliberately ignored — providers
 * retry non-2xx for days, and an event nobody subscribed to must not earn a
 * retry storm. 401 for an unauthenticated delivery, 400 for a malformed one,
 * 503 only when retrying could help (provider unreachable, write conflict).
 */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  if (!paymentAvailable()) return json({ error: "payments_unavailable" }, 503);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);

  const verdict = await activeProvider().verifyWebhook({
    url: new URL(request.url),
    headers: request.headers,
    body,
  });

  switch (verdict.kind) {
    case "unauthenticated":
      return json({ error: "invalid_signature" }, 401);
    case "malformed":
      return json({ error: "invalid_payload" }, 400);
    case "ignored":
      return json({ received: true, outcome: "ignored" }, 200);
    case "verified": {
      const result = await settleFromProvider(verdict.providerRef);
      return result.status === 200
        ? json({ received: true, outcome: result.outcome, state: result.state ?? null }, 200)
        : json({ error: result.outcome }, 503);
    }
  }
}

/** Providers probe with GET during setup; answer without implying readiness details. */
export async function GET(): Promise<Response> {
  return json({ ok: true, payments: paymentAvailable() ? "enabled" : "disabled" }, 200);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
