/**
 * OPERATIONS INVARIANTS — everything that happens to an order after checkout.
 *
 * The payment path has its own suite (`check:payments`); this one proves the
 * layer around it: fulfilment, lots, shipments, cancellations, refunds,
 * attention, inventory (memory AND a real Postgres engine), notifications,
 * guest order access, the operator login, and the email templates.
 *
 * WHAT IS PROVEN, because each is a way to ship, charge or say the wrong thing:
 *
 *   an unpaid order cannot enter fulfilment, be packed or be dispatched
 *   `fulfilled` is reachable only by dispatching a shipment
 *   invalid fulfilment / shipment transitions are refused
 *   a lot must match the line's SKU, be in stock, unexpired, within quantity
 *   cancelling a paid order REQUESTS a refund; it never claims money moved
 *   a refund is confirmed only by the provider's payment state
 *   a disputed payment stops work and lifts itself when resolved
 *   nothing dispatched is cancelled, and no stock is restored after dispatch
 *   duplicate carrier events apply once
 *   two checkouts racing for the last unit: exactly one wins
 *   messages are owed by state, queued once, and never marked sent without a provider
 *   an order-status link cannot be forged, guessed or reused across orders
 *
 *   npm run check:operations
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

delete process.env.DATABASE_URL;
const signals = [];
globalThis.__neogen_signal_sinks__ = [{ write: (r) => signals.push(r) }];

const failures = [];
let passed = 0;
const fail = (what, detail) => failures.push(`${what}: ${detail}`);
const eq = (actual, expected, what) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) fail(what, `expected ${e}, got ${a}`);
  else passed += 1;
};
const ok = (cond, what) => {
  if (!cond) fail(what, "expected true");
  else passed += 1;
};

const order$ = await import("../src/domain/order/index.ts");
const {
  upgradeOrder,
  followPayment,
  advanceFulfilment,
  holdFulfilment,
  resumeFulfilment,
  assignLot,
  unassignLot,
  recordShipment,
  updateShipment,
  setTracking,
  cancelOrder,
  requestRefund,
  markRefundSubmitted,
  markRefundFailed,
  attentionReasons,
  acknowledgeAttention,
  orderColumns,
  matchesView,
  shipmentSummary,
  safeTrackingUrl,
  addNote,
  addExternalReference,
  FULFILMENT_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  ORDER_VIEWS,
} = order$;
const { applyPaymentEvent } = await import("../src/domain/order/events.ts");
const { desiredHold, holdLines } = await import("../src/domain/inventory/index.ts");
const { memoryInventoryStore, __resetInventory } =
  await import("../src/domain/inventory/adapters/memory.ts");
const { createPostgresInventoryStore } =
  await import("../src/domain/inventory/adapters/postgres.ts");
const { createPostgresOrderRepository } = await import("../src/domain/order/adapters/postgres.ts");
const { messagesOwed, dispatch } = await import("../src/domain/notifications/index.ts");
const { memoryOutbox, __resetOutbox } =
  await import("../src/domain/notifications/adapters/memoryOutbox.ts");
const { createPostgresOutbox } =
  await import("../src/domain/notifications/adapters/postgresOutbox.ts");
const { noneChannel } = await import("../src/domain/notifications/adapters/none.ts");
const { noneShippingProvider } = await import("../src/shipping/adapters/none.ts");

/* ---- fixtures ------------------------------------------------------------ */

const OP = { source: "operator", name: "ana" };
const T0 = "2026-09-20T10:00:00.000Z";
const at = (min) => new Date(Date.parse(T0) + min * 60_000).toISOString();
const mxn = (amount) => ({ amount, currency: "MXN" });

let seq = 0;
/** A schema-1 order, exactly as one was stored before operations existed. */
function legacyOrder(state = "created", extra = {}) {
  seq += 1;
  return {
    id: `NG-OPS${String(seq).padStart(4, "0")}-X${String(seq % 36).padStart(2, "0")}`,
    createdAt: T0,
    updatedAt: T0,
    version: 1,
    state,
    status: "placed",
    lines: [
      {
        variantId: "reta-10mg",
        slug: "reta",
        name: "RETA",
        presentation: "10 mg",
        unitPrice: mxn(6000),
        quantity: 2,
        lineTotal: mxn(12000),
      },
    ],
    totals: { subtotal: mxn(12000), shipping: mxn(0), total: mxn(12000) },
    contact: { email: "cliente@example.mx", name: "Cliente", phone: "523300000000" },
    shipping: {
      recipient: "Cliente",
      street: "Calle",
      numeroExterior: "1",
      numeroInterior: null,
      colonia: "Centro",
      postalCode: "44100",
      city: "Guadalajara",
      state: "JAL",
      country: "MX",
      notes: null,
    },
    delivery: { methodId: "local-priority", route: "priority", estimateDays: 1, price: mxn(0) },
    route: "priority",
    acknowledged: [],
    locale: "es",
    providerRef: state === "created" ? null : "ORD-MP-1",
    provider: state === "created" ? null : "mercadopago",
    attempts: [],
    events: [
      {
        seq: 1,
        at: T0,
        kind: "created",
        providerEventId: null,
        from: null,
        to: "created",
        note: null,
      },
    ],
    ...extra,
  };
}
const fresh = (state = "created") => upgradeOrder(legacyOrder(state));

/** Pay an order the only way the system can: a provider event, then its consequences. */
function pay(order, when = at(1)) {
  const applied = applyPaymentEvent(order, {
    providerEventId: `mp:${order.id}:paid:${when}`,
    provider: "mercadopago",
    providerRef: order.providerRef ?? "ORD-MP-1",
    state: "paid",
    detail: null,
    receivedAt: when,
  });
  return followPayment(applied.order, order.state, when);
}
function providerMoves(order, state, when) {
  const applied = applyPaymentEvent(order, {
    providerEventId: `mp:${order.id}:${state}:${when}`,
    provider: "mercadopago",
    providerRef: order.providerRef ?? "ORD-MP-1",
    state,
    detail: null,
    receivedAt: when,
  });
  eq(applied.outcome, "applied", `provider moves ${order.state} → ${state}`);
  return followPayment(applied.order, order.state, when);
}
const must = (r, what) => {
  if (!r.ok) {
    fail(what, `refused: ${r.reason}`);
    return null;
  }
  passed += 1;
  return r.order;
};
const refused = (r, reason, what) => eq(r.ok ? "accepted" : r.reason, reason, what);

/** Test-only lots. The real registry is empty and stays empty. */
const LOTS = [
  {
    id: "L-A",
    slug: "l-a",
    variantId: "reta-10mg",
    internalReference: "PO-1",
    supplierBatchReference: "SUP-9",
    manufacturedOn: null,
    receivedOn: "2026-09-01",
    expiresOn: "2027-09-01",
    retestOn: null,
    status: "in-stock",
    publicVisibility: false,
  },
  {
    id: "L-B",
    slug: "l-b",
    variantId: "reta-5mg",
    internalReference: "PO-2",
    supplierBatchReference: null,
    manufacturedOn: null,
    receivedOn: null,
    expiresOn: null,
    retestOn: null,
    status: "in-stock",
    publicVisibility: false,
  },
  {
    id: "L-Q",
    slug: "l-q",
    variantId: "reta-10mg",
    internalReference: "PO-3",
    supplierBatchReference: null,
    manufacturedOn: null,
    receivedOn: null,
    expiresOn: null,
    retestOn: null,
    status: "quarantined",
    publicVisibility: false,
  },
  {
    id: "L-X",
    slug: "l-x",
    variantId: "reta-10mg",
    internalReference: "PO-4",
    supplierBatchReference: null,
    manufacturedOn: null,
    receivedOn: null,
    expiresOn: "2026-01-01",
    retestOn: null,
    status: "in-stock",
    publicVisibility: false,
  },
];

/* ======================================================================== */
/* 1. SCHEMA — orders written before operations existed                       */
/* ======================================================================== */

{
  const created = upgradeOrder(legacyOrder("created"));
  eq(created.schema, 2, "a schema-1 order reads as schema 2");
  ok(!("status" in created), "the dormant `status` field is dropped");
  eq(created.fulfilment.state, "unfulfilled", "an unpaid legacy order is not in the queue");
  eq(
    upgradeOrder(legacyOrder("paid")).fulfilment.state,
    "queued",
    "a paid legacy order joins the queue",
  );
  eq(
    upgradeOrder(legacyOrder("refunded")).fulfilment.state,
    "cancelled",
    "a refunded one is cancelled",
  );
  const disputed = upgradeOrder(legacyOrder("disputed"));
  eq(
    [disputed.fulfilment.state, disputed.fulfilment.hold?.reason],
    ["on_hold", "payment_disputed"],
    "a disputed one is held",
  );
  eq(upgradeOrder(created), created, "upgrading is idempotent");
  eq(
    [created.shipments, created.refunds, created.cancellation],
    [[], [], null],
    "nothing is invented",
  );
}

/* ======================================================================== */
/* 2. FULFILMENT — only paid orders, only legal moves                         */
/* ======================================================================== */

{
  const unpaid = fresh("created");
  refused(
    advanceFulfilment(unpaid, "preparing", OP, at(1)),
    "not_paid",
    "an unpaid order cannot be prepared",
  );
  refused(
    advanceFulfilment(unpaid, "queued", OP, at(1)),
    "not_paid",
    "an unpaid order cannot be queued by hand",
  );

  const paid = pay(unpaid);
  eq(paid.state, "paid", "the provider's answer pays the order");
  eq(paid.fulfilment.state, "queued", "a paid order enters the queue on its own");
  ok(paid.milestones.paid && paid.milestones.queued, "paid and queued are stamped");
  eq(paid.events.at(-1).kind, "fulfilment_changed", "queueing is an event");
  eq(paid.events.at(-1).source, "system", "attributed to the system, not an operator");

  refused(
    advanceFulfilment(paid, "ready_to_ship", OP, at(2)),
    "illegal_transition",
    "queued cannot skip to ready_to_ship",
  );
  refused(
    advanceFulfilment(paid, "fulfilled", OP, at(2)),
    "illegal_transition",
    "fulfilled cannot be set by hand",
  );
  const preparing = must(advanceFulfilment(paid, "preparing", OP, at(2)), "queued → preparing");
  eq(preparing.events.at(-1).actor, "ana", "the operator is recorded on the event");
  const back = must(
    advanceFulfilment(preparing, "queued", OP, at(3)),
    "preparing → queued (reopen)",
  );
  eq(back.fulfilment.state, "queued", "a step back is allowed and recorded");
  const ready = must(
    advanceFulfilment(preparing, "ready_to_ship", OP, at(3)),
    "preparing → ready_to_ship",
  );
  refused(
    advanceFulfilment(ready, "ready_to_ship", OP, at(4)),
    "illegal_transition",
    "a double click is refused, not repeated",
  );

  const held = must(holdFulfilment(ready, "operator", OP, at(4)), "an operator can hold work");
  refused(
    advanceFulfilment(held, "preparing", OP, at(5)),
    "illegal_transition",
    "a held order cannot be advanced",
  );
  const resumed = must(resumeFulfilment(held, OP, at(5)), "a hold lifts");
  eq(resumed.fulfilment.state, "ready_to_ship", "back to where the hold began");
  refused(resumeFulfilment(resumed, OP, at(6)), "not_on_hold", "only a held order resumes");

  for (const [from, tos] of Object.entries(FULFILMENT_TRANSITIONS)) {
    if (tos.includes("fulfilled"))
      eq(from, "ready_to_ship", "only ready_to_ship leads to fulfilled");
  }
  eq(FULFILMENT_TRANSITIONS.fulfilled, [], "fulfilled is final");
  eq(FULFILMENT_TRANSITIONS.cancelled, [], "cancelled is final");
}

/* ======================================================================== */
/* 3. LOTS — traceability without inventing provenance                        */
/* ======================================================================== */

{
  const unpaid = fresh();
  refused(
    assignLot(unpaid, { line: 0, lotId: "L-A", quantity: 1 }, LOTS, OP, at(1)),
    "not_paid",
    "no lot on an unpaid order",
  );
  const paid = pay(unpaid);
  refused(
    assignLot(paid, { line: 3, lotId: "L-A", quantity: 1 }, LOTS, OP, at(2)),
    "line_not_found",
    "the line must exist",
  );
  refused(
    assignLot(paid, { line: 0, lotId: "NOPE", quantity: 1 }, LOTS, OP, at(2)),
    "lot_not_found",
    "the lot must exist",
  );
  refused(
    assignLot(paid, { line: 0, lotId: "L-B", quantity: 1 }, LOTS, OP, at(2)),
    "lot_wrong_variant",
    "a 5 mg lot cannot fill a 10 mg line",
  );
  refused(
    assignLot(paid, { line: 0, lotId: "L-Q", quantity: 1 }, LOTS, OP, at(2)),
    "lot_unavailable",
    "a quarantined lot is refused",
  );
  refused(
    assignLot(paid, { line: 0, lotId: "L-X", quantity: 1 }, LOTS, OP, at(2)),
    "lot_expired",
    "an expired lot is refused",
  );
  refused(
    assignLot(paid, { line: 0, lotId: "L-A", quantity: 3 }, LOTS, OP, at(2)),
    "lot_quantity",
    "never more than the line ordered",
  );
  refused(
    assignLot(paid, { line: 0, lotId: "L-A", quantity: 0 }, LOTS, OP, at(2)),
    "invalid_input",
    "a positive whole quantity",
  );
  const one = must(
    assignLot(paid, { line: 0, lotId: "L-A", quantity: 2 }, LOTS, OP, at(2)),
    "a matching lot is assigned",
  );
  refused(
    assignLot(one, { line: 0, lotId: "L-A", quantity: 1 }, LOTS, OP, at(3)),
    "lot_quantity",
    "the line is full",
  );
  eq(one.events.at(-1).ref, "L-A", "the event names the public lot id");
  ok(
    !JSON.stringify(one).includes("SUP-9"),
    "the supplier batch reference never reaches the order",
  );
  const none = must(
    unassignLot(one, { line: 0, lotId: "L-A" }, OP, at(3)),
    "a lot can be unassigned",
  );
  eq(none.fulfilment.lots.length, 0, "and the line is empty again");
  refused(
    unassignLot(none, { line: 0, lotId: "L-A" }, OP, at(4)),
    "lot_not_assigned",
    "nothing to unassign twice",
  );
}

/* ======================================================================== */
/* 4. SHIPMENTS — dispatch fulfils; carrier events apply once                 */
/* ======================================================================== */

{
  eq(
    safeTrackingUrl("https://example.com/t?n=1"),
    "https://example.com/t?n=1",
    "an https tracking URL is kept",
  );
  eq(safeTrackingUrl("http://example.com"), false, "http is refused");
  eq(safeTrackingUrl("javascript:alert(1)"), false, "a script URL is refused");
  eq(safeTrackingUrl("https://user:pw@example.com"), false, "credentials in the URL are refused");
  eq(safeTrackingUrl(""), null, "empty is simply absent");

  const paid = pay(fresh());
  const input = {
    provider: "manual",
    carrier: "Paquetería",
    trackingNumber: null,
    dispatched: false,
  };
  refused(recordShipment(fresh(), input, OP, at(2)), "not_paid", "no shipment for an unpaid order");
  refused(
    recordShipment(paid, input, OP, at(2)),
    "not_ready_to_ship",
    "no shipment before packing",
  );
  const ready = must(
    advanceFulfilment(
      must(advanceFulfilment(paid, "preparing", OP, at(2)), "prep"),
      "ready_to_ship",
      OP,
      at(3),
    ),
    "ready",
  );
  refused(
    recordShipment(ready, { ...input, trackingUrl: "http://x.mx" }, OP, at(4)),
    "invalid_tracking_url",
    "an unsafe tracking URL is refused",
  );
  const booked = must(recordShipment(ready, input, OP, at(4)), "a pending shipment is recorded");
  eq(shipmentSummary(booked), "pending", "the order shows it as pending");
  eq(booked.fulfilment.state, "ready_to_ship", "a booking alone does not fulfil the order");
  refused(
    recordShipment(booked, input, OP, at(5)),
    "shipment_active",
    "…and cannot be booked twice",
  );
  const s = booked.shipments[0];
  eq(s.id, `${booked.id}-S1`, "shipment ids are NEOGEN's own");

  refused(
    updateShipment(booked, s.id, "delivered", OP, at(5)),
    "illegal_transition",
    "pending cannot jump to delivered",
  );
  const out = must(updateShipment(booked, s.id, "in_transit", OP, at(5)), "dispatch");
  eq(out.fulfilment.state, "fulfilled", "dispatching fulfils the order in the same write");
  ok(out.milestones.shipped && out.milestones.fulfilled, "shipped and fulfilled are stamped");
  eq(out.shipments[0].shippedAt, at(5), "the dispatch time is recorded");

  const tracked = must(
    setTracking(out, s.id, { trackingNumber: "TRK123" }, OP, at(6)),
    "tracking after dispatch",
  );
  eq(
    tracked.shipments[0].trackingAddedAt,
    at(6),
    "tracking arriving after dispatch is marked for a message",
  );

  const ev = "carrier:TRK123:delivered";
  const delivered = must(
    updateShipment(tracked, s.id, "delivered", { source: "provider", name: null }, at(7), ev),
    "a carrier reports delivery",
  );
  refused(
    updateShipment(delivered, s.id, "delivered", { source: "provider", name: null }, at(8), ev),
    "duplicate",
    "the same carrier event applies once",
  );
  eq(delivered.milestones.delivered, at(7), "delivered is stamped");
  refused(
    cancelOrder(delivered, "customer_request", OP, at(9)),
    "already_dispatched",
    "a delivered order cannot be cancelled — that is a return",
  );
  eq(SHIPMENT_TRANSITIONS.cancelled, [], "a cancelled booking is final");

  const dispatchedAtOnce = must(
    recordShipment(ready, { ...input, dispatched: true, trackingNumber: "T9" }, OP, at(4)),
    "record an already-dispatched parcel",
  );
  eq(
    [dispatchedAtOnce.fulfilment.state, shipmentSummary(dispatchedAtOnce)],
    ["fulfilled", "in_transit"],
    "recorded and fulfilled together",
  );
  eq(
    dispatchedAtOnce.shipments[0].trackingAddedAt,
    null,
    "tracking present at dispatch owes no separate message",
  );
}

/* ======================================================================== */
/* 5. CANCEL AND REFUND — money is never claimed, only requested              */
/* ======================================================================== */

{
  const unpaid = fresh();
  const c1 = must(
    cancelOrder(unpaid, "payment_not_completed", OP, at(1)),
    "an unpaid order is cancelled",
  );
  eq(
    [c1.state, c1.fulfilment.state, c1.refunds.length],
    ["cancelled", "cancelled", 0],
    "payment cancelled, nothing to refund",
  );
  refused(
    cancelOrder(c1, "customer_request", OP, at(2)),
    "already_cancelled",
    "cancelling twice is refused",
  );

  const inFlight = { ...fresh(), state: "payment_processing" };
  refused(
    cancelOrder(inFlight, "customer_request", OP, at(1)),
    "payment_in_flight",
    "money in flight blocks cancellation",
  );

  const paid = pay(fresh());
  const c2 = must(cancelOrder(paid, "customer_request", OP, at(2)), "a paid order is cancelled");
  eq(c2.state, "paid", "cancelling does NOT change the payment state");
  eq(c2.fulfilment.state, "cancelled", "work stops");
  eq(
    [c2.refunds.length, c2.refunds[0].status, c2.refunds[0].amount.amount],
    [1, "requested", 12000],
    "a full refund is REQUESTED",
  );
  ok(attentionReasons(c2).includes("refund_open"), "and an operator is asked to act");
  refused(
    requestRefund(c2, "customer_request", OP, at(3)),
    "refund_open",
    "one open refund at a time",
  );

  const submitted = must(markRefundSubmitted(c2, c2.refunds[0].id, OP, at(3)), "submitted");
  eq(submitted.state, "paid", "submitting to the provider still claims nothing");
  ok(
    attentionReasons(submitted).includes("refund_unconfirmed"),
    "an unconfirmed refund stays flagged",
  );
  refused(
    markRefundSubmitted(submitted, c2.refunds[0].id, OP, at(4)),
    "refund_state",
    "submitted twice is refused",
  );

  const confirmed = providerMoves(submitted, "refunded", at(5));
  eq(confirmed.refunds[0].status, "confirmed", "only the provider's `refunded` confirms it");
  eq(attentionReasons(confirmed), [], "and the flags clear");

  const failed = must(
    markRefundFailed(c2, c2.refunds[0].id, "provider_error", OP, at(3)),
    "a failed submission is recorded",
  );
  eq(failed.refunds[0].status, "failed", "as failed, retryable");
  ok(
    must(markRefundSubmitted(failed, c2.refunds[0].id, OP, at(4)), "retry after failure"),
    "a failed refund can be retried",
  );

  /* A refund made at the provider directly, with no NEOGEN request. */
  const preparing = must(advanceFulfilment(pay(fresh()), "preparing", OP, at(2)), "prep");
  const direct = providerMoves(preparing, "refunded", at(3));
  eq(
    [direct.refunds.length, direct.refunds[0].status],
    [1, "confirmed"],
    "a provider-side refund is recorded as confirmed",
  );
  eq(
    [direct.fulfilment.state, direct.cancellation?.reason],
    ["cancelled", "payment_refunded"],
    "undispatched work is cancelled",
  );

  /* A refund after dispatch restores nothing and cancels nothing. */
  const readyO = must(
    advanceFulfilment(
      must(advanceFulfilment(pay(fresh()), "preparing", OP, at(2)), "p"),
      "ready_to_ship",
      OP,
      at(3),
    ),
    "r",
  );
  const shipped = must(
    recordShipment(readyO, { provider: "manual", dispatched: true }, OP, at(4)),
    "shipped",
  );
  const late = providerMoves(shipped, "refunded", at(5));
  eq(
    [late.fulfilment.state, shipmentSummary(late)],
    ["fulfilled", "in_transit"],
    "a parcel already out keeps its state",
  );
  eq(desiredHold(late), "consumed", "and its stock stays consumed");
  ok(attentionReasons(late).includes("refunded_after_dispatch"), "an operator is told");
  const acked = must(
    acknowledgeAttention(late, "refunded_after_dispatch", OP, at(6)),
    "acknowledge",
  );
  ok(
    !attentionReasons(acked).includes("refunded_after_dispatch"),
    "an acknowledgement clears an event reason",
  );
  refused(
    acknowledgeAttention(acked, "payment_disputed", OP, at(7)),
    "invalid_input",
    "a STATE reason cannot be acknowledged away",
  );

  /* A pending booking is cancelled with the order. */
  const bookedO = must(
    recordShipment(readyO, { provider: "manual", dispatched: false }, OP, at(4)),
    "booked",
  );
  const c3 = must(
    cancelOrder(bookedO, "customer_request", OP, at(5)),
    "cancel with a pending booking",
  );
  eq(c3.shipments[0].state, "cancelled", "the uncollected booking is cancelled too");
}

/* ======================================================================== */
/* 6. DISPUTES — work stops, and resumes only when the dispute is won         */
/* ======================================================================== */

{
  const preparing = must(advanceFulfilment(pay(fresh()), "preparing", OP, at(2)), "prep");
  const disputed = providerMoves(preparing, "disputed", at(3));
  eq(
    [disputed.fulfilment.state, disputed.fulfilment.hold?.reason],
    ["on_hold", "payment_disputed"],
    "a chargeback holds the work",
  );
  refused(
    resumeFulfilment(disputed, OP, at(4)),
    "not_paid",
    "an operator cannot lift a dispute hold",
  );
  refused(
    requestRefund(disputed, "customer_request", OP, at(4)),
    "payment_disputed",
    "no refund on top of a chargeback",
  );
  eq(desiredHold(disputed), "held", "the stock stays reserved while it is decided");
  const won = providerMoves(disputed, "paid", at(5));
  eq(won.fulfilment.state, "preparing", "a dispute resolved in NEOGEN's favour resumes the work");
  const c = must(
    cancelOrder(disputed, "fraud_suspected", OP, at(4)),
    "a disputed order can be cancelled",
  );
  eq(c.refunds.length, 0, "without a refund — the dispute is already moving the money");
}

/* ======================================================================== */
/* 7. ATTENTION AND VIEWS                                                     */
/* ======================================================================== */

{
  const cols = (o, now) => orderColumns(o, now);
  const paid = pay(fresh());
  ok(matchesView(cols(paid), "to_fulfil"), "a paid, queued order is ready for fulfilment");
  ok(!matchesView(cols(paid), "awaiting_payment"), "…and not awaiting payment");
  ok(matchesView(cols(fresh()), "awaiting_payment"), "a new order awaits payment");
  ok(
    !matchesView(
      cols(must(cancelOrder(fresh(), "payment_not_completed", OP, at(1)), "c")),
      "awaiting_payment",
    ),
    "a cancelled unpaid order no longer awaits payment",
  );
  ok(
    ORDER_VIEWS.every((v) => typeof v === "string") && ORDER_VIEWS.includes("all"),
    "views are enumerated",
  );

  const stalled = { ...fresh(), state: "payment_processing", providerRef: "ORD-1", updatedAt: T0 };
  eq(attentionReasons(stalled), [], "without a clock, a processing payment is not stalled");
  ok(
    attentionReasons(stalled, at(31)).includes("payment_stalled"),
    "unsettled for 30 minutes needs a look",
  );
  ok(matchesView(cols(stalled, at(31)), "attention"), "and shows under attention");

  const noted = must(addNote(paid, "  Cliente llamó  ", OP, at(3)), "note");
  eq(noted.notes[0].text, "Cliente llamó", "notes are trimmed and kept internal");
  refused(addNote(paid, "   ", OP, at(3)), "invalid_input", "an empty note is refused");
  const ext = must(
    addExternalReference(paid, { system: "erp", ref: "SO-1" }, OP, at(3)),
    "external ref",
  );
  refused(
    addExternalReference(ext, { system: "erp", ref: "SO-1" }, OP, at(4)),
    "duplicate",
    "an external reference is recorded once",
  );
  refused(
    addExternalReference(paid, { system: "Bad System", ref: "x" }, OP, at(4)),
    "invalid_input",
    "system names are codes",
  );
  eq(ext.id, paid.id, "an external id never replaces NEOGEN's order id");
}

/* ======================================================================== */
/* 8. INVENTORY — memory: tracking is opt-in, holds are all-or-nothing        */
/* ======================================================================== */

async function inventorySuite(store, label) {
  const count = (variantId, quantity, id) =>
    store.adjust({
      id,
      variantId,
      mode: "count",
      quantity,
      reason: "initial_count",
      lotId: null,
      actor: "ana",
      note: null,
      at: T0,
    });

  eq(
    (await store.hold("O-UNTRACKED", [{ variantId: "ghost-1mg", quantity: 50 }], T0)).ok,
    true,
    `${label}: an untracked SKU is never limited`,
  );
  eq(await store.level("ghost-1mg"), null, `${label}: and holding it creates no stock record`);
  refused(
    await store.adjust({
      id: "adj-0",
      variantId: "ghost-1mg",
      mode: "adjustment",
      quantity: 5,
      reason: "receipt",
      lotId: null,
      actor: "ana",
      note: null,
      at: T0,
    }),
    "untracked",
    `${label}: a delta needs a first count`,
  );
  refused(
    await count("reta-10mg", -1, "c-bad"),
    "invalid",
    `${label}: a negative count is refused`,
  );

  const c = await count("reta-10mg", 5, "c-1");
  eq(
    [c.ok, c.level.onHand, c.level.reserved],
    [true, 5, 0],
    `${label}: a first count starts tracking`,
  );
  eq(
    (await count("reta-10mg", 99, "c-1")).duplicate,
    true,
    `${label}: a retried count is recorded once`,
  );
  eq((await store.level("reta-10mg")).onHand, 5, `${label}: and changes nothing`);
  await count("reta-5mg", 1, "c-2");

  /* All or nothing: one short line refuses the whole order. */
  const mixed = await store.hold(
    "O-MIX",
    [
      { variantId: "reta-10mg", quantity: 2 },
      { variantId: "reta-5mg", quantity: 2 },
    ],
    T0,
  );
  eq(mixed.ok, false, `${label}: one short line refuses the order`);
  eq(
    mixed.short,
    [{ variantId: "reta-5mg", requested: 2, available: 1 }],
    `${label}: and says which, with what is available`,
  );
  eq(
    (await store.level("reta-10mg")).reserved,
    0,
    `${label}: nothing was reserved for the other line`,
  );

  /* THE RACE: 12 orders for 1 unit each, 5 units on the shelf. */
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      store.hold(`O-RACE-${i}`, [{ variantId: "reta-10mg", quantity: 1 }], T0),
    ),
  );
  eq(
    results.filter((r) => r.ok).length,
    5,
    `${label}: 12 concurrent checkouts for 5 units — exactly 5 win`,
  );
  const level = await store.level("reta-10mg");
  eq([level.onHand, level.reserved], [5, 5], `${label}: nothing oversold, nothing lost`);

  eq(
    (await store.hold("O-RACE-0", [{ variantId: "reta-10mg", quantity: 1 }], T0)).ok,
    true,
    `${label}: holding an order already held is a no-op`,
  );
  eq((await store.level("reta-10mg")).reserved, 5, `${label}: …that reserves nothing twice`);

  refused(
    await store.adjust({
      id: "adj-dmg",
      variantId: "reta-10mg",
      mode: "adjustment",
      quantity: -1,
      reason: "damaged",
      lotId: null,
      actor: "ana",
      note: null,
      at: T0,
    }),
    "below_reserved",
    `${label}: stock promised to orders cannot be written off`,
  );

  await store.release("O-RACE-0", at(1));
  await store.release("O-RACE-0", at(2));
  eq(
    (await store.level("reta-10mg")).reserved,
    4,
    `${label}: a release gives back once, however often it runs`,
  );
  eq(
    (await store.hold("O-RACE-11", [{ variantId: "reta-10mg", quantity: 1 }], at(3))).ok,
    true,
    `${label}: the released unit can be sold again`,
  );

  await store.consume("O-RACE-1", [{ variantId: "reta-10mg", quantity: 1 }], at(4));
  await store.consume("O-RACE-1", [{ variantId: "reta-10mg", quantity: 1 }], at(5));
  const after = await store.level("reta-10mg");
  eq(
    [after.onHand, after.reserved],
    [4, 4],
    `${label}: dispatch takes the unit off the shelf once`,
  );
  await store.release("O-RACE-1", at(6));
  eq(
    (await store.level("reta-10mg")).reserved,
    4,
    `${label}: a consumed hold is not released afterwards`,
  );

  const moves = await store.movements({ orderId: "O-RACE-1" });
  eq(
    moves.map((m) => m.kind).sort(),
    ["consume", "hold"],
    `${label}: the ledger records hold and consume for the order`,
  );
  ok(
    (await store.movements({ variantId: "reta-10mg" })).some(
      (m) => m.reason === "initial_count" && m.actor === "ana",
    ),
    `${label}: counts are attributed`,
  );
}

__resetInventory();
await inventorySuite(memoryInventoryStore, "memory");

/* The order → shelf mapping. */
{
  const o = fresh();
  eq(desiredHold(o), "released", "an order nobody is paying for holds nothing");
  eq(desiredHold({ ...o, state: "payment_processing" }), "held", "money in flight holds the stock");
  eq(desiredHold({ ...o, state: "payment_failed" }), "released", "a failed payment gives it back");
  eq(desiredHold(pay(o)), "held", "a paid order keeps it");
  eq(
    desiredHold(must(cancelOrder(pay(fresh()), "customer_request", OP, at(2)), "c")),
    "released",
    "cancelling before dispatch releases it",
  );
  eq(
    holdLines({ ...o, lines: [...o.lines, { ...o.lines[0], quantity: 1 }] }),
    [{ variantId: "reta-10mg", quantity: 3 }],
    "a SKU listed twice is held as one",
  );
}

/* ======================================================================== */
/* 9. POSTGRES — the same, on a real engine                                   */
/* ======================================================================== */

const { PGlite } = await import("@electric-sql/pglite");
const db = new PGlite();
const client = {
  async query(text, params) {
    const r = await db.query(text, params ? [...params] : []);
    return { rows: r.rows };
  },
  async transaction(fn) {
    return db.transaction(async (tx) =>
      fn({
        async query(text, params) {
          const r = await tx.query(text, params ? [...params] : []);
          return { rows: r.rows };
        },
        transaction: (inner) => inner(this),
      }),
    );
  },
};
{
  const dir = path.resolve(import.meta.dirname, "../db/migrations");
  const sqlText = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
  /* A row written by the Phase-t schema, before 002 existed. */
  await db.exec(readFileSync(path.join(dir, "001_orders.sql"), "utf8"));
  const legacy = legacyOrder("paid");
  await db.query(
    `insert into neogen_orders (id, version, state, provider, provider_ref, total_amount, created_at, updated_at, data)
     values ($1, 1, 'paid', 'mercadopago', 'ORD-MP-1', 12000, $2, $2, $3::jsonb)`,
    [legacy.id, T0, JSON.stringify({ ...legacy, version: undefined })],
  );
  await db.exec(sqlText);
  await db.exec(sqlText);
  passed += 1; /* every migration applies twice without error */
  const row = (
    await db.query(`select fulfilment_state, shipment_state from neogen_orders where id = $1`, [
      legacy.id,
    ])
  ).rows[0];
  eq(
    [row.fulfilment_state, row.shipment_state],
    ["queued", "not_shipped"],
    "002 backfills existing rows the way `upgradeOrder` reads them",
  );

  const repo = createPostgresOrderRepository(client);
  const read = await repo.get(legacy.id);
  eq([read.schema, read.fulfilment.state], [2, "queued"], "a legacy row reads back upgraded");

  const readyish = must(advanceFulfilment(read, "preparing", OP, at(2)), "prep");
  ok((await repo.save(readyish)).ok, "an operations change persists");
  const now = at(60);
  eq(
    (await repo.list({ view: "preparing", now })).orders.map((o) => o.id),
    [legacy.id],
    "the preparing view finds it",
  );
  eq(
    (await repo.list({ view: "to_fulfil", now })).orders.length,
    0,
    "and the queue no longer does",
  );
  eq(
    (await repo.list({ view: "all", search: legacy.id.slice(0, 7).toLowerCase(), now })).orders
      .length,
    1,
    "search by order-id prefix, case-insensitive",
  );
  eq(
    (await repo.list({ view: "all", search: "CLIENTE@example.mx", now })).orders.length,
    1,
    "search by exact email, case-insensitive",
  );
  eq(
    (await repo.list({ view: "all", search: "cliente@", now })).orders.length,
    0,
    "an email is matched exactly, never partially",
  );
  eq(
    (await repo.list({ view: "all", search: "%", now })).orders.length,
    0,
    "LIKE wildcards in a search are literal",
  );
  const counts = await repo.counts(now);
  eq(
    [counts.all, counts.preparing, counts.to_fulfil],
    [1, 1, 0],
    "counts per view agree with the lists",
  );

  const stalledOrder = {
    ...upgradeOrder(legacyOrder("created")),
    state: "payment_processing",
    providerRef: "ORD-STALL",
    provider: "mercadopago",
  };
  await repo.create(stalledOrder);
  eq(
    (await repo.list({ view: "attention", now: at(10) })).orders.length,
    0,
    "a fresh processing payment is not flagged",
  );
  eq(
    (await repo.list({ view: "attention", now: at(45) })).orders.map((o) => o.id),
    [stalledOrder.id],
    "a stalled one is, from SQL alone",
  );

  await inventorySuite(createPostgresInventoryStore(client), "postgres");

  const outbox = createPostgresOutbox(client);
  const paidO = pay(fresh());
  const owed = messagesOwed(paidO, () => "Calle 1");
  const first = await dispatch(owed, outbox, noneChannel);
  eq(
    first.map((r) => r.status),
    ["queued", "queued"],
    "postgres outbox: owed messages are queued, not sent",
  );
  const again = await dispatch(owed, outbox, noneChannel);
  eq(
    again.map((r) => r.status),
    ["queued", "queued"],
    "postgres outbox: re-dispatch queues nothing new",
  );
  eq((await outbox.forOrder(paidO.id)).length, 2, "postgres outbox: one row per message, ever");
  ok(
    (await outbox.forOrder(paidO.id)).every(
      (e) => e.status === "pending" && e.providerMessageId === null,
    ),
    "nothing is marked sent without a provider",
  );
}

/* ======================================================================== */
/* 10. NOTIFICATIONS — owed by state, never spammed                           */
/* ======================================================================== */

{
  const kinds = (o) => messagesOwed(o, () => "Calle 1").map((m) => m.kind);
  eq(kinds(fresh()), [], "an unpaid order is owed nothing");
  eq(
    kinds(must(cancelOrder(fresh(), "payment_not_completed", OP, at(1)), "c")),
    [],
    "cancelling an unpaid order emails nobody",
  );
  const paid = pay(fresh());
  eq(
    kinds(paid),
    ["order.placed.customer", "order.placed.internal"],
    "payment confirmed → the order-placed pair",
  );
  const prep = must(advanceFulfilment(paid, "preparing", OP, at(2)), "p");
  eq(kinds(prep), kinds(paid), "preparing is not a message");
  const ready = must(advanceFulfilment(prep, "ready_to_ship", OP, at(3)), "r");
  const out = must(
    recordShipment(ready, { provider: "manual", dispatched: true }, OP, at(4)),
    "out",
  );
  ok(kinds(out).includes("order.shipped.customer"), "dispatch → shipped");
  const tracked = must(
    setTracking(out, out.shipments[0].id, { trackingNumber: "T1" }, OP, at(5)),
    "t",
  );
  ok(kinds(tracked).includes("order.tracking.customer"), "late tracking → its own message");
  const shippedMsg = messagesOwed(tracked, () => "").find(
    (m) => m.kind === "order.shipped.customer",
  );
  eq(shippedMsg.recipient.role, "customer", "shipping messages go to the customer");
  ok(!("fulfilment" in shippedMsg), "and do not carry the address back");
  const cancelled = must(cancelOrder(paid, "customer_request", OP, at(2)), "c");
  ok(
    kinds(cancelled).includes("order.cancelled.customer"),
    "a paid customer is told of a cancellation",
  );
  ok(
    !kinds(cancelled).includes("order.refunded.customer"),
    "a refund REQUEST is not a refund message",
  );
  const refunded = providerMoves(cancelled, "refunded", at(3));
  ok(kinds(refunded).includes("order.refunded.customer"), "the provider's confirmation is");
  const disputed = providerMoves(paid, "disputed", at(3));
  eq(
    messagesOwed(disputed, () => "").find((m) => m.kind === "order.disputed.internal")?.recipient,
    { role: "internal" },
    "a dispute goes to operations only",
  );

  const ids = messagesOwed(tracked, () => "").map((m) => m.id);
  eq(
    messagesOwed(tracked, () => "").map((m) => m.id),
    ids,
    "message ids are stable — the basis of dedup",
  );
  eq(new Set(ids).size, ids.length, "and unique");

  __resetOutbox();
  const outbox = memoryOutbox();
  await dispatch(
    messagesOwed(paid, () => ""),
    outbox,
    noneChannel,
  );
  await dispatch(
    messagesOwed(tracked, () => ""),
    outbox,
    noneChannel,
  );
  eq(
    (await outbox.forOrder(paid.id)).length,
    4,
    "four owed messages, queued once each across two changes",
  );
  eq(noneChannel.isConfigured(), false, "no email provider is configured");
}

/* ======================================================================== */
/* 11. SHIPPING PROVIDER — honest absence                                     */
/* ======================================================================== */

{
  eq(noneShippingProvider.isConfigured(), false, "no carrier is integrated");
  for (const call of ["quote", "createShipment", "getLabel", "getTracking", "cancelShipment"]) {
    const r = await noneShippingProvider[call](fresh(), {}, "", "");
    eq(
      [r.ok, r.error?.code],
      [false, "unconfigured"],
      `shipping ${call} answers unconfigured, never a made-up value`,
    );
  }
}

/* ======================================================================== */
/* 12. CUSTOMER VIEW — never a step the order has not reached                 */
/* ======================================================================== */

{
  const { customerView } = await import("../src/domain/order/customer.ts");
  const steps = (o) =>
    customerView(o)
      .steps?.map((s) => `${s.id}:${s.status}`)
      .join(" ") ?? null;
  eq(customerView(fresh()).headline, "unpaid", "an unpaid order says so");
  eq(steps(fresh()), null, "and draws no progress bar");
  const paid = pay(fresh());
  eq(customerView(paid).headline, "confirmed", "paid → confirmed");
  eq(
    steps(paid),
    "paid:done preparing:upcoming shipped:upcoming delivered:upcoming",
    "paying does not make anything shipped",
  );
  const prep = must(advanceFulfilment(paid, "preparing", OP, at(2)), "p");
  eq(
    steps(prep),
    "paid:done preparing:current shipped:upcoming delivered:upcoming",
    "preparing is the current step",
  );
  const ready = must(advanceFulfilment(prep, "ready_to_ship", OP, at(3)), "r");
  eq(
    [customerView(ready).headline, steps(ready)],
    ["ready", "paid:done preparing:current shipped:upcoming delivered:upcoming"],
    "ready to ship is still preparing to a customer",
  );
  const out = must(
    recordShipment(
      ready,
      { provider: "manual", dispatched: true, trackingNumber: "T1" },
      OP,
      at(4),
    ),
    "o",
  );
  eq(
    steps(out),
    "paid:done preparing:done shipped:current delivered:upcoming",
    "dispatch → on its way",
  );
  eq(customerView(out).shipment?.trackingNumber, "T1", "with its tracking");
  const del = must(updateShipment(out, out.shipments[0].id, "delivered", OP, at(5)), "d");
  eq(
    steps(del),
    "paid:done preparing:done shipped:done delivered:done",
    "delivered completes the bar",
  );
  const held = must(holdFulfilment(prep, "stock_short", OP, at(3)), "h");
  eq(
    [customerView(held).headline, steps(held)],
    ["review", null],
    "a hold is 'under review', with no internal reason and no bar",
  );
  const cancelled = must(cancelOrder(paid, "customer_request", OP, at(2)), "c");
  eq(
    [customerView(cancelled).headline, customerView(cancelled).refund?.status],
    ["cancelled", "requested"],
    "a cancelled paid order shows its refund as not yet confirmed",
  );
  eq(
    customerView(providerMoves(prep, "disputed", at(4))).headline,
    "disputed",
    "a dispute is stated, not hidden",
  );
}

/* ======================================================================== */
/* 13. GUEST ACCESS — a link that cannot be guessed, forged or moved          */
/* ======================================================================== */

{
  const { accessToken, verifyAccessToken } = await import("../src/server/orderAccess.ts");
  const KEY = "k".repeat(40);
  const a = { id: "NG-AAAA-001", access: { nonce: "nonce-a-0123456789abcdef" } };
  const b = { id: "NG-BBBB-002", access: { nonce: "nonce-b-0123456789abcdef" } };
  const t = accessToken(a, KEY);
  ok(/^[A-Za-z0-9_-]{43}$/.test(t), "a token is 256 bits, base64url");
  ok(verifyAccessToken(a, t, KEY), "it opens its own order");
  ok(!verifyAccessToken(b, t, KEY), "it does not open another order");
  ok(
    !verifyAccessToken({ ...a, access: { nonce: "rotated" } }, t, KEY),
    "rotating the nonce revokes it",
  );
  ok(!verifyAccessToken(a, t, "x".repeat(40)), "another secret cannot verify it");
  ok(
    !verifyAccessToken(a, t.slice(0, -1) + (t.at(-1) === "A" ? "B" : "A"), KEY),
    "a one-character change fails",
  );
  ok(!verifyAccessToken(a, null, KEY) && !verifyAccessToken(a, "", KEY), "no token, no access");
  eq(accessToken(a, null), null, "without a secret, no link is issued");
  eq(
    accessToken({ id: "NG-X-001", access: null }, KEY),
    null,
    "an order without a nonce has no link",
  );
  ok(
    !t.includes(a.id) && !t.includes(a.access.nonce),
    "the token reveals neither the order nor the nonce",
  );
}

/* ======================================================================== */
/* 14. OPERATOR SIGN-IN — scrypt, signed session, lockout                     */
/* ======================================================================== */

{
  const { randomBytes } = await import("node:crypto");
  const auth = await import("../src/server/ops/auth.ts");
  const salt = randomBytes(16);
  const entry = `ana:${salt.toString("base64url")}:${auth.hashPassword("correct horse battery", salt).toString("base64url")}`;
  const accounts = auth.parseAccounts(`${entry}, broken:entry, Bad:x:y`);
  eq(
    accounts.map((x) => x.name),
    ["ana"],
    "only well-formed accounts are read",
  );
  eq(
    auth.verifyPassword(accounts, "ana", "correct horse battery"),
    "ana",
    "the right password signs in",
  );
  eq(
    auth.verifyPassword(accounts, "ANA ", "correct horse battery"),
    "ana",
    "names are case- and space-insensitive",
  );
  eq(
    auth.verifyPassword(accounts, "ana", "correct horse batterY"),
    null,
    "a wrong password does not",
  );
  eq(
    auth.verifyPassword(accounts, "nobody", "correct horse battery"),
    null,
    "an unknown name does not",
  );

  const KEY = "s".repeat(40);
  const now = Date.parse(T0);
  const cookie = auth.issueSession("ana", KEY, now);
  eq(auth.readSession(cookie, KEY, accounts, now + 1000), "ana", "a fresh session reads back");
  eq(
    auth.readSession(cookie, KEY, accounts, now + 13 * 3600_000),
    null,
    "it expires after 12 hours",
  );
  eq(auth.readSession(cookie, "t".repeat(40), accounts, now), null, "a rotated secret revokes it");
  eq(auth.readSession(cookie, KEY, [], now), null, "removing the account revokes it");
  const [payload, sig] = cookie.split(".");
  const forged = Buffer.from(JSON.stringify({ n: "ana", e: now + 99e9 })).toString("base64url");
  eq(
    auth.readSession(`${forged}.${sig}`, KEY, accounts, now),
    null,
    "an edited payload fails the signature",
  );
  eq(auth.readSession(`${payload}.`, KEY, accounts, now), null, "a missing signature fails");
  eq(auth.readSession(undefined, KEY, accounts, now), null, "no cookie, no session");

  auth.__resetLockout();
  const keys = ["ip:1.2.3.4", "name:ana"];
  for (let i = 0; i < 4; i += 1) auth.recordFailure(keys, now);
  ok(!auth.isLocked(keys, now), "four failures do not lock");
  auth.recordFailure(keys, now);
  ok(auth.isLocked(keys, now), "the fifth locks the name and the address");
  ok(!auth.isLocked(keys, now + 16 * 60_000), "for 15 minutes");
  auth.clearFailures(keys);
  ok(!auth.isLocked(keys, now), "a successful sign-in clears the count");

  delete process.env.OPS_ACCOUNTS;
  delete process.env.OPS_SESSION_SECRET;
  eq(auth.opsConfigured(), false, "without configuration the console is off (every route 404s)");
  process.env.OPS_ACCOUNTS = entry;
  process.env.OPS_SESSION_SECRET = "short";
  eq(auth.opsConfigured(), false, "a short session secret keeps it off");
  delete process.env.OPS_ACCOUNTS;
  delete process.env.OPS_SESSION_SECRET;
}

/* ======================================================================== */
/* 15. EMAIL — escaped, restrained, and never a promise                       */
/* ======================================================================== */

{
  const { renderEmail, escapeHtml } = await import("../src/domain/notifications/render.ts");
  const { EMAIL_COPY } = await import("../src/domain/notifications/copy.ts");
  eq(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;", "HTML is escaped");
  const ctx = {
    statusUrl: "https://neogen.mx/es/pedido/NG-1/acceso?t=abc",
    phoneDisplay: "+52 33",
    phoneHref: "tel:+5233",
  };
  const hostile = pay(
    upgradeOrder({
      ...legacyOrder(),
      contact: { email: "x@y.mx", name: "<script>alert(1)</script>", phone: "52" },
    }),
  );
  const [placed] = messagesOwed(hostile, () => "Calle 1");
  const r = renderEmail(placed, ctx);
  ok(!r.html.includes("<script>"), "a customer-supplied name cannot inject markup");
  ok(r.html.includes("&lt;script&gt;"), "it is shown escaped");
  ok(
    !/<img|<script|<link|@import|url\(/i.test(r.html.replace(/&lt;script&gt;/g, "")),
    "no images, scripts, trackers or remote styles",
  );
  ok(r.text.includes(hostile.id) && r.html.includes(hostile.id), "both parts carry the reference");
  ok(
    r.html.includes(ctx.statusUrl.replace(/&/g, "&amp;")),
    "the signed status link is included when configured",
  );
  const noLink = renderEmail(placed, { ...ctx, statusUrl: null });
  ok(
    !noLink.html.includes("/acceso") && noLink.text.includes(EMAIL_COPY.es.statusLinkAbsent),
    "without it, the email says to keep the reference",
  );
  ok(
    !renderEmail(placed, { ...ctx, statusUrl: "http://evil.example/x" }).html.includes(
      "evil.example",
    ),
    "a non-https link is never placed in an email",
  );
  const internal = messagesOwed(hostile, () => "Calle 1").find(
    (m) => m.recipient.role === "internal",
  );
  const ri = renderEmail(internal, ctx);
  ok(
    ri.html.includes("Calle 1") && !ri.html.includes("/acceso"),
    "the internal email has the address and no customer link",
  );

  /* No delivery promises, dates or guarantees in any template, either language. */
  const all = JSON.stringify(EMAIL_COPY, (_k, v) =>
    typeof v === "function" ? v("NG-X") + v.toString() : v,
  );
  for (const banned of [
    /garantiz/i,
    /guarante/i,
    /\b24 ?h/i,
    /mismo día|same[- ]day/i,
    /llegará el|will arrive on/i,
    /\bcura|\bcure|tratamiento|treatment|dosis|dosage/i,
  ]) {
    ok(!banned.test(all), `email copy makes no promise or claim matching ${banned}`);
  }
  for (const kind of Object.keys(EMAIL_COPY.es.kinds)) {
    ok(kind in EMAIL_COPY.en.kinds, `${kind} exists in English too`);
  }
}

/* ======================================================================== */
/* 16. ANALYTICS — the funnel carries no personal data                       */
/* ======================================================================== */

{
  const { sanitize, FUNNEL_EVENTS, noneSink } = await import("../src/analytics/events.ts");
  eq(FUNNEL_EVENTS.length, 6, "six funnel events");
  eq(noneSink.isConfigured(), false, "no analytics product is integrated");
  const leaky = sanitize({
    name: "purchase_completed",
    value: 12000,
    items: [{ sku: "reta-10mg", quantity: 2, price: 6000, name: "Cliente", email: "a@b.mx" }],
    email: "a@b.mx",
    address: "Calle 1",
    orderId: "NG-X-001",
  });
  eq(
    leaky,
    {
      name: "purchase_completed",
      items: [{ sku: "reta-10mg", quantity: 2, price: 6000 }],
      value: 12000,
    },
    "undeclared fields — email, address, order id — are dropped",
  );
  eq(
    sanitize({ name: "bag_added", item: { sku: "<script>", quantity: 1, price: 1 } }),
    null,
    "a malformed SKU is refused",
  );
  eq(
    sanitize({ name: "checkout_progressed", step: "payment-card-number" }),
    null,
    "only named steps",
  );
  const { noneInvoiceProvider } = await import("../src/domain/invoicing/types.ts");
  eq((await noneInvoiceProvider.issue()).ok, false, "no invoicing provider is integrated");
}

/* ---- report --------------------------------------------------------------- */

await db.close();
if (failures.length) {
  console.error(`\noperations check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `operations check passed — ${passed} assertions: fulfilment, lots, shipments, cancellations, ` +
    `refunds, disputes, attention, inventory (memory + Postgres), notifications`,
);
