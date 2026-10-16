import { canTransition } from "./types";

import type { Money } from "@/data/commerce/types";
import type { Lot } from "@/data/quality";
import type {
  CancellationReason,
  EventAxis,
  EventMeta,
  EventSource,
  EventState,
  FulfilmentState,
  HoldReason,
  Milestone,
  Order,
  OrderEvent,
  OrderEventKind,
  PaymentState,
  Refund,
  RefundReason,
  Shipment,
  ShipmentException,
  ShipmentState,
  ShipmentSummary,
} from "./types";

/**
 * ORDER OPERATIONS — everything that happens to an order after it is paid.
 *
 * PURE, like `events.ts`: an order in, an order (or a refusal) out. No clock,
 * no repository, no provider. The server layer (`server/orders.ts`) wraps each
 * one in `mutate`, so an operator action and a webhook touching one order at
 * the same instant are serialised by the version lock, and a refusal here is
 * the whole of the validation — the console's buttons are a convenience, not
 * the rule.
 *
 * THE RULES THAT MATTER MOST, each enforced here and asserted in
 * `scripts/check-operations.mjs`:
 *
 *   An order is fulfilled only if it is PAID. Every step into the queue,
 *   preparation, packing or dispatch checks the payment state, so no path —
 *   an old form, a crafted request — can ship an unpaid order.
 *
 *   `fulfilled` is reached only by DISPATCHING a shipment, never set by hand,
 *   so "fulfilled" always means a parcel left.
 *
 *   A refund is never marked as money returned by NEOGEN. `requested` and
 *   `submitted` are NEOGEN's own records; `confirmed` follows the provider's
 *   payment state, exactly as `paid` does.
 *
 *   Nothing restores stock or cancels a parcel that already left. A refund
 *   after dispatch is recorded as a refund; the parcel keeps its state.
 */

/** Who is acting. `name` is the operator's account name, never an email. */
export interface Actor {
  source: EventSource;
  name: string | null;
}

export const SYSTEM: Actor = { source: "system", name: null };

export type OpRefusal =
  | "not_paid"
  | "illegal_transition"
  | "dispatch_required"
  | "not_on_hold"
  | "payment_in_flight"
  | "already_dispatched"
  | "already_cancelled"
  | "shipment_active"
  | "shipment_not_found"
  | "not_ready_to_ship"
  | "line_not_found"
  | "lot_not_found"
  | "lot_wrong_variant"
  | "lot_unavailable"
  | "lot_expired"
  | "lot_quantity"
  | "lot_not_assigned"
  | "fulfilment_closed"
  | "refund_open"
  | "refund_not_found"
  | "refund_state"
  | "payment_disputed"
  | "nothing_to_refund"
  | "invalid_tracking_url"
  | "invalid_input"
  | "duplicate"
  /** D1: the order has no quoted rate to book. */
  | "no_quote"
  /** D1: the order is not in a state a label may be bought for. */
  | "not_bookable"
  /** D1: the booking already has its label, or is not the one being acted on. */
  | "booking_settled"
  /** D1: no label cancellation was requested for this shipment. */
  | "carrier_cancel_not_requested";

export type OpResult = { ok: true; order: Order } | { ok: false; reason: OpRefusal };

const refuse = (reason: OpRefusal): OpResult => ({ ok: false, reason });

/* ------------------------------------------------------------------ record */

export interface EventInput {
  kind: OrderEventKind;
  axis: EventAxis;
  from?: EventState | null;
  to?: EventState | null;
  note?: string | null;
  ref?: string | null;
  meta?: EventMeta;
  providerEventId?: string | null;
}

/** Append one event. Every operation below records through this. */
export function record(order: Order, input: EventInput, actor: Actor, at: string): Order {
  const event: OrderEvent = {
    seq: order.events.length + 1,
    at,
    kind: input.kind,
    providerEventId: input.providerEventId ?? null,
    from: input.from ?? null,
    to: input.to ?? null,
    note: input.note ?? null,
    axis: input.axis,
    source: actor.source,
    actor: actor.name,
    ref: input.ref ?? null,
    ...(input.meta ? { meta: input.meta } : {}),
  };
  return { ...order, updatedAt: at, events: [...order.events, event] };
}

/** Stamp a milestone the first time it is reached. Never overwrites. */
export function reach(order: Order, milestone: Milestone, at: string): Order {
  if (order.milestones[milestone]) return order;
  return { ...order, milestones: { ...order.milestones, [milestone]: at } };
}

/* -------------------------------------------------------------- fulfilment */

/**
 * WHICH FULFILMENT MOVES ARE LEGAL — as data, like the payment table.
 *
 * Backwards steps exist on purpose (`preparing → queued`, `ready_to_ship →
 * preparing`): a packer who finds a damaged vial reopens the order rather
 * than inventing a state for it. `fulfilled` appears only as a target of
 * `ready_to_ship`, and only `dispatch` may take it.
 */
export const FULFILMENT_TRANSITIONS: Readonly<Record<FulfilmentState, readonly FulfilmentState[]>> =
  {
    unfulfilled: ["queued", "cancelled"],
    queued: ["preparing", "on_hold", "cancelled"],
    preparing: ["queued", "ready_to_ship", "on_hold", "cancelled"],
    ready_to_ship: ["preparing", "fulfilled", "on_hold", "cancelled"],
    fulfilled: [],
    /* Resuming returns to where the hold began; see `resumeFulfilment`. */
    on_hold: ["queued", "preparing", "ready_to_ship", "cancelled"],
    cancelled: [],
  };

/** States from which work continues — the ones that need the order to be paid. */
const WORKING: readonly FulfilmentState[] = ["queued", "preparing", "ready_to_ship", "fulfilled"];

const MILESTONE_FOR: Partial<Record<FulfilmentState, Milestone>> = {
  queued: "queued",
  preparing: "preparing",
  ready_to_ship: "ready",
  fulfilled: "fulfilled",
  cancelled: "cancelled",
};

function setFulfilment(
  order: Order,
  to: FulfilmentState,
  actor: Actor,
  at: string,
  note: string | null = null,
  hold: Order["fulfilment"]["hold"] = null,
): Order {
  const from = order.fulfilment.state;
  let next: Order = { ...order, fulfilment: { ...order.fulfilment, state: to, hold } };
  next = record(
    next,
    { kind: "fulfilment_changed", axis: "fulfilment", from, to, note },
    actor,
    at,
  );
  const milestone = MILESTONE_FOR[to];
  return milestone ? reach(next, milestone, at) : next;
}

/**
 * An operator moves the order through the work: queued ⇄ preparing ⇄
 * ready_to_ship. Not `fulfilled` (dispatch a shipment), not `on_hold` (use
 * `holdFulfilment`, which records why), not `cancelled` (use `cancelOrder`,
 * which settles money and stock too).
 */
export function advanceFulfilment(
  order: Order,
  to: "queued" | "preparing" | "ready_to_ship",
  actor: Actor,
  at: string,
): OpResult {
  if (order.state !== "paid") return refuse("not_paid");
  const from = order.fulfilment.state;
  if (from === "on_hold") return refuse("illegal_transition");
  if (!FULFILMENT_TRANSITIONS[from].includes(to)) return refuse("illegal_transition");
  return { ok: true, order: setFulfilment(order, to, actor, at) };
}

export function holdFulfilment(
  order: Order,
  reason: HoldReason,
  actor: Actor,
  at: string,
): OpResult {
  const from = order.fulfilment.state;
  if (!FULFILMENT_TRANSITIONS[from].includes("on_hold")) return refuse("illegal_transition");
  return {
    ok: true,
    order: setFulfilment(order, "on_hold", actor, at, reason, { reason, from, at }),
  };
}

/**
 * Lift a hold and return to where it began. Only for a paid order: a hold
 * placed because the payment was disputed lifts itself when the dispute
 * resolves in NEOGEN's favour (`followPayment`), and an operator cannot lift
 * it while the dispute is open.
 */
export function resumeFulfilment(order: Order, actor: Actor, at: string): OpResult {
  const hold = order.fulfilment.hold;
  if (order.fulfilment.state !== "on_hold" || !hold) return refuse("not_on_hold");
  if (order.state !== "paid") return refuse("not_paid");
  return { ok: true, order: setFulfilment(order, hold.from, actor, at, "resumed") };
}

/* -------------------------------------------------------------------- lots */

function assignedTo(order: Order, line: number): number {
  return order.fulfilment.lots.filter((a) => a.line === line).reduce((n, a) => n + a.quantity, 0);
}

/**
 * ASSIGN A LOT TO A LINE — the traceability link, checked against the lot
 * registry as it is at `at`:
 *
 *   the lot exists and is of THIS line's variant (a 10 mg lot cannot fill a
 *   5 mg line); it is `in-stock` (not quarantined, reserved elsewhere,
 *   depleted or retired); it has not expired on the day of assignment; and
 *   the line's assigned quantities never exceed what was ordered.
 *
 * Allowed while the order is being worked (queued → ready_to_ship) and paid.
 * Whether a lot is REQUIRED before dispatch is an owner decision
 * (`LOT_ASSIGNMENT_REQUIRED`, `config/operations.ts`); it is not today, because
 * no lot has been received.
 */
export function assignLot(
  order: Order,
  input: { line: number; lotId: string; quantity: number },
  lots: readonly Lot[],
  actor: Actor,
  at: string,
): OpResult {
  if (order.state !== "paid") return refuse("not_paid");
  if (!["queued", "preparing", "ready_to_ship"].includes(order.fulfilment.state)) {
    return refuse("fulfilment_closed");
  }
  const line = order.lines[input.line];
  if (!line) return refuse("line_not_found");
  if (!Number.isInteger(input.quantity) || input.quantity < 1) return refuse("invalid_input");
  const lot = lots.find((l) => l.id === input.lotId);
  if (!lot) return refuse("lot_not_found");
  if (lot.variantId !== line.variantId) return refuse("lot_wrong_variant");
  if (lot.status !== "in-stock") return refuse("lot_unavailable");
  if (lot.expiresOn && lot.expiresOn < at.slice(0, 10)) return refuse("lot_expired");
  if (assignedTo(order, input.line) + input.quantity > line.quantity) {
    return refuse("lot_quantity");
  }

  const next: Order = {
    ...order,
    fulfilment: {
      ...order.fulfilment,
      lots: [
        ...order.fulfilment.lots,
        { line: input.line, lotId: lot.id, quantity: input.quantity, at, by: actor.name },
      ],
    },
  };
  return {
    ok: true,
    order: record(
      next,
      {
        kind: "lot_assigned",
        axis: "fulfilment",
        ref: lot.id,
        meta: { line: input.line, sku: line.variantId, quantity: input.quantity },
      },
      actor,
      at,
    ),
  };
}

export function unassignLot(
  order: Order,
  input: { line: number; lotId: string },
  actor: Actor,
  at: string,
): OpResult {
  if (!["queued", "preparing", "ready_to_ship"].includes(order.fulfilment.state)) {
    return refuse("fulfilment_closed");
  }
  const kept = order.fulfilment.lots.filter(
    (a) => !(a.line === input.line && a.lotId === input.lotId),
  );
  if (kept.length === order.fulfilment.lots.length) return refuse("lot_not_assigned");
  const next: Order = { ...order, fulfilment: { ...order.fulfilment, lots: kept } };
  return {
    ok: true,
    order: record(
      next,
      { kind: "lot_unassigned", axis: "fulfilment", ref: input.lotId, meta: { line: input.line } },
      actor,
      at,
    ),
  };
}

/* --------------------------------------------------------------- shipments */

/**
 * WHICH SHIPMENT MOVES ARE LEGAL. A delivered parcel can still come back
 * (`returned`); a cancelled booking or a returned parcel is final — a new
 * attempt is a new shipment.
 */
export const SHIPMENT_TRANSITIONS: Readonly<Record<ShipmentState, readonly ShipmentState[]>> = {
  pending: ["in_transit", "cancelled"],
  in_transit: ["exception", "delivered", "returned"],
  exception: ["in_transit", "delivered", "returned"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

/** The shipment that currently represents the order: the latest one not cancelled. */
export function activeShipment(order: Order): Shipment | null {
  for (let i = order.shipments.length - 1; i >= 0; i -= 1) {
    if (order.shipments[i].state !== "cancelled") return order.shipments[i];
  }
  return null;
}

export function shipmentSummary(order: Order): ShipmentSummary {
  return activeShipment(order)?.state ?? "not_shipped";
}

/** HTTPS, a real host, no credentials in the URL. Anything else is refused. */
export function safeTrackingUrl(value: string | null | undefined): string | null | false {
  if (value === null || value === undefined || value.trim() === "") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return false;
    if (url.username || url.password) return false;
    return url.toString();
  } catch {
    return false;
  }
}

const clean = (value: string | null | undefined, max: number): string | null => {
  const v = value?.trim() ?? "";
  return v === "" ? null : v.slice(0, max);
};

export interface ShipmentInput {
  provider: string;
  providerRef?: string | null;
  carrier?: string | null;
  service?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelRef?: string | null;
  /** True when the parcel was already handed over as it is recorded. */
  dispatched: boolean;
}

/**
 * RECORD A SHIPMENT for a packed order.
 *
 * Only from `ready_to_ship`, only for a paid order, and only one active
 * shipment at a time. `dispatched` records a parcel the carrier already has
 * and fulfils the order in the same write — the two can never disagree.
 */
export function recordShipment(
  order: Order,
  input: ShipmentInput,
  actor: Actor,
  at: string,
): OpResult {
  if (order.state !== "paid") return refuse("not_paid");
  if (order.fulfilment.state !== "ready_to_ship") return refuse("not_ready_to_ship");
  const active = activeShipment(order);
  if (active && active.state !== "returned") return refuse("shipment_active");
  const url = safeTrackingUrl(input.trackingUrl);
  if (url === false) return refuse("invalid_tracking_url");

  const shipment: Shipment = {
    id: `${order.id}-S${order.shipments.length + 1}`,
    provider: clean(input.provider, 40) ?? "manual",
    providerRef: clean(input.providerRef, 120),
    carrier: clean(input.carrier, 80),
    service: clean(input.service, 80),
    trackingNumber: clean(input.trackingNumber, 80),
    trackingUrl: url,
    labelRef: clean(input.labelRef, 200),
    state: input.dispatched ? "in_transit" : "pending",
    createdAt: at,
    shippedAt: input.dispatched ? at : null,
    deliveredAt: null,
    cancelledAt: null,
    trackingAddedAt: null,
  };

  let next: Order = { ...order, shipments: [...order.shipments, shipment] };
  next = record(
    next,
    {
      kind: "shipment_recorded",
      axis: "shipment",
      to: shipment.state,
      ref: shipment.id,
      meta: {
        provider: shipment.provider,
        carrier: shipment.carrier,
        tracking: shipment.trackingNumber,
      },
    },
    actor,
    at,
  );
  if (input.dispatched) {
    next = reach(setFulfilment(next, "fulfilled", actor, at, "dispatched"), "shipped", at);
  }
  return { ok: true, order: next };
}

/**
 * MOVE A SHIPMENT. `in_transit` from `pending` is the dispatch, and fulfils
 * the order. A carrier callback passes its own event id, which is deduplicated
 * globally like a payment event.
 */
export function updateShipment(
  order: Order,
  shipmentId: string,
  to: ShipmentState,
  actor: Actor,
  at: string,
  providerEventId: string | null = null,
  fromCarrier = false,
): OpResult {
  if (providerEventId && order.events.some((e) => e.providerEventId === providerEventId)) {
    return refuse("duplicate");
  }
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment) return refuse("shipment_not_found");
  if (!SHIPMENT_TRANSITIONS[shipment.state].includes(to)) return refuse("illegal_transition");

  const dispatching = shipment.state === "pending" && to === "in_transit";
  if (dispatching) {
    if (order.state !== "paid") return refuse("not_paid");
    /*
     * An operator dispatches a packed order. A CARRIER reporting that it
     * collected a provider-booked parcel is a fact, not a request: the label
     * was bought on payment (D1), so the parcel can leave before anyone
     * pressed "ready to ship" — the order is fulfilled by the pickup itself.
     */
    const packed = fromCarrier
      ? ["queued", "preparing", "ready_to_ship"].includes(order.fulfilment.state)
      : order.fulfilment.state === "ready_to_ship";
    if (!packed) return refuse("not_ready_to_ship");
  }

  const updated: Shipment = {
    ...shipment,
    state: to,
    shippedAt: shipment.shippedAt ?? (to === "in_transit" ? at : null),
    deliveredAt: to === "delivered" ? at : shipment.deliveredAt,
    cancelledAt: to === "cancelled" ? at : shipment.cancelledAt,
  };
  let next: Order = {
    ...order,
    shipments: order.shipments.map((s) => (s.id === shipmentId ? updated : s)),
  };
  next = record(
    next,
    {
      kind: "shipment_changed",
      axis: "shipment",
      from: shipment.state,
      to,
      ref: shipment.id,
      providerEventId,
    },
    actor,
    at,
  );
  if (dispatching) {
    next = reach(setFulfilment(next, "fulfilled", actor, at, "dispatched"), "shipped", at);
  }
  if (to === "delivered") next = reach(next, "delivered", at);
  return { ok: true, order: next };
}

/**
 * Record or correct the carrier's tracking details. When a parcel that
 * already shipped gets its first tracking number, `trackingAddedAt` marks
 * that the customer is owed a tracking message.
 */
export function setTracking(
  order: Order,
  shipmentId: string,
  input: { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null },
  actor: Actor,
  at: string,
): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment) return refuse("shipment_not_found");
  if (shipment.state === "cancelled" || shipment.state === "returned") {
    return refuse("illegal_transition");
  }
  const url = safeTrackingUrl(input.trackingUrl);
  if (url === false) return refuse("invalid_tracking_url");
  const trackingNumber = clean(input.trackingNumber, 80) ?? shipment.trackingNumber;
  const firstTracking =
    !shipment.trackingNumber && trackingNumber !== null && shipment.shippedAt !== null;

  const updated: Shipment = {
    ...shipment,
    carrier: clean(input.carrier, 80) ?? shipment.carrier,
    trackingNumber,
    trackingUrl: url ?? shipment.trackingUrl,
    trackingAddedAt: shipment.trackingAddedAt ?? (firstTracking ? at : null),
  };
  const next: Order = {
    ...order,
    shipments: order.shipments.map((s) => (s.id === shipmentId ? updated : s)),
  };
  return {
    ok: true,
    order: record(
      next,
      {
        kind: "tracking_updated",
        axis: "shipment",
        ref: shipment.id,
        meta: { carrier: updated.carrier, tracking: updated.trackingNumber },
      },
      actor,
      at,
    ),
  };
}

/* ------------------------------------------- provider bookings (D1, labels) */

/** The provider booking on the active shipment, if the order has one. */
export function activeBooking(order: Order): Shipment | null {
  const active = activeShipment(order);
  return active && active.booking ? active : null;
}

/**
 * DOES THIS PAID ORDER STILL NEED A LABEL? Paid, quoted, not cancelled, not
 * disputed or held, not already fulfilled, and no active shipment. The one
 * question the booking service, the reconcile and the console all ask.
 */
export function needsBooking(order: Order): boolean {
  if (order.state !== "paid" || !order.delivery.quote) return false;
  if (order.cancellation) return false;
  if (!["queued", "preparing", "ready_to_ship"].includes(order.fulfilment.state)) return false;
  const active = activeShipment(order);
  return !active || active.state === "returned";
}

/**
 * REQUEST A LABEL — written under the order's version lock BEFORE the
 * provider is called. Two processes racing for one paid order both read "no
 * shipment"; only one save wins, and the loser re-reads a shipment that
 * already has a booking. That record, plus the provider's own per-rate
 * deduplication, is what makes one paid order buy one label.
 */
export function requestBooking(order: Order, at: string): OpResult {
  if (!order.delivery.quote) return refuse("no_quote");
  if (!needsBooking(order)) {
    return activeBooking(order) ? refuse("booking_settled") : refuse("not_bookable");
  }
  const q = order.delivery.quote;
  const shipment: Shipment = {
    id: `${order.id}-S${order.shipments.length + 1}`,
    provider: q.provider,
    providerRef: null,
    carrier: q.carrier,
    service: q.service,
    trackingNumber: null,
    trackingUrl: null,
    labelRef: null,
    state: "pending",
    createdAt: at,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    trackingAddedAt: null,
    booking: {
      status: "requested",
      rateId: q.rateId,
      quotationId: q.quotationId,
      cost: q.cost,
      attempts: 0,
      lastError: null,
      requestedAt: at,
      updatedAt: at,
    },
    providerStatus: null,
    exception: null,
    exceptionAt: null,
    cancelRequestedAt: null,
  };
  return {
    ok: true,
    order: record(
      { ...order, shipments: [...order.shipments, shipment] },
      {
        kind: "shipment_booking",
        axis: "shipment",
        to: "pending",
        ref: shipment.id,
        note: "requested",
        meta: { carrier: q.carrier, service: q.service },
      },
      SYSTEM,
      at,
    ),
  };
}

function withShipment(order: Order, id: string, change: (s: Shipment) => Shipment): Order {
  return { ...order, shipments: order.shipments.map((s) => (s.id === id ? change(s) : s)) };
}

/** The provider's answer to a booking: its id, tracking and label, as far as it has them. */
export function answerBooking(
  order: Order,
  shipmentId: string,
  answer: {
    providerRef: string;
    created: boolean;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    labelAvailable: boolean;
    cost: Money | null;
    providerStatus: string | null;
  },
  at: string,
): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment?.booking) return refuse("shipment_not_found");
  if (shipment.providerRef && shipment.providerRef !== answer.providerRef) {
    return refuse("booking_settled");
  }
  const url = safeTrackingUrl(answer.trackingUrl);
  const firstAnswer = shipment.booking.status !== "created" && answer.created;
  const next = withShipment(order, shipmentId, (s) => ({
    ...s,
    providerRef: answer.providerRef,
    carrier: answer.carrier ?? s.carrier,
    trackingNumber: answer.trackingNumber ?? s.trackingNumber,
    trackingUrl: url || s.trackingUrl,
    labelRef: answer.labelAvailable ? "provider" : s.labelRef,
    providerStatus: answer.providerStatus ?? s.providerStatus ?? null,
    booking: {
      ...s.booking!,
      status: answer.created ? "created" : s.booking!.status,
      cost: answer.cost ?? s.booking!.cost,
      lastError: answer.created ? null : s.booking!.lastError,
      updatedAt: at,
    },
  }));
  return {
    ok: true,
    order: firstAnswer
      ? record(
          next,
          {
            kind: "shipment_booking",
            axis: "shipment",
            ref: shipmentId,
            note: "created",
            meta: { tracking: answer.trackingNumber },
          },
          SYSTEM,
          at,
        )
      : next,
  };
}

/**
 * A booking attempt that did not produce a label. `retryable` (no answer,
 * still in progress, a provider outage, labels switched off) keeps it
 * `requested` — the reconcile and the console try again under the same
 * rate. Otherwise it is `failed`, and an operator decides. The order stays
 * paid and its stock stays held either way: this is an operations problem,
 * not an unpaid order.
 */
export function failBooking(
  order: Order,
  shipmentId: string,
  code: string,
  retryable: boolean,
  at: string,
): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment?.booking) return refuse("shipment_not_found");
  if (shipment.booking.status === "created") return refuse("booking_settled");
  const status = retryable ? "requested" : "failed";
  const next = withShipment(order, shipmentId, (s) => ({
    ...s,
    booking: {
      ...s.booking!,
      status,
      attempts: s.booking!.attempts + 1,
      lastError: code.slice(0, 40),
      updatedAt: at,
    },
  }));
  return {
    ok: true,
    order: record(
      next,
      {
        kind: "shipment_booking",
        axis: "shipment",
        ref: shipmentId,
        note: retryable ? `retry:${code}` : `failed:${code}`,
      },
      SYSTEM,
      at,
    ),
  };
}

/**
 * A NEW RATE for a booking whose rate the provider refused (expired): the
 * same carrier and service, re-quoted. Compare-and-set on the old rate, so
 * a second process holding the old one cannot apply a different change.
 */
export function rebook(
  order: Order,
  shipmentId: string,
  expectedRateId: string,
  rate: { rateId: string; quotationId: string; cost: Money },
  at: string,
): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment?.booking) return refuse("shipment_not_found");
  if (shipment.providerRef || shipment.booking.rateId !== expectedRateId) {
    return refuse("booking_settled");
  }
  const next = withShipment(order, shipmentId, (s) => ({
    ...s,
    booking: { ...s.booking!, ...rate, status: "requested", updatedAt: at },
  }));
  return {
    ok: true,
    order: record(
      next,
      {
        kind: "shipment_booking",
        axis: "shipment",
        ref: shipmentId,
        note: "requoted",
        meta: { cost: rate.cost.amount },
      },
      SYSTEM,
      at,
    ),
  };
}

/** An operator sends a failed booking back to be tried again. */
export function retryBooking(order: Order, shipmentId: string, actor: Actor, at: string): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment?.booking) return refuse("shipment_not_found");
  if (shipment.booking.status !== "failed") return refuse("booking_settled");
  if (order.state !== "paid" || order.cancellation) return refuse("not_bookable");
  const next = withShipment(order, shipmentId, (s) => ({
    ...s,
    booking: { ...s.booking!, status: "requested", updatedAt: at },
  }));
  return {
    ok: true,
    order: record(
      next,
      { kind: "shipment_booking", axis: "shipment", ref: shipmentId, note: "retry_requested" },
      actor,
      at,
    ),
  };
}

/**
 * A VERIFIED TRACKING FACT from the provider. Deduplicated by its event id;
 * an older fact arriving after a newer one is refused by the transition
 * table and changes nothing. A parcel the carrier reports beyond the next
 * step (pending → delivered, when the pickup scan never came) passes
 * through `in_transit` first, so dispatch, fulfilment and stock follow.
 */
export function applyTracking(
  order: Order,
  shipmentId: string,
  event: {
    eventId: string;
    state: ShipmentState;
    exception: ShipmentException | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    providerStatus: string;
  },
  at: string,
): OpResult {
  if (order.events.some((e) => e.providerEventId === event.eventId)) return refuse("duplicate");
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment) return refuse("shipment_not_found");
  const actor: Actor = { source: "provider", name: shipment.provider };

  /* Tracking details first: they are true whatever the state does. */
  const url = safeTrackingUrl(event.trackingUrl);
  let next = withShipment(order, shipmentId, (s) => ({
    ...s,
    trackingNumber: event.trackingNumber ?? s.trackingNumber,
    trackingUrl: url || s.trackingUrl,
    providerStatus: event.providerStatus.slice(0, 60),
  }));

  let current = next.shipments.find((s) => s.id === shipmentId)!;
  const path: ShipmentState[] =
    current.state === event.state
      ? []
      : SHIPMENT_TRANSITIONS[current.state].includes(event.state)
        ? [event.state]
        : current.state === "pending" &&
            SHIPMENT_TRANSITIONS.in_transit.includes(event.state)
          ? ["in_transit", event.state]
          : [];
  if (current.state !== event.state && path.length === 0) {
    /* Out of order or impossible: keep the newer truth, record nothing. */
    return refuse("illegal_transition");
  }
  for (const [i, to] of path.entries()) {
    const last = i === path.length - 1;
    const moved = updateShipment(
      next,
      shipmentId,
      to,
      actor,
      at,
      last ? event.eventId : null,
      true,
    );
    if (!moved.ok) return moved;
    next = moved.order;
  }
  if (path.length === 0) {
    next = record(
      next,
      {
        kind: "tracking_updated",
        axis: "shipment",
        ref: shipmentId,
        providerEventId: event.eventId,
        note: event.providerStatus.slice(0, 60),
      },
      actor,
      at,
    );
  }

  /* The first time a parcel needs the customer (an attempt, a branch), say so once. */
  current = next.shipments.find((s) => s.id === shipmentId)!;
  const customerIssue = event.exception === "delivery_attempt" || event.exception === "at_branch";
  const shipped = current.shippedAt !== null;
  next = withShipment(next, shipmentId, (s) => ({
    ...s,
    exception: s.state === "exception" ? event.exception : null,
    exceptionAt: s.exceptionAt ?? (customerIssue && s.state === "exception" ? at : null),
    trackingAddedAt:
      s.trackingAddedAt ??
      (!shipment.trackingNumber && s.trackingNumber && shipped && shipment.shippedAt ? at : null),
  }));
  return { ok: true, order: next };
}

/** The provider confirmed the label is cancelled. */
export function carrierCancelled(
  order: Order,
  shipmentId: string,
  actor: Actor,
  at: string,
): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment) return refuse("shipment_not_found");
  let next = order;
  if (shipment.state !== "cancelled") {
    const moved = updateShipment(order, shipmentId, "cancelled", actor, at);
    if (!moved.ok) return moved;
    next = moved.order;
  }
  return {
    ok: true,
    order: record(
      next,
      { kind: "carrier_cancel", axis: "shipment", ref: shipmentId, note: "confirmed" },
      actor,
      at,
    ),
  };
}

/** The provider refused to cancel the label (collected, or past its window). */
export function carrierCancelRefused(
  order: Order,
  shipmentId: string,
  detail: string,
  actor: Actor,
  at: string,
): OpResult {
  const shipment = order.shipments.find((s) => s.id === shipmentId);
  if (!shipment) return refuse("shipment_not_found");
  return {
    ok: true,
    order: record(
      order,
      {
        kind: "carrier_cancel",
        axis: "shipment",
        ref: shipmentId,
        note: `refused:${detail.slice(0, 40)}`,
      },
      actor,
      at,
    ),
  };
}

/* ------------------------------------------------------- cancel and refund */

/** The refund still being worked on, if any. */
export function openRefund(order: Order): Refund | null {
  return (
    order.refunds.find(
      (r) => r.status === "requested" || r.status === "submitted" || r.status === "failed",
    ) ?? null
  );
}

function newRefund(order: Order, reason: RefundReason, actor: Actor, at: string): Refund {
  return {
    id: `${order.id}:refund:${order.refunds.length + 1}`,
    amount: { ...order.totals.total },
    reason,
    status: "requested",
    requestedAt: at,
    requestedBy: actor.name,
    submittedAt: null,
    confirmedAt: null,
    error: null,
  };
}

function withRefund(order: Order, refund: Refund, actor: Actor, at: string): Order {
  return record(
    { ...order, refunds: [...order.refunds, refund] },
    {
      kind: "refund_requested",
      axis: "refund",
      to: "requested",
      ref: refund.id,
      note: refund.reason,
      meta: { amount: refund.amount.amount },
    },
    actor,
    at,
  );
}

/**
 * CANCEL AN ORDER — and settle what that means on every axis.
 *
 *   unpaid (created / pending / failed)  payment → cancelled; nothing to refund
 *   paid, not dispatched                 fulfilment → cancelled; a FULL refund
 *                                        is REQUESTED (money has not moved)
 *   disputed                             fulfilment → cancelled; no refund —
 *                                        the dispute is already moving the money,
 *                                        and refunding too would pay it back twice
 *   money in flight (processing)         refused — wait for the provider
 *   already dispatched                   refused — that is a return, not a
 *                                        cancellation
 *
 * A pending (not collected) shipment is cancelled with it.
 */
export function cancelOrder(
  order: Order,
  reason: CancellationReason,
  actor: Actor,
  at: string,
): OpResult {
  if (order.fulfilment.state === "cancelled" || order.cancellation) {
    return refuse("already_cancelled");
  }
  if (order.state === "payment_processing") return refuse("payment_in_flight");
  const active = activeShipment(order);
  if (
    order.fulfilment.state === "fulfilled" ||
    (active && active.state !== "pending" && active.state !== "returned")
  ) {
    return refuse("already_dispatched");
  }

  let next: Order = order;
  const unpaid: readonly PaymentState[] = ["created", "pending_payment", "payment_failed"];
  if (unpaid.includes(order.state)) {
    if (!canTransition(order.state, "cancelled")) return refuse("illegal_transition");
    next = record(
      { ...next, state: "cancelled" },
      { kind: "status_changed", axis: "payment", from: order.state, to: "cancelled", note: reason },
      actor,
      at,
    );
  }

  if (active && active.state === "pending") {
    if (active.provider !== "manual" && (active.providerRef || active.booking)) {
      /*
       * A label bought from a provider is NOT cancelled by cancelling the
       * order: that is a separate act at the provider, which may refuse.
       * Mark it, and an operator cancels it at the provider (D1). The
       * refund does not wait for it.
       */
      next = {
        ...next,
        shipments: next.shipments.map((s) =>
          s.id === active.id ? { ...s, cancelRequestedAt: s.cancelRequestedAt ?? at } : s,
        ),
      };
      next = record(
        next,
        { kind: "carrier_cancel", axis: "shipment", ref: active.id, note: "requested" },
        actor,
        at,
      );
    } else {
      const moved = updateShipment(next, active.id, "cancelled", actor, at);
      if (moved.ok) next = moved.order;
    }
  }

  next = {
    ...next,
    cancellation: { at, reason, source: actor.source, by: actor.name },
  };
  next = record(next, { kind: "order_cancelled", axis: "order", note: reason }, actor, at);
  next = setFulfilment(next, "cancelled", actor, at, reason);

  if (order.state === "paid" && !openRefund(next)) {
    next = withRefund(next, newRefund(next, "order_cancelled", actor, at), actor, at);
  }
  return { ok: true, order: next };
}

/**
 * Record that a refund is owed on a paid order that is NOT being cancelled —
 * a return, a parcel lost in transit, a duplicate charge found by hand.
 */
export function requestRefund(
  order: Order,
  reason: RefundReason,
  actor: Actor,
  at: string,
): OpResult {
  if (order.state === "disputed") return refuse("payment_disputed");
  if (order.state !== "paid") return refuse("nothing_to_refund");
  if (openRefund(order)) return refuse("refund_open");
  return { ok: true, order: withRefund(order, newRefund(order, reason, actor, at), actor, at) };
}

/** The provider accepted the refund request. Money has NOT been confirmed back. */
export function markRefundSubmitted(
  order: Order,
  refundId: string,
  actor: Actor,
  at: string,
): OpResult {
  const refund = order.refunds.find((r) => r.id === refundId);
  if (!refund) return refuse("refund_not_found");
  if (refund.status !== "requested" && refund.status !== "failed") return refuse("refund_state");
  return {
    ok: true,
    order: record(
      {
        ...order,
        refunds: order.refunds.map((r) =>
          r.id === refundId ? { ...r, status: "submitted", submittedAt: at, error: null } : r,
        ),
      },
      {
        kind: "refund_submitted",
        axis: "refund",
        from: refund.status,
        to: "submitted",
        ref: refundId,
      },
      actor,
      at,
    ),
  };
}

export function markRefundFailed(
  order: Order,
  refundId: string,
  code: string,
  actor: Actor,
  at: string,
): OpResult {
  const refund = order.refunds.find((r) => r.id === refundId);
  if (!refund) return refuse("refund_not_found");
  if (refund.status !== "requested" && refund.status !== "failed") return refuse("refund_state");
  return {
    ok: true,
    order: record(
      {
        ...order,
        refunds: order.refunds.map((r) =>
          r.id === refundId ? { ...r, status: "failed", error: code.slice(0, 60) } : r,
        ),
      },
      {
        kind: "refund_failed",
        axis: "refund",
        from: refund.status,
        to: "failed",
        ref: refundId,
        note: code.slice(0, 60),
      },
      actor,
      at,
    ),
  };
}

/* ------------------------------------------------ payment → other axes */

/**
 * WHAT A PAYMENT CHANGE MEANS FOR THE REST OF THE ORDER.
 *
 * Called by the server after a provider answer moved `order.state` (the
 * payment transition itself stays in `reconcileSnapshot` / `applyPaymentEvent`,
 * untouched). Level-triggered: it looks at where the order IS, so calling it
 * twice is harmless.
 *
 *   → paid        milestone; an unfulfilled order joins the queue; a hold
 *                 placed for a dispute lifts (the dispute went NEOGEN's way)
 *   → disputed    work in progress stops (on_hold: payment_disputed)
 *   → refunded    the open refund is confirmed — or, for a refund made at the
 *                 provider directly, one is recorded as confirmed; work not yet
 *                 dispatched is cancelled; a parcel already out keeps its state
 */
export function followPayment(order: Order, previous: PaymentState, at: string): Order {
  if (order.state === previous) return order;
  let next = order;

  if (order.state === "paid") {
    next = reach(next, "paid", at);
    if (next.fulfilment.state === "unfulfilled") {
      next = setFulfilment(next, "queued", SYSTEM, at, "payment_confirmed");
    } else if (
      next.fulfilment.state === "on_hold" &&
      next.fulfilment.hold?.reason === "payment_disputed"
    ) {
      next = setFulfilment(next, next.fulfilment.hold.from, SYSTEM, at, "dispute_resolved");
    }
  }

  if (order.state === "disputed") {
    next = reach(next, "disputed", at);
    if (WORKING.includes(next.fulfilment.state) && next.fulfilment.state !== "fulfilled") {
      const held = holdFulfilment(next, "payment_disputed", SYSTEM, at);
      if (held.ok) next = held.order;
    }
  }

  if (order.state === "refunded") {
    next = reach(next, "refunded", at);
    const open = openRefund(next);
    if (open) {
      next = record(
        {
          ...next,
          refunds: next.refunds.map((r) =>
            r.id === open.id ? { ...r, status: "confirmed", confirmedAt: at, error: null } : r,
          ),
        },
        {
          kind: "refund_confirmed",
          axis: "refund",
          from: open.status,
          to: "confirmed",
          ref: open.id,
        },
        { source: "provider", name: null },
        at,
      );
    } else if (!next.refunds.some((r) => r.status === "confirmed")) {
      const refund: Refund = {
        ...newRefund(next, "operator_other", { source: "provider", name: null }, at),
        status: "confirmed",
        confirmedAt: at,
      };
      next = record(
        { ...next, refunds: [...next.refunds, refund] },
        {
          kind: "refund_confirmed",
          axis: "refund",
          to: "confirmed",
          ref: refund.id,
          note: "provider_side",
        },
        { source: "provider", name: null },
        at,
      );
    }
    const active = activeShipment(next);
    const dispatched =
      next.fulfilment.state === "fulfilled" || (active !== null && active.state !== "pending");
    if (!dispatched && next.fulfilment.state !== "cancelled") {
      if (active && active.state === "pending") {
        const moved = updateShipment(next, active.id, "cancelled", SYSTEM, at);
        if (moved.ok) next = moved.order;
      }
      if (!next.cancellation) {
        next = {
          ...next,
          cancellation: { at, reason: "payment_refunded", source: "provider", by: null },
        };
      }
      next = setFulfilment(next, "cancelled", SYSTEM, at, "payment_refunded");
    }
  }

  return next;
}

/* ---------------------------------------------------------- notes and refs */

export function addNote(order: Order, text: string, actor: Actor, at: string): OpResult {
  const body = text.trim().slice(0, 1000);
  if (!body) return refuse("invalid_input");
  return {
    ok: true,
    order: record(
      { ...order, notes: [...order.notes, { at, by: actor.name, text: body }] },
      { kind: "note_added", axis: "order" },
      actor,
      at,
    ),
  };
}

export function addExternalReference(
  order: Order,
  input: { system: string; ref: string },
  actor: Actor,
  at: string,
): OpResult {
  const system = clean(input.system, 40);
  const ref = clean(input.ref, 120);
  if (!system || !ref || !/^[a-z][a-z0-9_-]*$/.test(system)) return refuse("invalid_input");
  if (order.externalRefs.some((r) => r.system === system && r.ref === ref)) {
    return refuse("duplicate");
  }
  return {
    ok: true,
    order: record(
      { ...order, externalRefs: [...order.externalRefs, { system, ref, at }] },
      { kind: "external_reference_added", axis: "order", ref, note: system },
      actor,
      at,
    ),
  };
}
