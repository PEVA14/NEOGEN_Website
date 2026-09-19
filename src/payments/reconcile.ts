import { applyPaymentEvent } from "@/domain/order/events";

import type { ApplyResult } from "@/domain/order/events";
import type { Order } from "@/domain/order/types";
import type { PaymentSnapshot } from "./types";

/**
 * APPLY THE PROVIDER'S WORD TO AN ORDER — the one path to every payment state.
 *
 * The synchronous answer to a charge, a verified webhook and a revisit's status
 * fetch all end here, so all three are held to the same checks before the
 * transition table is even consulted:
 *
 *   THE PAYMENT MUST BE FOR THIS ORDER. The provider echoes NEOGEN's order id
 *   back as its external reference; a snapshot naming another order is
 *   refused, however it was routed here.
 *
 *   PAID MEANS PAID IN FULL. A snapshot asserting `paid` must state an amount
 *   equal to the order's total. Anything else — a different amount, or none —
 *   is recorded and refused, never rounded into agreement. The order stays
 *   unpaid and the audit note says why.
 *
 * Pure: an order in, an order out. `scripts/check-payments.mjs` exercises every
 * branch without a provider.
 */
export function reconcileSnapshot(
  order: Order,
  snapshot: PaymentSnapshot,
  provider: string,
  at: string,
): ApplyResult {
  const refuse = (note: string): ApplyResult => ({
    order: {
      ...order,
      updatedAt: at,
      events: [
        ...order.events,
        {
          seq: order.events.length + 1,
          at,
          kind: "payment_event_rejected",
          providerEventId: snapshot.eventId,
          from: order.state,
          to: snapshot.state,
          note,
        },
      ],
    },
    outcome: "rejected",
    note,
  });

  if (order.events.some((e) => e.providerEventId === snapshot.eventId)) {
    return { order, outcome: "duplicate", note: "already_applied" };
  }

  if (snapshot.externalReference !== null && snapshot.externalReference !== order.id) {
    return refuse("external_reference_mismatch");
  }

  if (snapshot.state === "paid") {
    const amount = snapshot.amount;
    if (
      !amount ||
      amount.currency !== order.totals.total.currency ||
      amount.amount !== order.totals.total.amount
    ) {
      return refuse("amount_mismatch");
    }
  }

  /* A provider state that implies no change for NEOGEN (e.g. "created"). */
  if (snapshot.state === null) return { order, outcome: "noop", note: "no_state" };

  return applyPaymentEvent(order, {
    providerEventId: snapshot.eventId,
    provider,
    providerRef: snapshot.providerRef,
    state: snapshot.state,
    detail: snapshot.detail,
    receivedAt: at,
  });
}
