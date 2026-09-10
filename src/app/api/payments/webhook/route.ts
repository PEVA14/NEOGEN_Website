import { activeProvider, paymentAvailable } from "@/payments";

/**
 * PAYMENT WEBHOOK — one endpoint, provider-independent.
 *
 * Every processor calls one URL, and the ACTIVE ADAPTER decides what the
 * payload means. That is the whole reason the adapter interface exists: adding
 * Mercado Pago or Clip adds no route, no branch here, and no provider status
 * string anywhere outside `src/payments/adapters`.
 *
 * TODAY IT ACCEPTS NOTHING. `none` is the only registered adapter, it is never
 * configured, and `paymentAvailable()` is false — so this returns 503 and
 * parses no bodies. It exists now so the shape is settled and reviewed before
 * a processor is chosen, not to handle traffic.
 *
 * WHY 200 FOR AN UNRECOGNISED EVENT. Processors retry non-2xx responses, often
 * aggressively, and they send event types nobody subscribed to. Acknowledging
 * an event we do not act on is correct; returning an error would earn an
 * escalating retry storm for a message that was never ours to handle.
 *
 * SIGNATURE VERIFICATION BELONGS TO THE ADAPTER. It is the only party that
 * knows the provider's scheme and holds its secret, so `parseWebhook` receives
 * the raw headers and is responsible for rejecting anything unsigned. This
 * handler must never trust a payload it has not been handed back.
 */
export async function POST(request: Request): Promise<Response> {
  if (!paymentAvailable()) {
    /*
     * No processor. Deliberately 503 rather than 404: a misconfigured
     * deployment that starts receiving real callbacks should look broken to
     * the provider — and therefore be retried and noticed — instead of
     * silently swallowing payments as "no such endpoint".
     */
    return Response.json(
      { error: "payments_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const provider = activeProvider();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const event = await provider.parseWebhook(payload, request.headers);

  /* Unrecognised, or failed the adapter's signature check. Acknowledged. */
  if (!event) return Response.json({ received: true }, { status: 200 });

  /*
   * TODO(phase-10): persist the transition.
   *
   * `transition()` in `domain/order` already refuses illegal moves — a
   * redelivered authorisation cannot un-pay a paid order — but there is no
   * order store to load from or write to yet. That arrives with checkout,
   * along with idempotency keyed on the provider's event id.
   */
  return Response.json({ received: true, state: event.state }, { status: 200 });
}

/** Providers probe with GET during setup; answer without implying readiness. */
export async function GET(): Promise<Response> {
  return Response.json(
    { ok: true, payments: paymentAvailable() ? "enabled" : "disabled" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
