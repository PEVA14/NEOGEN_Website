import "server-only";

import {
  answerAttempt,
  beginAttempt,
  mutate,
  openAttempt,
  recoverStalledAttempt,
} from "@/domain/order";
import { activeProvider, paymentAvailable, providerById } from "@/payments";
import { reconcileSnapshot } from "@/payments/reconcile";
import { notifyOrderPlaced } from "@/server/notifications";
import { orderRepository } from "@/server/persistence";

import type { Order, OrderRepository } from "@/domain/order";
import type {
  DeclineReason,
  PaymentProvider,
  PaymentSnapshot,
  TokenizedInstrument,
} from "@/payments";

/**
 * THE PAYMENT SERVICE — where the order domain meets the active provider.
 *
 * Three entry points, one rule: an order's payment state changes only through
 * `reconcileSnapshot`, fed by an answer NEOGEN obtained from the provider with
 * its own secret credentials. The browser can START a payment; it can never
 * report one.
 *
 *   submitPayment     the customer pressed Pay (server action)
 *   refreshPayment    a page shows an order whose payment is in flight
 *   settleFromProvider  a verified webhook named a payment (route handler)
 */

export type SubmitOutcome =
  | { kind: "paid" | "processing" | "pending"; orderId: string }
  | { kind: "declined"; orderId: string; reason: DeclineReason }
  | {
      kind: "error";
      code: "unavailable" | "not_found" | "invalid_state" | "provider_error";
    };

function outcomeFor(order: Order, reason: DeclineReason | null): SubmitOutcome {
  switch (order.state) {
    case "paid":
      return { kind: "paid", orderId: order.id };
    case "pending_payment":
      return { kind: "pending", orderId: order.id };
    case "payment_processing":
      return { kind: "processing", orderId: order.id };
    case "payment_failed":
      return { kind: "declined", orderId: order.id, reason: reason ?? "generic" };
    default:
      return { kind: "error", code: "invalid_state" };
  }
}

/**
 * Apply a snapshot under the order's optimistic lock, then run the side effects
 * a first transition to `paid` owes (the order-placed messages). Idempotent: a
 * snapshot already applied is a duplicate and writes nothing.
 */
async function applySnapshot(
  repository: OrderRepository,
  orderId: string,
  snapshot: PaymentSnapshot,
  provider: PaymentProvider,
  extra?: (order: Order) => Order,
): Promise<{ ok: true; order: Order; outcome: string } | { ok: false; reason: string }> {
  let outcome = "unchanged";
  let becamePaid = false;
  const result = await mutate(repository, orderId, (current) => {
    const base = extra ? extra(current) : current;
    const applied = reconcileSnapshot(base, snapshot, provider.id, new Date().toISOString());
    outcome = applied.outcome;
    becamePaid =
      applied.outcome === "applied" && current.state !== "paid" && applied.order.state === "paid";
    /* Nothing changed at all → no write. `extra` alone still counts as a change. */
    if (applied.order === current) return null;
    return applied.order;
  });
  if (!result.ok) return result;
  if (becamePaid) await notifyOrderPlaced(result.order, result.order.locale);
  return { ok: true, order: result.order, outcome };
}

/**
 * THE CUSTOMER PAYS.
 *
 * 1. CLAIM the attempt under the order's version lock (`beginAttempt`). A
 *    second submission — double click, second tab, replayed request — finds
 *    the claim taken and is told the order's current state instead of
 *    charging again.
 * 2. CHARGE the ORDER'S total through the provider, under the attempt's
 *    stable idempotency key.
 * 3. RECORD the answer, and apply the provider's reported state through the
 *    same reconciliation a webhook uses.
 *
 * The caller has already checked that this browser owns the order.
 */
export async function submitPayment(
  orderId: string,
  instrument: TokenizedInstrument,
): Promise<SubmitOutcome> {
  if (!paymentAvailable()) return { kind: "error", code: "unavailable" };
  const provider = activeProvider();
  const repository = orderRepository();

  const at = new Date().toISOString();
  const claimed = await mutate(repository, orderId, (current) =>
    beginAttempt(current, { provider: provider.id, at }),
  );
  if (!claimed.ok) {
    return { kind: "error", code: claimed.reason === "not_found" ? "not_found" : "provider_error" };
  }
  if (!claimed.changed) {
    /* Not payable now — already paid, in flight, or claimed by a concurrent
       submission. Report where it stands; never charge. */
    return outcomeFor(claimed.order, null);
  }

  const attempt = openAttempt(claimed.order);
  if (!attempt?.idempotencyKey) return { kind: "error", code: "provider_error" };

  const result = await provider.charge(claimed.order, instrument, attempt.idempotencyKey);
  const answeredAt = new Date().toISOString();

  if (result.kind === "answered") {
    const applied = await applySnapshot(repository, orderId, result.snapshot, provider, (current) =>
      answerAttempt(current, {
        at: answeredAt,
        outcome: "answered",
        providerRef: result.snapshot.providerRef,
      }),
    );
    if (!applied.ok) return { kind: "error", code: "provider_error" };
    return outcomeFor(applied.order, result.snapshot.detail);
  }

  const saved = await mutate(repository, orderId, (current) =>
    answerAttempt(current, {
      at: answeredAt,
      outcome: result.kind,
      errorCode: result.error.code,
      detail: result.kind === "refused" ? (result.detail ?? "generic") : "unanswered",
    }),
  );
  if (!saved.ok) return { kind: "error", code: "provider_error" };

  if (result.kind === "refused" && result.error.code !== "declined") {
    /* The provider refused for a reason that is not the card's — bad
       credentials, rate limiting. Nothing was charged; the customer may retry. */
    return { kind: "error", code: "provider_error" };
  }
  return outcomeFor(saved.order, result.kind === "refused" ? (result.detail ?? "generic") : null);
}

/**
 * Bring an in-flight order up to date from the provider.
 *
 * Called when a page renders an order whose payment is pending or processing,
 * so a customer reloading the confirmation sees the real state even when no
 * webhook has arrived (a local machine with no public URL, a delayed
 * delivery). Throttled per order, and never fatal: on any failure the stored
 * order is returned as it was.
 */
const REFRESH_KEY = "__neogen_payment_refresh__";
const REFRESH_EVERY_MS = 4_000;

export async function refreshPayment(order: Order): Promise<Order> {
  if (order.state !== "payment_processing" && order.state !== "pending_payment") return order;

  const repository = orderRepository();

  /* An attempt that never produced a provider reference is released after a
     while, so the customer is not stuck (see `recoverStalledAttempt`). */
  if (!order.providerRef) {
    const now = new Date().toISOString();
    if (!recoverStalledAttempt(order, now)) return order;
    const released = await mutate(repository, order.id, (current) =>
      recoverStalledAttempt(current, now),
    );
    return released.ok ? released.order : order;
  }

  const globals = globalThis as typeof globalThis & { [REFRESH_KEY]?: Map<string, number> };
  const seen = (globals[REFRESH_KEY] ??= new Map());
  const last = seen.get(order.id) ?? 0;
  if (Date.now() - last < REFRESH_EVERY_MS) return order;
  seen.set(order.id, Date.now());

  const provider = providerById(order.provider);
  if (!provider) return order;
  try {
    const status = await provider.fetchStatus(order.providerRef);
    if (!status.ok) return order;
    const applied = await applySnapshot(repository, order.id, status.snapshot, provider);
    return applied.ok ? applied.order : order;
  } catch {
    return order;
  }
}

/**
 * A VERIFIED NOTIFICATION NAMED A PAYMENT — fetch its state and apply it.
 *
 * The webhook body is never read for state: the adapter authenticated the
 * delivery and extracted the payment reference from the signed part, and the
 * state comes from asking the provider directly.
 *
 * The order is found by the payment reference, or — for a payment whose
 * reference NEOGEN never recorded (a charge whose answer was lost) — by the
 * external reference the provider echoes back, which is NEOGEN's order id.
 */
export type NotificationOutcome =
  { status: 200; outcome: string; state?: string } | { status: 503; outcome: string };

export async function settleFromProvider(providerRef: string): Promise<NotificationOutcome> {
  const provider = activeProvider();
  const repository = orderRepository();

  const status = await provider.fetchStatus(providerRef);
  if (!status.ok) {
    /* Not found at the provider: nothing will change on a retry. An outage
       is worth a retry, so it is the one case that answers non-2xx. */
    return status.reason === "not_found"
      ? { status: 200, outcome: "unknown_payment" }
      : { status: 503, outcome: "provider_unreachable" };
  }

  const snapshot = status.snapshot;
  if (await repository.hasProviderEvent(snapshot.eventId)) {
    return { status: 200, outcome: "duplicate" };
  }

  const order =
    (await repository.findByProviderRef(snapshot.providerRef)) ??
    (snapshot.externalReference ? await repository.get(snapshot.externalReference) : null);
  if (!order) return { status: 200, outcome: "unknown_payment" };

  const applied = await applySnapshot(repository, order.id, snapshot, provider);
  if (!applied.ok) return { status: 503, outcome: "not_persisted" };
  return { status: 200, outcome: applied.outcome, state: applied.order.state };
}
