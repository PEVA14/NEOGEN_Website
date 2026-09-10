/**
 * COMMERCE INVARIANTS.
 *
 * The bag and the order state machine are pure functions over data, which
 * makes them the one part of this codebase that can be checked properly
 * without a browser. These are the properties a shop must not get wrong:
 * money that does not add up, a quantity that escapes its limits, an order
 * that can be un-paid by a redelivered webhook.
 *
 *   npm run check:commerce
 */
import {
  addLine,
  clampQuantity,
  EMPTY_BAG,
  reconcile,
  removeLine,
  setQuantity,
  totals,
} from "../src/domain/bag/index.ts";
import {
  bagToLines,
  canTransition,
  createOrder,
  isSettled,
  newOrderId,
  quoteTotals,
  transition,
  TRANSITIONS,
} from "../src/domain/order/index.ts";
import { ORDER_LIMITS } from "../src/data/commerce/limits.ts";
import { siteConfig } from "../src/config/site.ts";
import { activeProvider, bagEnabled, paymentAvailable } from "../src/payments/index.ts";

const failures = [];
const fail = (what, detail) => failures.push(`${what}: ${detail}`);
const eq = (actual, expected, what) => {
  if (actual !== expected) fail(what, `expected ${expected}, got ${actual}`);
};

const mxn = (amount) => ({ amount, currency: "MXN" });
const line = (variantId, amount) => ({
  variantId,
  slug: variantId.replace(/-\d+.*$/, ""),
  name: variantId,
  presentation: "10 mg",
  unitPrice: mxn(amount),
});

/* ---- quantity limits --------------------------------------------------- */

eq(clampQuantity(0), ORDER_LIMITS.min, "clamp below minimum");
eq(clampQuantity(-5), ORDER_LIMITS.min, "clamp negative");
eq(clampQuantity(1000), ORDER_LIMITS.max, "clamp above maximum");
eq(clampQuantity(2.6), 3, "clamp rounds");
eq(clampQuantity(Number.NaN), ORDER_LIMITS.min, "clamp NaN");

/* ---- bag arithmetic ---------------------------------------------------- */

let bag = addLine(EMPTY_BAG, line("a-5mg", 4000), 2);
eq(bag.count, 2, "count after add");
eq(bag.lines.length, 1, "one line after add");

/* Adding the same variant MERGES — two lines for one thing is a bug the
   customer would have to clean up. */
bag = addLine(bag, line("a-5mg", 4000), 3);
eq(bag.lines.length, 1, "same variant merges into one line");
eq(bag.count, 5, "merged quantity");

/* A different presentation of the same product is a different line. */
bag = addLine(bag, line("a-10mg", 5900), 1);
eq(bag.lines.length, 2, "different variant is a separate line");
eq(bag.count, 6, "count across lines");

eq(totals(bag).subtotal.amount, 4000 * 5 + 5900, "subtotal");

/* Dropping to zero removes rather than leaving an empty line. */
bag = setQuantity(bag, "a-10mg", 0);
eq(bag.lines.length, 1, "zero quantity removes the line");

bag = setQuantity(bag, "a-5mg", 1000);
eq(bag.lines[0].quantity, ORDER_LIMITS.max, "setQuantity respects the ceiling");

eq(removeLine(bag, "a-5mg").count, 0, "remove empties the bag");
eq(removeLine(bag, "nope").count, bag.count, "removing an absent line is a no-op");

/* ---- free shipping ----------------------------------------------------- */

const threshold = siteConfig.fulfilment.freeShippingThreshold;
const below = addLine(EMPTY_BAG, line("b-5mg", threshold - 1000), 1);
const above = addLine(EMPTY_BAG, line("b-5mg", threshold), 1);

const tBelow = totals(below);
const tAbove = totals(above);

if (tBelow.shipping !== null) {
  fail("shipping must be null below the threshold", `got ${JSON.stringify(tBelow.shipping)}`);
}
eq(tBelow.freeShippingRemaining?.amount, 1000, "remaining to free shipping");
if (tBelow.freeShippingProgress >= 1)
  fail("progress must be < 1 below the threshold", tBelow.freeShippingProgress);

eq(tAbove.shipping?.amount, 0, "shipping is free at the threshold");
if (tAbove.freeShippingRemaining !== null) fail("nothing remaining once reached", "not null");
eq(tAbove.freeShippingProgress, 1, "progress caps at 1");

/* Totals never include a shipping figure we do not have. */
eq(tBelow.total.amount, tBelow.subtotal.amount, "total is goods-only below the threshold");

/* ---- reconciliation ---------------------------------------------------- */

const stale = addLine(addLine(EMPTY_BAG, line("gone-5mg", 4000), 1), line("moved-5mg", 5000), 2);
const r = reconcile(stale, (id) => (id === "gone-5mg" ? null : mxn(6000)));
eq(r.removed.length, 1, "withdrawn variant is dropped");
eq(r.removed[0].variantId, "gone-5mg", "the right line is dropped");
eq(r.repriced.length, 1, "a price change is reported");
eq(r.repriced[0].was.amount, 5000, "the old price is reported");
eq(r.bag.lines[0].unitPrice.amount, 6000, "the line carries the new price");
eq(r.bag.count, 2, "quantities survive reconciliation");

/* ---- order state machine ---------------------------------------------- */

const STATES = Object.keys(TRANSITIONS);

for (const [from, tos] of Object.entries(TRANSITIONS)) {
  for (const to of tos) {
    if (!STATES.includes(to)) fail("transition to an unknown state", `${from} -> ${to}`);
    if (to === from) fail("self-transition declared", from);
  }
}

/*
 * The property that matters most: a paid order cannot be moved back into a
 * pending or processing state. Providers redeliver events routinely, and an
 * out-of-order authorisation must not un-pay an order.
 */
for (const state of ["created", "pending_payment", "payment_processing", "payment_failed"]) {
  if (canTransition("paid", state)) fail("paid must not regress", `paid -> ${state}`);
}
if (!canTransition("paid", "refunded")) fail("paid must allow a refund", "paid -> refunded");

for (const terminal of ["cancelled", "refunded"]) {
  if (TRANSITIONS[terminal].length !== 0) fail("terminal state has outgoing transitions", terminal);
  if (!isSettled(terminal)) fail("terminal state is not settled", terminal);
}
if (!isSettled("paid")) fail("paid must be settled", "paid");
if (isSettled("pending_payment")) fail("pending_payment must not be settled", "pending_payment");

/* Every state is reachable from `created`, or it is dead code. */
const reachable = new Set(["created"]);
for (let i = 0; i < STATES.length; i++) {
  for (const s of [...reachable]) for (const to of TRANSITIONS[s]) reachable.add(to);
}
for (const s of STATES) if (!reachable.has(s)) fail("state unreachable from created", s);

/* ---- orders ------------------------------------------------------------ */

if (quoteTotals(below) !== null) {
  fail("an order must not be quotable below the free-shipping threshold", "got a quote");
}
if (createOrder(below) !== null) fail("no order below the threshold", "got an order");
if (createOrder(EMPTY_BAG) !== null) fail("no order from an empty bag", "got an order");

const order = createOrder(above, {
  email: "a@b.mx",
  shipping: {
    name: "N",
    line1: "L",
    city: "Guadalajara",
    state: "Jalisco",
    postalCode: "44100",
    country: "MX",
  },
});
if (!order) {
  fail("an order at the threshold must be creatable", "got null");
} else {
  eq(order.state, "created", "new order state");
  eq(order.route, "priority", "Guadalajara resolves to the priority route");
  eq(order.totals.shipping.amount, 0, "order shipping is free at the threshold");
  eq(order.totals.total.amount, order.totals.subtotal.amount, "order total");
  eq(order.providerRef, null, "a new order has no provider reference");
  eq(order.provider, null, "a new order has no provider");

  /* Line snapshots, not references — an order must not reprice itself. */
  const lines = bagToLines(above);
  eq(lines[0].lineTotal.amount, lines[0].unitPrice.amount * lines[0].quantity, "line total");
  eq(order.lines[0].name, above.lines[0].name, "the order snapshots the name");

  /*
   * An order cannot jump straight to paid: it has to have been attempted.
   * That is deliberate — a "mark as paid" shortcut is how money goes missing.
   */
  if (transition(order, "paid") !== null) fail("created must not jump to paid", "accepted");
  const pending = transition(order, "pending_payment");
  if (!pending) fail("created -> pending_payment is legal", "refused");
  if (pending && transition(pending, "paid") === null) {
    fail("pending_payment -> paid is legal", "refused");
  }
  const paid = { ...order, state: "paid" };
  if (transition(paid, "payment_processing") !== null) {
    fail("a redelivered event must not un-pay a paid order", "accepted");
  }
}

/* Accent- and case-insensitive city matching: a customer types "durango". */
const natOrder = createOrder(above, {
  shipping: {
    name: "N",
    line1: "L",
    city: "durango",
    state: "Durango",
    postalCode: "34000",
    country: "MX",
  },
});
eq(natOrder?.route, "priority", "lower-case Durango still resolves to priority");
const other = createOrder(above, {
  shipping: {
    name: "N",
    line1: "L",
    city: "Mérida",
    state: "Yucatán",
    postalCode: "97000",
    country: "MX",
  },
});
eq(other?.route, "national", "elsewhere resolves to the national route");

/* Order ids are unique and sortable by creation. */
const ids = new Set();
for (let i = 0; i < 500; i++) ids.add(newOrderId(1_700_000_000_000 + i, () => i / 500));
if (ids.size !== 500) fail("order ids collide", `${500 - ids.size} duplicates in 500`);
if (!/^NG-[0-9A-Z]+-[0-9A-Z]{3}$/.test(newOrderId())) fail("order id shape", newOrderId());

/* ---- payment gates ---------------------------------------------------- */

/*
 * The safety property of this whole phase: payment cannot be enabled without
 * registering a real adapter. `none` never configures, so no environment
 * variable can turn purchasing on.
 */
eq(activeProvider().id, "none", "the only registered provider is none");
eq(activeProvider().isConfigured(), false, "none is never configured");
eq(paymentAvailable(), false, "payment is unavailable with only the none adapter");
if (bagEnabled() !== (process.env.NEXT_PUBLIC_COMMERCE_ENABLED === "true")) {
  fail("bagEnabled must follow the commerce flag", String(bagEnabled()));
}

/* ---- report ------------------------------------------------------------ */

if (failures.length) {
  console.error(`\ncommerce check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `commerce check passed — ${STATES.length} payment states, ` +
    `free shipping at MX$${threshold.toLocaleString("en-US")}, ` +
    `quantities ${ORDER_LIMITS.min}-${ORDER_LIMITS.max}, payment ${paymentAvailable() ? "ENABLED" : "disabled"}`,
);
