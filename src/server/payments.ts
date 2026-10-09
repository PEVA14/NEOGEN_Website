import "server-only";

import {
  answerAttempt,
  beginAttempt,
  followPayment,
  markRefundFailed,
  markRefundSubmitted,
  mutate,
  openAttempt,
  recoverStalledAttempt,
} from "@/domain/order";
import { trackServer } from "@/analytics/server";
import { activeProvider, paymentAvailable, providerById } from "@/payments";
import { reconcileSnapshot } from "@/payments/reconcile";
import { signal } from "@/server/observe";
import { afterOrderChange, holdForPayment } from "@/server/orders";
import { orderRepository } from "@/server/persistence";

import type { Actor } from "@/domain/order";

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
 * Apply a snapshot under the order's optimistic lock, carry the payment change
 * over to the other axes (`followPayment`: queue a paid order, hold a disputed
 * one, confirm a refund), then bring stock and messages into line
 * (`afterOrderChange`). Idempotent: a snapshot already applied is a duplicate
 * and writes nothing.
 *
 * The payment transition itself is untouched: `reconcileSnapshot` decides it
 * exactly as before, and `followPayment` only runs when it `applied`.
 */
async function applySnapshot(
  repository: OrderRepository,
  orderId: string,
  snapshot: PaymentSnapshot,
  provider: PaymentProvider,
  extra?: (order: Order) => Order,
): Promise<{ ok: true; order: Order; outcome: string } | { ok: false; reason: string }> {
  let outcome = "unchanged";
  let newlyPaid = false;
  const result = await mutate(repository, orderId, (current) => {
    const base = extra ? extra(current) : current;
    const at = new Date().toISOString();
    const applied = reconcileSnapshot(base, snapshot, provider.id, at);
    outcome = applied.outcome;
    /* Nothing changed at all → no write. `extra` alone still counts as a change. */
    if (applied.order === current) return null;
    const next =
      applied.outcome === "applied" ? followPayment(applied.order, base.state, at) : applied.order;
    /* The FIRST time the provider confirms payment — once per order, ever. */
    newlyPaid = !current.milestones.paid && Boolean(next.milestones.paid);
    return next;
  });
  if (!result.ok) {
    signal("payment.not_persisted", "error", { orderId, reason: result.reason });
    return result;
  }
  if (outcome === "rejected" || outcome === "mismatched_ref") {
    signal("payment.webhook_rejected", "warn", { orderId, outcome });
  }
  const order = await afterOrderChange(result.order);
  if (newlyPaid) {
    trackServer({
      name: "purchase_completed",
      items: order.lines.map((l) => ({
        sku: l.variantId,
        quantity: l.quantity,
        price: l.unitPrice.amount,
      })),
      value: order.totals.total.amount,
    });
  }
  return { ok: true, order, outcome };
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

  /*
   * HOLD THE STOCK before any money moves. Tracked SKUs are reserved, all or
   * none; if a unit is not there, the attempt is closed as refused and the
   * provider is never called — nothing can be charged for goods NEOGEN does
   * not have. Untracked SKUs are never limited (see `domain/inventory`). If
   * the store cannot be asked at all, the payment fails closed.
   */
  trackServer({ name: "payment_attempted", value: claimed.order.totals.total.amount });
  const held = await holdForPayment(claimed.order);
  if (held !== "ok") {
    const closed = await mutate(repository, orderId, (current) =>
      answerAttempt(current, {
        at: new Date().toISOString(),
        outcome: "refused",
        errorCode: "unavailable",
        detail: held === "short" ? "out_of_stock" : "generic",
      }),
    );
    if (closed.ok) await afterOrderChange(closed.order);
    return held === "short"
      ? { kind: "declined", orderId, reason: "out_of_stock" }
      : { kind: "error", code: "unavailable" };
  }

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
  if (!saved.ok) {
    signal("payment.not_persisted", "error", { orderId, reason: saved.reason });
    return { kind: "error", code: "provider_error" };
  }
  /* A refused attempt released its hold; an unanswered one keeps it. */
  await afterOrderChange(saved.order);
  if (result.kind === "unanswered") {
    signal("payment.provider_error", "warn", { orderId, outcome: "unanswered" });
  }

  if (result.kind === "refused" && result.error.code !== "declined") {
    signal("payment.provider_error", "warn", { orderId, code: result.error.code });
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
  if (!isInFlight(order)) return order;

  /* An order with a provider reference is throttled; one without is not, so
     a stalled attempt is released the first time anyone looks. */
  if (order.providerRef) {
    const globals = globalThis as typeof globalThis & { [REFRESH_KEY]?: Map<string, number> };
    const seen = (globals[REFRESH_KEY] ??= new Map());
    const last = seen.get(order.id) ?? 0;
    if (Date.now() - last < REFRESH_EVERY_MS) return order;
    seen.set(order.id, Date.now());
  }

  return (await reconcileOrder(order)).order;
}

/** A payment that has been started and not yet answered for good. */
function isInFlight(order: Order): boolean {
  return order.state === "payment_processing" || order.state === "pending_payment";
}

/**
 * WHAT HAPPENED WHEN ONE IN-FLIGHT ORDER WAS CHECKED.
 *
 *   settled      the provider's answer moved the order to a new payment state
 *   unchanged    the provider still says what we already knew — nothing to do,
 *                and nothing is ever guessed or forced
 *   released     an attempt that never reached the provider was closed as
 *                failed after its allowance, so the customer is not stuck
 *   unreachable  the provider could not be asked (down, unknown to it, not
 *                configured here); the order is left exactly as it was
 *   failed       the answer arrived but could not be saved; try again later
 *   skipped      not an in-flight order
 */
export type ReconcileOutcome =
  "settled" | "unchanged" | "released" | "unreachable" | "failed" | "skipped";

/**
 * ASK THE PROVIDER WHERE ONE PAYMENT STANDS, AND APPLY THE ANSWER.
 *
 * The same path a webhook takes (`applySnapshot`: reconcile, follow the other
 * axes, bring stock and messages into line), so the payment rules cannot
 * differ by how the answer arrived. No throttle: callers decide when to ask.
 */
export async function reconcileOrder(
  order: Order,
): Promise<{ order: Order; outcome: ReconcileOutcome }> {
  if (!isInFlight(order)) return { order, outcome: "skipped" };
  const repository = orderRepository();

  /* An attempt that never produced a provider reference is released after a
     while, so the customer is not stuck (see `recoverStalledAttempt`). */
  if (!order.providerRef) {
    const now = new Date().toISOString();
    if (!recoverStalledAttempt(order, now)) return { order, outcome: "unchanged" };
    const released = await mutate(repository, order.id, (current) =>
      recoverStalledAttempt(current, now),
    );
    return released.ok
      ? { order: await afterOrderChange(released.order), outcome: "released" }
      : { order, outcome: "failed" };
  }

  const provider = providerById(order.provider);
  if (!provider) return { order, outcome: "unreachable" };
  try {
    const status = await provider.fetchStatus(order.providerRef);
    if (!status.ok) return { order, outcome: "unreachable" };
    const applied = await applySnapshot(repository, order.id, status.snapshot, provider);
    if (!applied.ok) return { order, outcome: "failed" };
    return {
      order: applied.order,
      outcome: applied.order.state !== order.state ? "settled" : "unchanged",
    };
  } catch {
    return { order, outcome: "unreachable" };
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
    if (status.reason !== "not_found") {
      signal("payment.webhook_unsettled", "warn", { outcome: "provider_unreachable" });
    }
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

/**
 * SUBMIT A REFUND to the provider — an operator's decision, never automatic.
 *
 * What this does NOT do is mark money as returned. It sends the provider a
 * FULL refund request under the refund's stable id as the idempotency key,
 * records the refund as `submitted`, and then asks the provider for the
 * payment's state. Only when that state is `refunded` does the order — and
 * the refund record — say so (`followPayment`), exactly as `paid` works.
 *
 * LIVE MONEY IS OPT-IN. With live credentials, refunds are refused unless
 * `OPS_LIVE_REFUNDS=enabled`: returning real money needs an approved refunds
 * policy and a deliberate switch, not only a button.
 */
export type RefundOutcome =
  | { ok: true; state: string }
  | {
      ok: false;
      reason:
        | "not_found"
        | "refund_not_found"
        | "refund_state"
        | "not_paid"
        | "no_provider"
        | "live_refunds_disabled"
        | "provider_refused"
        | "conflict";
    };

export async function submitRefund(
  orderId: string,
  refundId: string,
  actor: Actor,
): Promise<RefundOutcome> {
  const repository = orderRepository();
  const order = await repository.get(orderId);
  if (!order) return { ok: false, reason: "not_found" };
  const refund = order.refunds.find((r) => r.id === refundId);
  if (!refund) return { ok: false, reason: "refund_not_found" };
  if (refund.status !== "requested" && refund.status !== "failed") {
    return { ok: false, reason: "refund_state" };
  }
  if (order.state !== "paid") return { ok: false, reason: "not_paid" };

  const provider = providerById(order.provider);
  if (!provider || !order.providerRef) return { ok: false, reason: "no_provider" };
  if (provider.mode() === "live" && process.env.OPS_LIVE_REFUNDS !== "enabled") {
    return { ok: false, reason: "live_refunds_disabled" };
  }

  const answer = await provider.refund(order.providerRef, refund.id);
  const at = new Date().toISOString();
  const marked = await mutate(repository, orderId, (current) => {
    const r = answer.ok
      ? markRefundSubmitted(current, refundId, actor, at)
      : markRefundFailed(current, refundId, answer.error?.code ?? "provider_error", actor, at);
    return r.ok ? r.order : null;
  });
  if (!marked.ok) return { ok: false, reason: "conflict" };
  if (!answer.ok) {
    signal("refund.provider_error", "warn", { orderId, refundId, code: answer.error?.code });
    await afterOrderChange(marked.order);
    return { ok: false, reason: "provider_refused" };
  }

  /* Ask the provider where the payment stands now; apply it like any answer. */
  try {
    const status = await provider.fetchStatus(order.providerRef);
    if (status.ok) {
      const applied = await applySnapshot(repository, orderId, status.snapshot, provider);
      if (applied.ok) return { ok: true, state: applied.order.state };
    }
  } catch {
    /* The webhook will settle it. */
  }
  await afterOrderChange(marked.order);
  return { ok: true, state: marked.order.state };
}
