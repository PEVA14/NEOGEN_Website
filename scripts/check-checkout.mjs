/**
 * CHECKOUT INVARIANTS.
 *
 * The properties a shop must not get wrong, tested against the REAL modules —
 * the same validators the server action calls, the same pricing function that
 * decides what is charged, the same state machine a webhook drives. Not
 * copies. `scripts/lib/register-ts.mjs` lets plain Node import the project's
 * TypeScript, which is what makes that possible.
 *
 * WHAT IS DELIBERATELY NEGATIVE-TESTED, because these are the failures that
 * cost money rather than the ones that show up in a screenshot:
 *
 *   a client asserting its own price          → ignored, disclosed
 *   an invalid or withdrawn variant           → dropped, disclosed
 *   an out-of-range quantity                  → clamped
 *   a duplicated provider event               → applied once
 *   an out-of-order provider event            → refused
 *   a paid order receiving anything earlier   → still paid
 *   an unapproved acknowledgement             → not recordable
 *   an unapproved policy                      → not publishable
 *   an empty bag                              → no order
 *
 *   npm run check:checkout
 */
import {
  canEnter,
  createDraft,
  firstIncomplete,
  isMxPhone,
  isMxPostalCode,
  isMxState,
  isEmail,
  markAttempted,
  methodsFor,
  missingAcknowledgements,
  normaliseAddress,
  normaliseContact,
  placementBlock,
  progression,
  routeForAddress,
  select,
  snapshotMatches,
  stepComplete,
  touch,
  validateAddress,
  validateContact,
  withSnapshot,
} from "../src/domain/checkout/index.ts";
import { priceLines, reprice, fingerprint } from "../src/domain/checkout/pricing.ts";
import { memoryDraftStore, __resetDraftStore } from "../src/domain/checkout/adapters/memory.ts";
import { applyPaymentEvent, recordAttempt } from "../src/domain/order/events.ts";
import { createOrder, quote, transition } from "../src/domain/order/index.ts";
import { mutate } from "../src/domain/order/repository.ts";
import { memoryOrderRepository, __resetOrderStore } from "../src/domain/order/adapters/memory.ts";
import {
  accept,
  acknowledgements,
  publicAcknowledgements,
  requiredAcknowledgements,
} from "../src/domain/acknowledgements/index.ts";
import {
  isApproved,
  policies,
  publicPolicies,
  publicPolicyBySlug,
} from "../src/content/policies.ts";
import { DOCUMENTS, INTERNAL_ONLY_TYPES } from "../src/content/documents.ts";
import { resolveEvidence } from "../src/domain/quality/index.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";
import { generatedPrices } from "../src/data/commerce/prices.generated.ts";
import { ORDER_LIMITS } from "../src/data/commerce/limits.ts";
import { siteConfig } from "../src/config/site.ts";
import { checkoutSegments } from "../src/config/routes.ts";
import { paymentAvailable } from "../src/payments/index.ts";

const failures = [];
const fail = (what, detail) => failures.push(`${what}: ${detail}`);
const eq = (actual, expected, what) => {
  if (actual !== expected)
    fail(what, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};
const ok = (condition, what, detail = "false") => {
  if (!condition) fail(what, detail);
};

/* A real, priced variant to build fixtures from — taken from the registry so
   the tests cannot drift from the catalogue. */
const priced = publishedProducts
  .flatMap((p) => p.variants.map((v) => ({ product: p, variant: v })))
  .filter(({ variant }) => generatedPrices[variant.id]);
if (priced.length < 2) fail("fixture", "need at least two priced variants in the registry");
const A = priced[0];
const B = priced.find(({ product }) => product.slug !== A.product.slug) ?? priced[1];
const priceA = generatedPrices[A.variant.id].amount;

const ADDRESS = {
  recipient: "Ana Ruiz",
  street: "Av. Chapultepec",
  numeroExterior: "480",
  numeroInterior: "3B",
  colonia: "Americana",
  postalCode: "44160",
  city: "Guadalajara",
  state: "JAL",
  country: "MX",
  notes: null,
};
const CONTACT = { email: "Ana@Example.MX", name: "Ana Ruiz", phone: "33 2065 5447" };

/* ---- field validation -------------------------------------------------- */

ok(isEmail("a@b.mx"), "minimal email accepted");
ok(!isEmail("a@b"), "email needs a dot in the domain");
ok(!isEmail("a b@c.mx"), "email rejects whitespace");
ok(!isEmail("a@@b.mx"), "email rejects two at-signs");
ok(!isEmail("@b.mx"), "email needs a local part");
ok(!isEmail("a@.mx"), "email rejects a leading dot in the domain");

ok(isMxPhone("3320655447"), "ten national digits accepted");
ok(isMxPhone("+52 33 2065 5447"), "twelve digits with country code accepted");
ok(!isMxPhone("123456789"), "nine digits rejected");
ok(!isMxPhone("0320655447"), "a leading zero is rejected");
ok(!isMxPhone("13320655447"), "eleven digits rejected");

ok(isMxPostalCode("44160"), "five-digit CP accepted");
ok(!isMxPostalCode("4416"), "four-digit CP rejected");
ok(!isMxPostalCode("441601"), "six-digit CP rejected");
ok(isMxState("JAL"), "a real state code is accepted");
ok(!isMxState("Jalisco"), "a state NAME is not a state code");
ok(!isMxState(""), "an empty state is rejected");

eq(validateContact(CONTACT).length, 0, "a complete contact validates");
eq(validateContact({}).length, 3, "an empty contact reports three fields");
eq(validateAddress(ADDRESS).length, 0, "a complete address validates");
ok(
  validateAddress({ ...ADDRESS, colonia: "" }).some((i) => i.field === "colonia"),
  "a missing colonia is reported",
);
ok(
  validateAddress({ ...ADDRESS, country: "US" }).some((i) => i.code === "country_unsupported"),
  "a non-MX country is REJECTED, not silently rewritten",
);
ok(
  validateAddress({ ...ADDRESS, street: "x".repeat(200) }).some((i) => i.code === "too_long"),
  "an overlong street is rejected rather than truncated",
);

/* Normalisation: canonical storage, without losing what was meant. */
eq(normaliseContact(CONTACT).email, "ana@example.mx", "email is lowercased");
eq(normaliseContact(CONTACT).phone, "523320655447", "phone is stored with the country code");
eq(
  normaliseContact({ ...CONTACT, phone: "+52 33 2065 5447" }).phone,
  "523320655447",
  "an already-prefixed phone is not double-prefixed",
);
eq(
  normaliseAddress({ ...ADDRESS, numeroInterior: "  " }).numeroInterior,
  null,
  "a blank interior number becomes null",
);
eq(normaliseAddress(ADDRESS).country, "MX", "country is forced to MX");

/* ---- server-authoritative pricing -------------------------------------- */

const one = await priceLines([{ variantId: A.variant.id, quantity: 2 }]);
eq(one.snapshot.lines.length, 1, "a valid variant prices");
eq(one.snapshot.lines[0].unitPrice.amount, priceA, "the unit price comes from the registry");
eq(one.snapshot.subtotal.amount, priceA * 2, "the subtotal is unit × quantity");

/*
 * THE CORE SECURITY PROPERTY. A client claiming a price of 1 peso is ignored
 * entirely: the registry price is charged, and the discrepancy is DISCLOSED
 * rather than swallowed.
 */
const lied = await priceLines([{ variantId: A.variant.id, quantity: 1, claimedUnitPrice: 1 }]);
eq(lied.snapshot.lines[0].unitPrice.amount, priceA, "a client-claimed price NEVER sets the amount");
eq(lied.snapshot.subtotal.amount, priceA, "a client-claimed price never reaches the subtotal");
ok(
  lied.adjustments.some((a) => a.kind === "repriced" && a.now.amount === priceA),
  "a price mismatch is disclosed as `repriced`",
);

/* An honest claim produces no noise. */
const honest = await priceLines([
  { variantId: A.variant.id, quantity: 1, claimedUnitPrice: priceA },
]);
eq(honest.adjustments.length, 0, "a matching claimed price produces no adjustment");

/* Unknown, forged and empty variant ids. */
for (const bad of ["not-a-variant", "../../etc/passwd", "reta-99999mg", ""]) {
  const result = await priceLines([{ variantId: bad, quantity: 1 }]);
  eq(result.snapshot.lines.length, 0, `an invalid variant id is dropped (${bad || "empty"})`);
}
const unknown = await priceLines([{ variantId: "definitely-not-real", quantity: 1 }]);
ok(
  unknown.adjustments.some((a) => a.kind === "removed_unknown"),
  "a dropped unknown variant is disclosed",
);

/* Quantities: clamped, never trusted. */
const huge = await priceLines([{ variantId: A.variant.id, quantity: 100000 }]);
eq(
  huge.snapshot.lines[0].quantity,
  ORDER_LIMITS.max,
  "an excessive quantity is clamped to the maximum",
);
ok(
  huge.adjustments.some((a) => a.kind === "quantity_clamped"),
  "a clamped quantity is disclosed",
);
const negative = await priceLines([{ variantId: A.variant.id, quantity: -5 }]);
eq(
  negative.snapshot.lines[0].quantity,
  ORDER_LIMITS.min,
  "a negative quantity is clamped to the minimum",
);
const nan = await priceLines([{ variantId: A.variant.id, quantity: Number.NaN }]);
eq(nan.snapshot.lines[0].quantity, ORDER_LIMITS.min, "NaN is clamped to the minimum");

/* Duplicate ids are merged BEFORE clamping, so a split line cannot exceed the cap. */
const split = await priceLines([
  { variantId: A.variant.id, quantity: 80 },
  { variantId: A.variant.id, quantity: 80 },
]);
eq(split.snapshot.lines.length, 1, "duplicate variant ids merge into one line");
eq(
  split.snapshot.lines[0].quantity,
  ORDER_LIMITS.max,
  "a split quantity cannot escape the per-line cap",
);

/* Fingerprints: order-independent, sensitive to every priced fact. */
const twoLines = await priceLines([
  { variantId: A.variant.id, quantity: 1 },
  { variantId: B.variant.id, quantity: 1 },
]);
const reversed = await priceLines([
  { variantId: B.variant.id, quantity: 1 },
  { variantId: A.variant.id, quantity: 1 },
]);
eq(
  twoLines.snapshot.fingerprint,
  reversed.snapshot.fingerprint,
  "a fingerprint is order-independent",
);
ok(
  fingerprint(one.snapshot.lines) !== fingerprint(twoLines.snapshot.lines),
  "a fingerprint changes with the lines",
);
const requoted = await reprice(twoLines.snapshot);
eq(
  requoted.snapshot.fingerprint,
  twoLines.snapshot.fingerprint,
  "repricing an unchanged snapshot is stable",
);

/* ---- delivery ----------------------------------------------------------- */

const threshold = siteConfig.fulfilment.freeShippingThreshold;
eq(routeForAddress(ADDRESS), "priority", "Guadalajara is the priority route");
eq(
  routeForAddress({ city: "GUADALAJARA", state: "JAL" }),
  "priority",
  "matching is case-insensitive",
);
eq(
  routeForAddress({ city: "Mérida", state: "YUC" }),
  "national",
  "elsewhere is the national route",
);
eq(
  routeForAddress({ city: "Zapopan", state: "JAL" }),
  "priority",
  "the priority state widens to its metro area",
);

const below = methodsFor(ADDRESS, { amount: threshold - 1, currency: "MXN" });
eq(below.length, 1, "one method is offered per address");
eq(
  below[0].price,
  null,
  "below the threshold there is NO shipping price — the rate model does not exist",
);
eq(below[0].basis, "rate-model-pending", "the reason is stated, not implied");
eq(below[0].handling, null, "cold chain is undetermined, never claimed as standard");

const above = methodsFor(ADDRESS, { amount: threshold, currency: "MXN" });
eq(above[0].price.amount, 0, "at the threshold shipping is free — the one confirmed rate");
eq(above[0].basis, "free-threshold", "the free basis is stated");
eq(
  above[0].estimateDays,
  siteConfig.fulfilment.estimateDays.priority,
  "the estimate comes from config",
);

/* ---- quoting ------------------------------------------------------------ */

eq(quote([], select(above[0])), null, "an empty order cannot be quoted");
eq(quote(one.snapshot.lines, null), null, "no delivery selection means no total");
eq(
  quote(one.snapshot.lines, select(below[0])),
  null,
  "an unpriced method means no total — never a guess",
);
const quoted = quote(one.snapshot.lines, select(above[0]));
eq(quoted.subtotal.amount, priceA * 2, "the quoted subtotal matches the lines");
eq(quoted.shipping.amount, 0, "free shipping is zero, not null");
eq(quoted.total.amount, priceA * 2, "the total is subtotal plus shipping");

/* ---- draft progression -------------------------------------------------- */

let draft = createDraft("test-draft");
eq(firstIncomplete(draft), "contact", "a new draft starts at contact");
ok(canEnter(draft, "contact"), "contact is always enterable");
ok(!canEnter(draft, "shipping"), "shipping is not enterable before contact");
ok(!canEnter(draft, "review"), "review is not enterable from an empty draft");

draft = withSnapshot(draft, twoLines.snapshot, twoLines.adjustments);
draft = touch(draft, { contact: CONTACT });
ok(stepComplete(draft, "contact"), "a valid contact completes the step");
eq(firstIncomplete(draft), "shipping", "the next incomplete step is shipping");
ok(canEnter(draft, "shipping"), "shipping opens once contact is valid");
ok(!canEnter(draft, "delivery"), "delivery is still closed");

/* Clearing a field UN-completes its step — completeness is derived. */
const cleared = touch(draft, { contact: { ...CONTACT, email: "" } });
ok(!stepComplete(cleared, "contact"), "clearing a field un-completes the step");
ok(!canEnter(cleared, "shipping"), "and closes the steps after it");

draft = touch(draft, { address: ADDRESS });
ok(stepComplete(draft, "shipping"), "a valid address completes shipping");
eq(firstIncomplete(draft), "delivery", "delivery is next");

/* A changed subtotal invalidates the delivery selection. */
const bigEnough = await priceLines([{ variantId: A.variant.id, quantity: ORDER_LIMITS.max }]);
let quotable = withSnapshot(draft, bigEnough.snapshot, []);
const method = methodsFor(ADDRESS, bigEnough.snapshot.subtotal)[0];
quotable = touch(quotable, { delivery: select(method) });
ok(quotable.delivery !== null, "a delivery selection is stored");
const resnapped = withSnapshot(quotable, one.snapshot, []);
eq(resnapped.delivery, null, "a changed subtotal clears the delivery selection");
ok(!resnapped.attempted.delivery, "and re-opens the delivery step");

/* ---- placement gates ---------------------------------------------------- */

eq(placementBlock(createDraft("x")), "empty", "an empty draft cannot place an order");
eq(
  placementBlock(withSnapshot(createDraft("x"), one.snapshot, [])),
  "contact_incomplete",
  "no contact blocks placement",
);
eq(
  placementBlock(touch(withSnapshot(createDraft("x"), one.snapshot, []), { contact: CONTACT })),
  "shipping_incomplete",
  "no address blocks placement",
);
const noDelivery = touch(
  touch(withSnapshot(createDraft("x"), one.snapshot, []), { contact: CONTACT }),
  { address: ADDRESS },
);
eq(placementBlock(noDelivery), "delivery_missing", "no delivery selection blocks placement");
eq(
  placementBlock(
    touch(noDelivery, { delivery: select(methodsFor(ADDRESS, one.snapshot.subtotal)[0]) }),
  ),
  one.snapshot.subtotal.amount >= threshold ? null : "delivery_unquotable",
  "an unquotable delivery blocks placement",
);

/* A fully valid, quotable draft passes every gate. */
let ready = withSnapshot(createDraft("ready"), bigEnough.snapshot, []);
ready = touch(ready, { contact: CONTACT, address: ADDRESS });
ready = touch(ready, { delivery: select(methodsFor(ADDRESS, bigEnough.snapshot.subtotal)[0]) });
ready = markAttempted(ready, "payment");
eq(placementBlock(ready), null, "a complete quotable draft can place an order");
eq(missingAcknowledgements(ready).length, 0, "no acknowledgements are required today");

/* ---- order creation ----------------------------------------------------- */

const order = createOrder(ready, normaliseContact(CONTACT), normaliseAddress(ADDRESS));
ok(order !== null, "a ready draft creates an order");
eq(order.state, "created", "a new order starts in `created`, never `paid`");
eq(order.status, "placed", "fulfilment status starts at `placed`");
eq(order.provider, null, "no provider until one is attempted");
eq(order.providerRef, null, "no provider reference until one is issued");
eq(order.attempts.length, 0, "no attempts on a fresh order");
eq(order.events.length, 1, "creation is recorded as one event");
eq(order.route, "priority", "the route is resolved from the address");
eq(order.lines.length, bigEnough.snapshot.lines.length, "the order carries the snapshot's lines");
eq(order.totals.total.amount, bigEnough.snapshot.subtotal.amount, "the total matches the quote");

/* Line snapshots are COPIES: mutating the order cannot reach the draft. */
order.lines[0].unitPrice.amount = 1;
ok(
  ready.snapshot.lines[0].unitPrice.amount !== 1,
  "order lines are copies, not shared references to the draft",
);

/* An unquotable or empty draft creates nothing. */
eq(
  createOrder(createDraft("x"), normaliseContact(CONTACT), normaliseAddress(ADDRESS)),
  null,
  "no order from an empty draft",
);
eq(
  createOrder(noDelivery, normaliseContact(CONTACT), normaliseAddress(ADDRESS)),
  null,
  "no order without a delivery selection",
);

/* ---- payment events: idempotency, ordering, non-regression -------------- */

const base = createOrder(ready, normaliseContact(CONTACT), normaliseAddress(ADDRESS));
const withRef = recordAttempt(base, {
  provider: "test",
  at: "2026-09-10T10:00:00.000Z",
  outcome: "intent_created",
  providerRef: "pay_1",
});
eq(withRef.attempts.length, 1, "an attempt is recorded");
eq(withRef.providerRef, "pay_1", "the provider reference is stored");

const event = (state, id = "evt_1", ref = "pay_1") => ({
  providerEventId: id,
  provider: "test",
  providerRef: ref,
  state,
  receivedAt: "2026-09-10T10:01:00.000Z",
});

const pending = applyPaymentEvent(withRef, event("pending_payment"));
eq(pending.outcome, "applied", "a legal transition applies");
eq(pending.order.state, "pending_payment", "the state moves");

/* IDEMPOTENCY: the same provider event id, again. */
const replay = applyPaymentEvent(pending.order, event("pending_payment"));
eq(replay.outcome, "duplicate", "a redelivered event is a duplicate");
eq(replay.order.events.length, pending.order.events.length, "a duplicate writes no new audit row");

/* A DIFFERENT event id asserting the SAME state is a no-op, not an error. */
const same = applyPaymentEvent(pending.order, event("pending_payment", "evt_2"));
eq(same.outcome, "noop", "a new event for the current state is a no-op");
eq(same.order.state, "pending_payment", "and does not change the state");

/* A MISROUTED event — right shape, wrong payment. */
const misrouted = applyPaymentEvent(pending.order, event("paid", "evt_3", "pay_OTHER"));
eq(misrouted.outcome, "mismatched_ref", "an event for another payment is refused");
eq(misrouted.order.state, "pending_payment", "and cannot move the order");

const paid = applyPaymentEvent(pending.order, event("paid", "evt_4"));
eq(paid.outcome, "applied", "payment applies from pending");
eq(paid.order.state, "paid", "the order is paid");

/*
 * NON-REGRESSION — the property that matters most. Every earlier state,
 * redelivered against a paid order, must be refused.
 */
for (const earlier of ["created", "pending_payment", "payment_processing", "payment_failed"]) {
  const late = applyPaymentEvent(paid.order, event(earlier, `evt_late_${earlier}`));
  eq(late.outcome, "rejected", `a late \`${earlier}\` event is rejected against a paid order`);
  eq(late.order.state, "paid", `a late \`${earlier}\` event leaves the order paid`);
  ok(
    late.order.events.at(-1).note === "illegal_transition",
    `a rejected \`${earlier}\` event is recorded with its reason`,
  );
}

/* Cancellation is also refused once paid — only a refund follows. */
eq(
  applyPaymentEvent(paid.order, event("cancelled", "evt_x")).outcome,
  "rejected",
  "a paid order cannot be cancelled",
);
eq(
  applyPaymentEvent(paid.order, event("refunded", "evt_y")).outcome,
  "applied",
  "a paid order can be refunded",
);

/* `transition` refuses the same moves — the table is the single authority. */
eq(transition(paid.order, "pending_payment"), null, "a direct transition cannot un-pay an order");
eq(transition(base, "paid"), null, "an order cannot jump straight to paid");

/* ---- persistence boundary ---------------------------------------------- */

__resetOrderStore();
const repo = memoryOrderRepository;
const created = await repo.create(base);
ok(created.ok, "an order persists");
eq(created.order.version, 1, "a persisted order starts at version 1");
eq((await repo.create(base)).ok, false, "the same id cannot be created twice");

const loaded = await repo.get(base.id);
ok(loaded !== null, "a persisted order can be read back");
loaded.state = "cancelled";
eq(
  (await repo.get(base.id)).state,
  "created",
  "a returned order is a copy — mutating it does not persist",
);

const saved = await repo.save({ ...created.order, status: "in_review" });
ok(saved.ok, "a save with the current version succeeds");
eq(saved.order.version, 2, "the version increments");
eq(
  (await repo.save({ ...created.order, status: "preparing" })).reason,
  "version_conflict",
  "a stale write is refused",
);
eq(
  (await repo.save({ ...base, id: "NG-NOPE-000" })).reason,
  "not_found",
  "saving an unknown order is refused",
);

/* `mutate` re-decides against fresh state rather than replaying a stale one. */
const mutated = await mutate(repo, base.id, (current) => ({ ...current, status: "shipped" }));
ok(mutated.ok && mutated.changed, "mutate persists a change");
eq((await repo.get(base.id)).status, "shipped", "the change is durable");
const noChange = await mutate(repo, base.id, () => null);
ok(noChange.ok && !noChange.changed, "returning null from mutate writes nothing");
eq((await repo.get(base.id)).version, 3, "and does not bump the version");

/* Provider-event deduplication is GLOBAL, so a misrouted redelivery is caught. */
const withEvent = await repo.save({
  ...(await repo.get(base.id)),
  events: [
    ...(await repo.get(base.id)).events,
    {
      seq: 2,
      at: "2026-09-10T10:00:00.000Z",
      kind: "payment_event_applied",
      providerEventId: "evt_global",
      from: "created",
      to: "pending_payment",
      note: null,
    },
  ],
});
ok(withEvent.ok, "an order carrying a provider event persists");
eq(
  await repo.hasProviderEvent("evt_global"),
  true,
  "a recorded provider event id is globally known",
);
eq(await repo.hasProviderEvent("evt_never"), false, "an unseen provider event id is not");

/* Provider references index back to their order. */
const refOrder = await repo.create({ ...base, id: "NG-REF-001", providerRef: "pay_indexed" });
ok(refOrder.ok, "an order with a provider reference persists");
eq(
  (await repo.findByProviderRef("pay_indexed"))?.id,
  "NG-REF-001",
  "a provider reference resolves to its order",
);
eq(await repo.findByProviderRef("pay_missing"), null, "an unknown reference resolves to nothing");

/* ---- draft store ------------------------------------------------------- */

__resetDraftStore();
await memoryDraftStore.put(ready);
eq((await memoryDraftStore.get(ready.id))?.id, ready.id, "a draft round-trips");
const readBack = await memoryDraftStore.get(ready.id);
readBack.contact.email = "tampered@example.mx";
eq(
  (await memoryDraftStore.get(ready.id)).contact.email,
  CONTACT.email,
  "a returned draft is a copy",
);
await memoryDraftStore.delete(ready.id);
eq(await memoryDraftStore.get(ready.id), null, "a deleted draft is gone");

/* ---- acknowledgements -------------------------------------------------- */

eq(publicAcknowledgements().length, 0, "NO acknowledgement is publishable — none is approved");
eq(requiredAcknowledgements().length, 0, "and none is required");
ok(acknowledgements.length > 0, "the framework nevertheless declares candidates");
/* An unapproved declaration cannot be recorded even if its id is posted. */
eq(
  accept(acknowledgements.map((a) => a.id)).length,
  0,
  "posting an unapproved acknowledgement id records nothing",
);
eq(accept(["age-18", "made-up-id"]).length, 0, "an unknown acknowledgement id records nothing");
for (const ack of acknowledgements) {
  ok(ack.status !== "approved", `\`${ack.id}\` must not be approved without counsel review`);
  if (ack.policy) {
    const policy = policies.find((p) => p.id === ack.policy);
    ok(policy !== undefined, `\`${ack.id}\` points at a declared policy`);
    ok(!isApproved(policy), `\`${ack.id}\` cannot be published while its policy is unapproved`);
  }
}

/* ---- policies ---------------------------------------------------------- */

eq(publicPolicies().length, 0, "NO policy is publishable — none is approved");
ok(policies.length === 7, "all seven policy slots are declared");
for (const policy of policies) {
  eq(policy.body, null, `\`${policy.id}\` carries no text — legal copy is not written here`);
  eq(publicPolicyBySlug(policy.slug), undefined, `\`${policy.slug}\` does not resolve publicly`);
  ok(!isApproved(policy), `\`${policy.id}\` is not approved`);
}
/* Slugs are unique, or two policies would share a URL. */
eq(new Set(policies.map((p) => p.slug)).size, policies.length, "policy slugs are unique");

/* ---- documents: keyed on product identity (resolver tested in check:quality) */

eq(DOCUMENTS.length, 0, "no document is declared for any product");
/* THE RE-KEY ITSELF: every product can be resolved, not just the three worlds. */
for (const product of publishedProducts) {
  const evidence = resolveEvidence(product);
  ok(
    evidence.presentations.length === product.variants.length,
    `evidence lists every presentation of \`${product.slug}\``,
  );
  ok(!evidence.hasEvidence, `\`${product.slug}\` resolves no evidence while nothing is declared`);
}
ok(
  publishedProducts.filter((p) => p.world === null).length > 50,
  "most products have no world — which is why documents may not be keyed by one",
);
ok(INTERNAL_ONLY_TYPES.has("supplier-documentation"), "supplier documentation is internal-only");

/* ---- routes ------------------------------------------------------------ */

eq(new Set(Object.values(checkoutSegments)).size, 6, "every step has a distinct URL segment");
for (const [step, segment] of Object.entries(checkoutSegments)) {
  ok(/^[a-z]+$/.test(segment), `\`${step}\` has a clean URL segment (${segment})`);
}
eq(progression(ready, "review").filter((s) => s.current).length, 1, "exactly one step is current");
eq(progression(ready, "review").length, 6, "the progression has six steps");

/* ---- payment availability --------------------------------------------- */

/*
 * The safety property of the phase: no environment variable can enable
 * payment. `none` is the only registered adapter and it never configures.
 */
eq(paymentAvailable(), false, "payment is unavailable — no adapter is configured");

/* ---- snapshot freshness ------------------------------------------------ */

ok(snapshotMatches(ready, ready.snapshot), "a snapshot matches itself");
ok(
  !snapshotMatches(ready, { ...ready.snapshot, fingerprint: "different" }),
  "a changed fingerprint is detected — this is what stops a silent reprice",
);

/* ---- report ------------------------------------------------------------ */

if (failures.length) {
  console.error(`\ncheckout check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `checkout check passed — 6 steps, ${policies.length} policy slots (0 approved), ` +
    `${acknowledgements.length} declarations (0 publishable), ` +
    `${DOCUMENTS.length} documents declared, payment ${paymentAvailable() ? "ENABLED" : "disabled"}`,
);
