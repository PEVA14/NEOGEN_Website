import type { Fulfilment, FulfilmentState, Order, PaymentState } from "./types";

/**
 * READ ANY STORED ORDER AS THE CURRENT SHAPE.
 *
 * Orders are stored whole (jsonb in Postgres, a clone in memory), so an order
 * written before the operations fields existed comes back without them. Rather
 * than a data migration that rewrites every row — and has to be run, and can
 * be forgotten — every repository read passes through here. The first save
 * after that writes the upgraded shape.
 *
 * WHAT A SCHEMA-1 ORDER BECOMES. Its `status` was never advanced (every order
 * sat at `placed`; nothing could move it), so it carries no fulfilment
 * information, and the fulfilment state is derived from the payment state
 * alone: a paid order joins the queue, a cancelled or refunded one is
 * cancelled, anything else is not yet eligible. Nothing is invented — no
 * shipment, no lot, no milestone other than what the audit trail records.
 *
 * Idempotent: an order already at schema 2 is returned as it is.
 */
export function upgradeOrder(raw: Order): Order {
  if ((raw as { schema?: number }).schema === 2) return raw;

  const legacy = raw as Order & { status?: unknown };
  const { status: _status, ...rest } = legacy;
  void _status;

  const paidAt = legacy.events.find(
    (e) => e.to === "paid" && (e.kind === "payment_event_applied" || e.axis === "payment"),
  )?.at;

  return {
    ...rest,
    schema: 2,
    fulfilment: initialFulfilment(legacy.state, legacy.updatedAt),
    shipments: [],
    cancellation: null,
    refunds: [],
    milestones: paidAt ? { paid: paidAt, queued: paidAt } : {},
    access: null,
    externalRefs: [],
    notes: [],
    acks: [],
  };
}

/** The fulfilment state an order with no operations history starts in. */
export function initialFulfilment(payment: PaymentState, at: string): Fulfilment {
  const state: FulfilmentState =
    payment === "paid"
      ? "queued"
      : payment === "cancelled" || payment === "refunded"
        ? "cancelled"
        : payment === "disputed"
          ? "on_hold"
          : "unfulfilled";
  return {
    state,
    hold: state === "on_hold" ? { reason: "payment_disputed", from: "queued", at } : null,
    lots: [],
  };
}
