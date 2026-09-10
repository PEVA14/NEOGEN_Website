import { applyPaymentEvent, mutate } from "@/domain/order";
import { activeProvider, paymentAvailable } from "@/payments";
import { orderRepository } from "@/server/persistence";

/**
 * PAYMENT WEBHOOK — one endpoint, provider-independent, idempotent.
 *
 * Every processor calls one URL and the ACTIVE ADAPTER decides what the
 * payload means. Adding Mercado Pago or Clip adds no route, no branch here,
 * and no provider status string anywhere outside `src/payments/adapters`.
 *
 * TODAY IT ACCEPTS NOTHING. `none` is the only registered adapter, it never
 * configures, and `paymentAvailable()` is false — so this returns 503 and
 * parses no bodies. The pipeline below is nevertheless complete, because
 * every property it enforces is one that cannot be added safely later:
 *
 *   SIGNATURE VERIFICATION belongs to the adapter — it is the only party that
 *   knows the provider's scheme and holds its secret. `parseWebhook` receives
 *   the raw headers and returns null for anything unsigned. This handler must
 *   never trust a payload it has not been handed back, which is why the raw
 *   body is not read for anything except being passed on.
 *
 *   DEDUPLICATION is keyed on the provider's own event id, checked globally
 *   before the order is even loaded, so a redelivery is cheap to reject and a
 *   MISROUTED redelivery is rejected too.
 *
 *   ORDERING is not handled by comparing timestamps — provider clocks are not
 *   ours to trust. A late event is simply an illegal transition against
 *   current state, and the transition table refuses it. That is why `paid`
 *   cannot regress: there is no code path that special-cases it.
 *
 *   NOTHING HERE CAN SET `paid` BY ITSELF. The state comes from the adapter's
 *   translation of a signed payload, and `applyPaymentEvent` is the only
 *   writer. No client request reaches this logic — see the actions module,
 *   where nothing accepts a state at all.
 *
 * WHY 200 FOR AN EVENT WE DID NOT ACT ON. Processors retry non-2xx responses,
 * often for days, and they send event types nobody subscribed to.
 * Acknowledging an event we deliberately ignored is correct; returning an
 * error would earn an escalating retry storm for a message that was never
 * ours to handle. The response body says what happened, for the provider's
 * own dashboard and for ours later.
 */
export async function POST(request: Request): Promise<Response> {
  if (!paymentAvailable()) {
    /*
     * No processor. Deliberately 503 rather than 404: a misconfigured
     * deployment that starts receiving real callbacks should look broken to
     * the provider — and therefore be retried and noticed — instead of
     * silently swallowing payments as "no such endpoint".
     */
    return json({ error: "payments_unavailable" }, 503);
  }

  const provider = activeProvider();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }

  const event = await provider.parseWebhook(payload, request.headers);

  /* Unrecognised, or failed the adapter's signature check. Acknowledged. */
  if (!event) return json({ received: true, outcome: "ignored" }, 200);

  const repository = orderRepository();

  /*
   * DEDUPE FIRST, before loading anything. A provider retrying a delivery it
   * already got a 200 for is the common case, not the exception.
   */
  if (await repository.hasProviderEvent(event.eventId)) {
    return json({ received: true, outcome: "duplicate" }, 200);
  }

  const order = await repository.findByProviderRef(event.providerRef);
  if (!order) {
    /*
     * A payment we have no order for. Acknowledged, NOT retried: if the
     * reference is unknown, sending it again will not make it known, and a
     * 4xx here would have a provider hammering an endpoint over a payment
     * that was never ours.
     */
    return json({ received: true, outcome: "unknown_payment" }, 200);
  }

  let outcome = "unchanged";
  const result = await mutate(repository, order.id, (current) => {
    const applied = applyPaymentEvent(current, {
      providerEventId: event.eventId,
      provider: provider.id,
      providerRef: event.providerRef,
      state: event.state,
      receivedAt: new Date().toISOString(),
    });
    outcome = applied.outcome;
    /* `duplicate` returns the order untouched — no write, so `mutate` short-
       circuits rather than bumping a version for nothing. */
    return applied.outcome === "duplicate" ? null : applied.order;
  });

  if (!result.ok) {
    /*
     * Persistence failed — a version conflict that outlived its retries, or a
     * vanished order. This IS worth a retry, so it is the one case that
     * answers non-2xx.
     */
    return json({ error: "not_persisted", reason: result.reason }, 503);
  }

  return json({ received: true, outcome, state: result.order.state }, 200);
}

/** Providers probe with GET during setup; answer without implying readiness. */
export async function GET(): Promise<Response> {
  return json({ ok: true, payments: paymentAvailable() ? "enabled" : "disabled" }, 200);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
