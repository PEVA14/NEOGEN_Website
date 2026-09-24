import { activeShipment, openRefund, record, shipmentSummary } from "./operations";

import type { Actor, OpResult } from "./operations";

import type { FulfilmentState, Order, PaymentState, ShipmentSummary } from "./types";

/**
 * WHAT NEEDS A PERSON — derived from the order, never a flag someone sets.
 *
 * Two kinds of reason:
 *
 *   STATE reasons last exactly as long as the state: a disputed payment, a
 *   hold, a refund not yet confirmed. They clear themselves when the order
 *   moves, and cannot be acknowledged away.
 *
 *   EVENT reasons come from something that happened once and cannot be
 *   undone by the order moving — a payment that arrived for an earlier
 *   attempt, an amount that did not match, stock that was short when a late
 *   payment landed. An operator acknowledges them after dealing with them; a
 *   NEW occurrence after the acknowledgement raises the flag again.
 */
export type AttentionReason =
  | "payment_disputed"
  | "payment_stalled"
  | "paid_on_earlier_attempt"
  | "amount_mismatch"
  | "refund_open"
  | "refund_unconfirmed"
  | "fulfilment_on_hold"
  | "shipment_exception"
  | "refunded_after_dispatch"
  | "stock_short";

export const ACKNOWLEDGEABLE: readonly AttentionReason[] = [
  "paid_on_earlier_attempt",
  "amount_mismatch",
  "stock_short",
  "refunded_after_dispatch",
];

/** A payment answered by the provider but still unsettled after this long needs a look. */
export const STALLED_PAYMENT_MS = 30 * 60 * 1000;

function lastAck(order: Order, reason: string): string | null {
  const acks = order.acks.filter((a) => a.reason === reason).map((a) => a.at);
  return acks.length ? acks.sort().at(-1)! : null;
}

/** Did an event of this kind (and note) happen after the last acknowledgement? */
function unacked(
  order: Order,
  reason: AttentionReason,
  kind: "payment_event_rejected" | "inventory_short",
  note?: string,
): boolean {
  const ack = lastAck(order, reason);
  return order.events.some(
    (e) =>
      e.kind === kind && (note === undefined || e.note === note) && (ack === null || e.at > ack),
  );
}

/**
 * Every reason this order needs attention, most urgent first. `now` enables
 * the time-based reason; without it only state and events are considered —
 * which is what the stored `attention` column holds.
 */
export function attentionReasons(order: Order, now?: string): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (order.state === "disputed") reasons.push("payment_disputed");
  if (
    now &&
    order.state === "payment_processing" &&
    order.providerRef !== null &&
    Date.parse(now) - Date.parse(order.updatedAt) > STALLED_PAYMENT_MS
  ) {
    reasons.push("payment_stalled");
  }
  if (
    unacked(order, "paid_on_earlier_attempt", "payment_event_rejected", "paid_on_earlier_attempt")
  ) {
    reasons.push("paid_on_earlier_attempt");
  }
  if (
    order.state !== "paid" &&
    unacked(order, "amount_mismatch", "payment_event_rejected", "amount_mismatch")
  ) {
    reasons.push("amount_mismatch");
  }
  const refund = openRefund(order);
  if (refund && (refund.status === "requested" || refund.status === "failed")) {
    reasons.push("refund_open");
  }
  if (refund && refund.status === "submitted") reasons.push("refund_unconfirmed");
  if (order.fulfilment.state === "on_hold") reasons.push("fulfilment_on_hold");
  if (activeShipment(order)?.state === "exception") reasons.push("shipment_exception");
  if (order.state === "refunded" && order.fulfilment.state === "fulfilled") {
    const ack = lastAck(order, "refunded_after_dispatch");
    if (ack === null || (order.milestones.refunded ?? "") > ack) {
      reasons.push("refunded_after_dispatch");
    }
  }
  if (order.fulfilment.state !== "cancelled" && unacked(order, "stock_short", "inventory_short")) {
    reasons.push("stock_short");
  }
  return reasons;
}

/* ------------------------------------------------------------------ views */

/**
 * THE CONSOLE'S LISTS, as column predicates both repositories interpret —
 * so memory and Postgres cannot disagree about what "ready to ship" means.
 */
export type OrderView =
  | "attention"
  | "awaiting_payment"
  | "to_fulfil"
  | "preparing"
  | "ready_to_ship"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed"
  | "all";

export const ORDER_VIEWS: readonly OrderView[] = [
  "attention",
  "to_fulfil",
  "preparing",
  "ready_to_ship",
  "in_transit",
  "delivered",
  "awaiting_payment",
  "disputed",
  "refunded",
  "cancelled",
  "all",
];

export interface ViewPredicate {
  payment?: readonly PaymentState[];
  fulfilment?: readonly FulfilmentState[];
  shipment?: readonly ShipmentSummary[];
  attention?: true;
  /** Excluded fulfilment states. */
  notFulfilment?: readonly FulfilmentState[];
}

export const VIEW_PREDICATES: Readonly<Record<OrderView, ViewPredicate>> = {
  attention: { attention: true },
  awaiting_payment: {
    payment: ["created", "pending_payment", "payment_processing", "payment_failed"],
    notFulfilment: ["cancelled"],
  },
  to_fulfil: { payment: ["paid"], fulfilment: ["queued"] },
  preparing: { fulfilment: ["preparing"] },
  ready_to_ship: { fulfilment: ["ready_to_ship"] },
  in_transit: { shipment: ["pending", "in_transit", "exception"] },
  delivered: { shipment: ["delivered"] },
  cancelled: { fulfilment: ["cancelled"] },
  refunded: { payment: ["refunded"] },
  disputed: { payment: ["disputed"] },
  all: {},
};

/** The values the repositories index, derived in one place. */
export interface OrderColumns {
  payment: PaymentState;
  fulfilment: FulfilmentState;
  shipment: ShipmentSummary;
  attention: boolean;
}

/**
 * Without `now`, `attention` covers state and event reasons only — what a
 * stored column can hold. The Postgres list adds the time-based reason in SQL;
 * the memory list passes `now`.
 */
export function orderColumns(order: Order, now?: string): OrderColumns {
  return {
    payment: order.state,
    fulfilment: order.fulfilment.state,
    shipment: shipmentSummary(order),
    attention: attentionReasons(order, now).length > 0,
  };
}

export function matchesView(columns: OrderColumns, view: OrderView): boolean {
  const p = VIEW_PREDICATES[view];
  if (p.attention && !columns.attention) return false;
  if (p.payment && !p.payment.includes(columns.payment)) return false;
  if (p.fulfilment && !p.fulfilment.includes(columns.fulfilment)) return false;
  if (p.notFulfilment && p.notFulfilment.includes(columns.fulfilment)) return false;
  if (p.shipment && !p.shipment.includes(columns.shipment)) return false;
  return true;
}

export function isOrderView(value: unknown): value is OrderView {
  return typeof value === "string" && (ORDER_VIEWS as readonly string[]).includes(value);
}

/**
 * An operator marks an event reason as dealt with. Only EVENT reasons can be
 * acknowledged; a disputed payment stays flagged until it is not disputed.
 */
export function acknowledgeAttention(
  order: Order,
  reason: AttentionReason,
  actor: Actor,
  at: string,
): OpResult {
  if (!ACKNOWLEDGEABLE.includes(reason)) return { ok: false, reason: "invalid_input" };
  if (!attentionReasons(order).includes(reason)) return { ok: false, reason: "duplicate" };
  return {
    ok: true,
    order: record(
      { ...order, acks: [...order.acks, { reason, at, by: actor.name }] },
      { kind: "attention_acknowledged", axis: "order", note: reason },
      actor,
      at,
    ),
  };
}
