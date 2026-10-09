import "server-only";

import { reconcileOrder } from "@/server/payments";
import { signal } from "@/server/observe";
import { orderRepository } from "@/server/persistence";

/**
 * THE RECONCILE JOB — ask the provider about every payment still in flight.
 *
 * WHY IT EXISTS. An order's payment moves for two reasons only: the
 * synchronous answer to our own charge, and a webhook. If the answer was a
 * "still processing" and the webhook never arrives (the notification URL is
 * wrong, protected, down, or the provider simply never sent one), nothing
 * ever asks again, and the order sits in "Procesando" with its stock held until
 * somebody happens to open its page. This asks, on a schedule, through the
 * same path a webhook takes.
 *
 * WHAT IT NEVER DOES. It never invents an outcome. If the provider still says
 * "processing", the order stays exactly as it is (the console's 30-minute flag
 * keeps telling an operator); it does not fail an order the provider has not
 * failed, and it does not release stock for a payment that may yet be taken.
 * An order is only ever moved by an answer the provider gave.
 *
 * SAFE TO RUN OFTEN AND TWICE AT ONCE. Every answer is applied by the same
 * idempotent, version-locked path as a webhook, so a duplicate writes nothing
 * and two runs cannot disagree.
 *
 * BOUNDED. A run looks at a limited batch and stops at a time budget, so it
 * always finishes inside a function's lifetime; the next run continues.
 */
export interface ReconcileOptions {
  now?: Date;
  /**
   * Skip an order changed more recently than this. A card charge answers in
   * seconds, so anything younger may be a customer mid-payment; leaving it
   * alone costs nothing and avoids racing them.
   */
  minAgeMs?: number;
  limit?: number;
  /** Stop asking after this long, however many are left. */
  budgetMs?: number;
}

export interface ReconcileSummary {
  checked: number;
  settled: number;
  unchanged: number;
  released: number;
  unreachable: number;
  failed: number;
  /** More in-flight orders exist than this run looked at. */
  moreRemaining: boolean;
  /** The time budget ran out before the batch was finished. */
  stoppedEarly: boolean;
}

export const RECONCILE_DEFAULTS = {
  minAgeMs: 5 * 60 * 1000,
  limit: 50,
  budgetMs: 45 * 1000,
} as const;

export async function reconcileInFlight(options: ReconcileOptions = {}): Promise<ReconcileSummary> {
  const now = options.now ?? new Date();
  const minAgeMs = options.minAgeMs ?? RECONCILE_DEFAULTS.minAgeMs;
  const limit = options.limit ?? RECONCILE_DEFAULTS.limit;
  const budgetMs = options.budgetMs ?? RECONCILE_DEFAULTS.budgetMs;
  const startedAt = Date.now();

  const { orders, truncated } = await orderRepository().list({
    view: "awaiting_payment",
    payment: ["pending_payment", "payment_processing"],
    updatedBefore: new Date(now.getTime() - minAgeMs).toISOString(),
    limit,
    now: now.toISOString(),
  });

  const summary: ReconcileSummary = {
    checked: 0,
    settled: 0,
    unchanged: 0,
    released: 0,
    unreachable: 0,
    failed: 0,
    moreRemaining: truncated,
    stoppedEarly: false,
  };

  for (const order of orders) {
    if (Date.now() - startedAt > budgetMs) {
      summary.stoppedEarly = true;
      summary.moreRemaining = true;
      break;
    }
    const { outcome } = await reconcileOrder(order);
    summary.checked += 1;
    if (outcome === "settled") summary.settled += 1;
    else if (outcome === "released") summary.released += 1;
    else if (outcome === "unreachable") summary.unreachable += 1;
    else if (outcome === "failed") summary.failed += 1;
    else summary.unchanged += 1;
  }

  /* Counts only: no order, customer or provider detail leaves this function. */
  signal("payment.reconciled", summary.unreachable + summary.failed > 0 ? "warn" : "info", {
    count: summary.checked,
    settled: summary.settled,
    released: summary.released,
    unreachable: summary.unreachable,
    failed: summary.failed,
  });
  return summary;
}
