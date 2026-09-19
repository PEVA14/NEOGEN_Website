/**
 * PAYMENT INVARIANTS — the Mercado Pago integration, end to end, offline.
 *
 * Runs the REAL adapter, the REAL payment service, the REAL webhook route and
 * the REAL Postgres adapter. Only two things are stand-ins, and both are the
 * edges NEOGEN does not own:
 *
 *   Mercado Pago's API   → a scripted fake behind `globalThis.fetch`, answering
 *                          the documented Orders API shapes (201 processed,
 *                          201 processing, 402 failed with the order, …). The
 *                          cardholder-name convention of Mercado Pago's own
 *                          test cards (APRO, OTHE, CONT, FUND) picks the outcome.
 *   The Postgres server  → PGlite, a real Postgres engine in-process, running
 *                          the same migration file production uses.
 *
 * Webhook signatures are computed exactly as Mercado Pago documents them, so a
 * delivery that passes here is one the real service would sign the same way.
 *
 * WHAT IS PROVEN, because each is a way to lose or double-take money:
 *
 *   a status table that covers every documented state   → no guessed states
 *   the charge carries the ORDER's total                 → price tampering is inert
 *   a double submission                                  → one charge
 *   a decline                                            → retryable, order kept
 *   a pending payment settled by webhook                 → paid only then
 *   a duplicate / replayed webhook                       → applied once
 *   an unsigned, mis-signed or malformed webhook         → refused
 *   a webhook body that lies about the state             → ignored; the API is asked
 *   an amount or external reference that does not match  → never paid
 *   a lost answer (timeout)                              → processing, then settled
 *   a stalled attempt                                    → released for retry
 *   concurrent writers on Postgres                       → no lost update
 *
 *   npm run check:payments
 */
import { readFileSync } from "node:fs";
import path from "node:path";

/* ---- environment: set BEFORE any application module is imported --------- */

const WEBHOOK_SECRET = "whsec-test-0123456789";
process.env.NEXT_PUBLIC_COMMERCE_ENABLED = "true";
process.env.MERCADOPAGO_MODE = "test";
process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-0000-test-access-token";
process.env.MERCADOPAGO_PUBLIC_KEY = "APP_USR-test-public-key";
process.env.MERCADOPAGO_WEBHOOK_SECRET = WEBHOOK_SECRET;
delete process.env.DATABASE_URL;

const failures = [];
let passed = 0;
const fail = (what, detail) => failures.push(`${what}: ${detail}`);
const eq = (actual, expected, what) => {
  if (actual !== expected)
    fail(what, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  else passed += 1;
};
const ok = (cond, what) => {
  if (!cond) fail(what, "expected true");
  else passed += 1;
};

/* ---- the fake Mercado Pago ---------------------------------------------- */

const API = "https://api.mercadopago.com";
const mp = {
  orders: new Map(),
  byKey: new Map(),
  posts: [],
  gets: 0,
  counter: 0,
  /** Change an order's state at "Mercado Pago", as time passing would. */
  set(id, status, detail, paymentDetail = detail) {
    const o = this.orders.get(id);
    o.status = status;
    o.status_detail = detail;
    o.transactions.payments[0].status = status;
    o.transactions.payments[0].status_detail = paymentDetail;
  },
};

function mpOrder(body, status, detail, paymentDetail = detail, overrides = {}) {
  mp.counter += 1;
  const id = `ORD01TEST${String(mp.counter).padStart(4, "0")}`;
  const order = {
    id,
    type: "online",
    processing_mode: "automatic",
    external_reference: body.external_reference,
    total_amount: body.total_amount,
    status,
    status_detail: detail,
    live_mode: false,
    transactions: {
      payments: [
        {
          id: `PAY01TEST${String(mp.counter).padStart(4, "0")}`,
          amount: body.transactions.payments[0].amount,
          status,
          status_detail: paymentDetail,
          payment_method: body.transactions.payments[0].payment_method,
        },
      ],
    },
    ...overrides,
  };
  mp.orders.set(id, order);
  return order;
}

const json = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers);
  if (headers.get("authorization") !== `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`) {
    return json(401, { errors: [{ code: "401" }] });
  }

  if (url === `${API}/v1/orders` && init.method === "POST") {
    const body = JSON.parse(init.body);
    const key = headers.get("x-idempotency-key");
    mp.posts.push({ key, body });
    if (!key) return json(400, { errors: [{ code: "empty_required_header" }] });
    /* Idempotency, as documented: a reused key never creates a second order. */
    if (mp.byKey.has(key)) return json(409, { errors: [{ code: "idempotency_key_already_used" }] });

    const token = body.transactions.payments[0].payment_method.token;
    const scenario = token.split("-")[1];
    let order;
    switch (scenario) {
      case "APRO":
        order = mpOrder(body, "processed", "accredited");
        mp.byKey.set(key, order.id);
        return json(201, order);
      case "CONT":
        order = mpOrder(body, "processing", "in_process");
        mp.byKey.set(key, order.id);
        return json(201, order);
      case "WAIT":
        order = mpOrder(body, "action_required", "waiting_payment");
        mp.byKey.set(key, order.id);
        return json(201, order);
      case "OTHE":
        order = mpOrder(body, "failed", "failed", "rejected_by_issuer");
        mp.byKey.set(key, order.id);
        return json(402, order);
      case "FUND":
        order = mpOrder(body, "failed", "failed", "insufficient_amount");
        mp.byKey.set(key, order.id);
        return json(402, order);
      case "SHORT":
        /* Mercado Pago reports a different amount than the order's. */
        order = mpOrder(body, "processed", "accredited", "accredited", { total_amount: "1.00" });
        mp.byKey.set(key, order.id);
        return json(201, order);
      case "ELSEWHERE":
        order = mpOrder(body, "processed", "accredited", "accredited", {
          external_reference: "NG-SOMEONE-ELS",
        });
        mp.byKey.set(key, order.id);
        return json(201, order);
      case "LOST":
        /* The order IS created, but the answer never arrives. */
        order = mpOrder(body, "processed", "accredited");
        mp.byKey.set(key, order.id);
        throw new TypeError("fetch failed");
      case "NEVER":
        throw new TypeError("fetch failed");
      case "BAD":
        return json(400, { errors: [{ code: "invalid_properties" }] });
      case "DOWN":
        return json(500, { errors: [{ code: "internal_error" }] });
      default:
        return json(400, { errors: [{ code: "property_value" }] });
    }
  }

  const get = url.match(/^https:\/\/api\.mercadopago\.com\/v1\/orders\/([A-Za-z0-9_-]+)$/);
  if (get && (!init.method || init.method === "GET")) {
    mp.gets += 1;
    const order = mp.orders.get(get[1]);
    return order ? json(200, order) : json(404, { errors: [{ code: "order_not_found" }] });
  }

  return json(404, {});
};

/* ---- application modules ------------------------------------------------ */

const { stateFor, declineFor, snapshotOf, formatAmount, parseAmount } =
  await import("../src/payments/adapters/mercadopago/vocabulary.ts");
const { manifestFor, sign, verifySignature, parseSignatureHeader } =
  await import("../src/payments/adapters/mercadopago/signature.ts");
const { createMercadoPagoProvider } = await import("../src/payments/adapters/mercadopago/index.ts");
const { readMercadoPagoConfig, SANDBOX_PAYER_EMAIL } =
  await import("../src/payments/adapters/mercadopago/config.ts");
const { readInstrument, isOrderId } = await import("../src/payments/instrument.ts");
const { reconcileSnapshot } = await import("../src/payments/reconcile.ts");
const { activeProvider, paymentAvailable, DECLINE_REASONS } =
  await import("../src/payments/index.ts");
const { submitPayment, refreshPayment } = await import("../src/server/payments.ts");
const { memoryOrderRepository, __resetOrderStore } =
  await import("../src/domain/order/adapters/memory.ts");
const { memoryOutbox, __resetOutbox } =
  await import("../src/domain/notifications/adapters/memoryOutbox.ts");
const { lastDecline, recoverStalledAttempt, beginAttempt, STALLED_ATTEMPT_MS } =
  await import("../src/domain/order/events.ts");
const { mutate } = await import("../src/domain/order/repository.ts");
const { TRANSITIONS } = await import("../src/domain/order/types.ts");
const { POST: webhook, GET: webhookProbe } =
  await import("../src/app/api/payments/webhook/route.ts");

/* ---- fixtures ------------------------------------------------------------ */

const mxn = (amount) => ({ amount, currency: "MXN" });
let orderSeq = 0;
function makeOrder(total = 12000) {
  orderSeq += 1;
  const at = "2026-09-19T10:00:00.000Z";
  return {
    id: `NG-TEST${String(orderSeq).padStart(4, "0")}-A${String(orderSeq).padStart(2, "0")}`,
    createdAt: at,
    updatedAt: at,
    version: 1,
    state: "created",
    status: "placed",
    lines: [
      {
        variantId: "v1",
        slug: "fixture",
        name: "Fixture",
        presentation: "10 mg",
        unitPrice: mxn(total),
        quantity: 1,
        lineTotal: mxn(total),
      },
    ],
    totals: { subtotal: mxn(total), shipping: mxn(0), total: mxn(total) },
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
    providerRef: null,
    provider: null,
    attempts: [],
    events: [
      { seq: 1, at, kind: "created", providerEventId: null, from: null, to: "created", note: null },
    ],
  };
}
async function placed(total) {
  const order = makeOrder(total);
  const created = await memoryOrderRepository.create(order);
  if (!created.ok) throw new Error("fixture order not created");
  return created.order;
}
const card = (scenario, extra = {}) => ({
  token: `tok-${scenario}-${Math.random().toString(36).slice(2, 10)}`,
  methodId: "master",
  typeId: "credit_card",
  installments: 1,
  identification: null,
  ...extra,
});
const load = (id) => memoryOrderRepository.get(id);

function signedWebhook(
  dataId,
  { secret = WEBHOOK_SECRET, type = "order", body, requestId = "req-1", query } = {},
) {
  const ts = String(Date.now());
  const sig = sign(secret, manifestFor({ dataId, requestId, ts }));
  const params = query ?? `data.id=${encodeURIComponent(dataId)}&type=${type}`;
  return new Request(`https://neogen.mx/api/payments/webhook?${params}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": `ts=${ts},v1=${sig}`,
      "x-request-id": requestId,
    },
    body: JSON.stringify(body ?? { action: "order.updated", type, data: { id: dataId } }),
  });
}

/* ======================================================================== */
/* 1. VOCABULARY — every documented Orders API status                         */
/* ======================================================================== */

const DOCUMENTED = [
  ["created", "created", null],
  ["processed", "accredited", "paid"],
  ["processed", "partially_refunded", "paid"],
  ["processing", "in_process", "payment_processing"],
  ["processing", "pending_review_manual", "payment_processing"],
  ["processing", "in_review", "payment_processing"],
  ["in_review", "in_review", "payment_processing"],
  ["action_required", "waiting_payment", "pending_payment"],
  ["action_required", "waiting_transfer", "pending_payment"],
  ["action_required", "pending_challenge", "pending_payment"],
  ["action_required", "waiting_capture", "payment_processing"],
  ["action_required", "waiting_retry", "payment_processing"],
  ["canceled", "canceled", "payment_failed"],
  ["charged_back", "in_process", "disputed"],
  ["charged_back", "settled", "disputed"],
  ["charged_back", "reimbursed", "disputed"],
  ["expired", "expired", "payment_failed"],
  ["failed", "failed", "payment_failed"],
  ["refunded", "refunded", "refunded"],
];
for (const [status, detail, expected] of DOCUMENTED) {
  eq(stateFor(status, detail), expected, `Mercado Pago ${status}/${detail} → ${expected}`);
}
eq(stateFor("something_new", "x"), null, "an undocumented status maps to no change, not a guess");
for (const target of new Set(DOCUMENTED.map((d) => d[2]).filter(Boolean))) {
  ok(target in TRANSITIONS, `mapped state ${target} exists in the order machine`);
}

const DECLINES = {
  insufficient_amount: "insufficient_funds",
  card_insufficient_amount: "insufficient_funds",
  bad_filled_card_data: "card_data",
  invalid_card_token: "card_data",
  required_call_for_authorize: "call_for_authorize",
  card_disabled: "card_disabled",
  high_risk: "high_risk",
  rejected_by_issuer: "issuer_rejected",
  amount_limit_exceeded: "amount_limit",
  invalid_installments: "installments",
  max_attempts_exceeded: "attempts_exceeded",
  "3ds_challenge_expired": "expired",
  processing_error: "generic",
};
for (const [detail, reason] of Object.entries(DECLINES)) {
  eq(declineFor("failed", detail), reason, `decline ${detail} → ${reason}`);
  ok(DECLINE_REASONS.includes(reason), `decline reason ${reason} has customer copy`);
}
eq(
  declineFor("canceled", "canceled"),
  "cancelled",
  "a cancelled Mercado Pago order is a cancelled attempt",
);
eq(
  declineFor("expired", "expired"),
  "expired",
  "an expired Mercado Pago order is an expired attempt",
);

eq(formatAmount(12000), "12000.00", "whole pesos format as the API's decimal string");
eq(parseAmount("12000.00"), 12000, "the API's decimal string parses back");
eq(parseAmount("abc"), null, "a non-numeric amount parses to null");

const snap = snapshotOf({
  id: "ORD01X",
  status: "failed",
  status_detail: "failed",
  external_reference: "NG-A",
  total_amount: "10.00",
  transactions: { payments: [{ status: "failed", status_detail: "insufficient_amount" }] },
});
eq(snap.state, "payment_failed", "a snapshot reads the order status");
eq(snap.detail, "insufficient_funds", "and the transaction's decline detail");
eq(
  snap.eventId,
  "mercadopago:ORD01X:failed:failed",
  "the event id is the fact: order + status + detail",
);
eq(snapshotOf({ status: "processed" }), null, "a body without an id is not an order");

/* ======================================================================== */
/* 2. WEBHOOK SIGNATURE — Mercado Pago's documented HMAC                      */
/* ======================================================================== */

eq(
  manifestFor({ dataId: "ORD01M28P44G5FG8RJPM579EH56FV", requestId: "abc", ts: "1742505638683" }),
  "id:ord01m28p44g5fg8rjpm579eh56fv;request-id:abc;ts:1742505638683;",
  "the manifest follows the documented template, with data.id lowercased",
);
eq(manifestFor({ dataId: null, requestId: null, ts: "1" }), "ts:1;", "absent parts are omitted");
const goodSig = `ts=1742505638683,v1=${sign("s3cret", manifestFor({ dataId: "ORD1", requestId: "r", ts: "1742505638683" }))}`;
ok(
  verifySignature({ secret: "s3cret", signatureHeader: goodSig, requestId: "r", dataId: "ORD1" }),
  "a correctly signed delivery verifies",
);
ok(
  !verifySignature({ secret: "other", signatureHeader: goodSig, requestId: "r", dataId: "ORD1" }),
  "the wrong secret does not verify",
);
ok(
  !verifySignature({ secret: "s3cret", signatureHeader: goodSig, requestId: "r", dataId: "ORD2" }),
  "a signature for another payment does not verify",
);
ok(
  !verifySignature({
    secret: "s3cret",
    signatureHeader: goodSig,
    requestId: "other",
    dataId: "ORD1",
  }),
  "a signature for another request id does not verify",
);
ok(
  !verifySignature({ secret: "s3cret", signatureHeader: null, requestId: "r", dataId: "ORD1" }),
  "a missing signature does not verify",
);
eq(parseSignatureHeader("ts=abc,v1=zz"), null, "a malformed signature header is rejected");

/* ======================================================================== */
/* 3. CONFIGURATION                                                           */
/* ======================================================================== */

eq(readMercadoPagoConfig({})?.mode ?? null, null, "no variables → not configured");
eq(
  readMercadoPagoConfig({
    MERCADOPAGO_MODE: "production",
    MERCADOPAGO_ACCESS_TOKEN: "a",
    MERCADOPAGO_PUBLIC_KEY: "b",
    MERCADOPAGO_WEBHOOK_SECRET: "c",
  }),
  null,
  "a mode other than test/live is refused",
);
eq(activeProvider().id, "mercadopago", "with test credentials Mercado Pago is the active provider");
eq(paymentAvailable(), true, "test mode on memory storage is available");

/* ======================================================================== */
/* 4. INSTRUMENT — what the browser may send                                  */
/* ======================================================================== */

ok(readInstrument(card("APRO")) !== null, "a well-formed tokenized instrument is accepted");
eq(
  readInstrument({ ...card("APRO"), installments: 12 }),
  null,
  "instalments other than 1 are refused",
);
eq(
  readInstrument({ ...card("APRO"), token: "4111 1111 1111 1111" }),
  null,
  "a card number is not a token",
);
eq(
  readInstrument({ ...card("APRO"), typeId: "account_money" }),
  null,
  "an unknown payment type is refused",
);
eq(
  readInstrument({ ...card("APRO"), methodId: "<script>" }),
  null,
  "a hostile method id is refused",
);
eq(readInstrument(null), null, "no instrument is refused");
const tampered = readInstrument({ ...card("APRO"), amount: 1, transaction_amount: 1, total: 1 });
ok(
  tampered !== null && !("amount" in tampered) && !("transaction_amount" in tampered),
  "a posted amount is not even read",
);
ok(isOrderId("NG-MFQ1ZQ8W-4K2"), "an order id shape is recognised");
ok(!isOrderId("NG-1; drop table"), "a hostile order id is refused");

/* ======================================================================== */
/* 5. THE JOURNEY                                                             */
/* ======================================================================== */

__resetOrderStore();
__resetOutbox();

/* --- 5a. approved card, and price tampering ------------------------------ */
{
  const order = await placed(12000);
  const out = await submitPayment(order.id, card("APRO"));
  eq(out.kind, "paid", "an approved test card pays the order");
  const after = await load(order.id);
  eq(after.state, "paid", "the order is paid — from the provider's answer");
  eq(after.attempts.length, 1, "one attempt is recorded");
  eq(after.attempts[0].outcome, "answered", "the attempt is answered");
  eq(
    after.attempts[0].idempotencyKey,
    `${order.id}:attempt:1`,
    "the idempotency key is stable per attempt",
  );
  ok(
    after.providerRef?.startsWith("ORD01TEST"),
    "the Mercado Pago order id is the provider reference",
  );

  const post = mp.posts.at(-1);
  eq(post.key, `${order.id}:attempt:1`, "the idempotency key is sent to Mercado Pago");
  eq(post.body.total_amount, "12000.00", "the charge is the ORDER's total");
  eq(post.body.transactions.payments[0].amount, "12000.00", "and so is the payment amount");
  eq(post.body.external_reference, order.id, "the order id travels as the external reference");
  eq(
    post.body.payer.email,
    SANDBOX_PAYER_EMAIL,
    "test mode sends Mercado Pago's sandbox payer email",
  );
  eq(post.body.transactions.payments[0].payment_method.installments, 1, "one instalment");
  ok(!("items" in post.body), "no line items are sent (data minimisation)");
  ok(!JSON.stringify(post.body).includes(order.shipping.street), "no address is sent");
  ok(!JSON.stringify(after).includes("tok-APRO"), "the card token is not stored on the order");

  const pending = await memoryOutbox().pending();
  eq(
    pending.filter((e) => e.message.id.startsWith(order.id)).length,
    2,
    "the order-placed messages are queued once, on payment — not sent",
  );

  /* DUPLICATE SUBMISSION after payment: no second charge. */
  const posts = mp.posts.length;
  const again = await submitPayment(order.id, card("APRO"));
  eq(again.kind, "paid", "a second submission reports the order as paid");
  eq(mp.posts.length, posts, "and never reaches Mercado Pago");
  eq((await load(order.id)).attempts.length, 1, "and records no second attempt");
}

/* --- 5b. concurrent double submission ------------------------------------ */
{
  const order = await placed(15000);
  const posts = mp.posts.length;
  const [a, b] = await Promise.all([
    submitPayment(order.id, card("APRO")),
    submitPayment(order.id, card("APRO")),
  ]);
  eq(mp.posts.length - posts, 1, "two simultaneous submissions produce exactly one charge");
  ok([a.kind, b.kind].includes("paid"), "one of them reports the payment");
  eq((await load(order.id)).state, "paid", "the order ends paid, once");
}

/* --- 5c. decline, then retry ---------------------------------------------- */
{
  const order = await placed(12000);
  const declined = await submitPayment(order.id, card("OTHE"));
  eq(declined.kind, "declined", "a rejected test card is a decline");
  eq(declined.reason, "issuer_rejected", "with the issuer's reason");
  let now = await load(order.id);
  eq(now.state, "payment_failed", "the order is failed, not deleted");
  eq(lastDecline(now), "issuer_rejected", "the decline reason is on the record");
  eq(now.lines.length, 1, "the order's lines are untouched");
  const firstRef = now.attempts[0].providerRef;

  const funds = await submitPayment(order.id, card("FUND"));
  eq(funds.reason, "insufficient_funds", "a second decline carries its own reason");

  const retry = await submitPayment(order.id, card("APRO"));
  eq(retry.kind, "paid", "a retry with a good card pays the same order");
  now = await load(order.id);
  eq(now.attempts.length, 3, "three attempts are recorded");
  eq(new Set(now.attempts.map((a) => a.idempotencyKey)).size, 3, "each attempt had its own key");
  ok(now.providerRef !== firstRef, "the order now points at the successful Mercado Pago order");

  /* A late webhook for the FIRST (declined) attempt cannot touch the paid order. */
  const late = await webhook(signedWebhook(firstRef));
  eq(late.status, 200, "a late webhook for an earlier attempt is acknowledged");
  eq((await load(order.id)).state, "paid", "and the order stays paid");
}

/* --- 5d. pending card settled by webhook ----------------------------------- */
{
  const order = await placed(20000);
  const out = await submitPayment(order.id, card("CONT"));
  eq(out.kind, "processing", "a pending test card leaves the payment processing");
  let now = await load(order.id);
  eq(now.state, "payment_processing", "the order is processing — not paid");
  const ref = now.providerRef;

  /* A webhook whose BODY claims success, while Mercado Pago still says processing. */
  const liar = await webhook(
    signedWebhook(ref, {
      body: { type: "order", data: { id: ref, status: "processed", status_detail: "accredited" } },
    }),
  );
  eq(liar.status, 200, "a signed webhook is acknowledged");
  eq((await load(order.id)).state, "payment_processing", "a body claiming success is not believed");

  /* Now Mercado Pago approves it. */
  mp.set(ref, "processed", "accredited");
  const settled = await webhook(signedWebhook(ref, { requestId: "req-2" }));
  const body = await settled.json();
  eq(settled.status, 200, "the settling webhook is acknowledged");
  eq(body.state, "paid", "the order is paid once Mercado Pago says so");
  now = await load(order.id);
  const events = now.events.length;

  /* DUPLICATE and REPLAYED deliveries. */
  const dup = await (await webhook(signedWebhook(ref, { requestId: "req-2" }))).json();
  eq(dup.outcome, "duplicate", "a duplicate webhook is recognised");
  const replay = await (await webhook(signedWebhook(ref, { requestId: "req-3" }))).json();
  eq(replay.outcome, "duplicate", "a redelivery with a new request id is still a duplicate");
  eq((await load(order.id)).events.length, events, "duplicates write nothing");

  /* A refund arrives later and is applied. */
  mp.set(ref, "refunded", "refunded");
  await webhook(signedWebhook(ref, { requestId: "req-4" }));
  eq((await load(order.id)).state, "refunded", "a refund reported by Mercado Pago is applied");
  /* A late 'processed' after the refund cannot re-pay it. */
  mp.set(ref, "processed", "accredited");
  await webhook(signedWebhook(ref, { requestId: "req-5" }));
  eq((await load(order.id)).state, "refunded", "a stale approval cannot un-refund an order");
}

/* --- 5e. action required (pending_payment) and revisit refresh ------------- */
{
  const order = await placed(11000);
  const out = await submitPayment(order.id, card("WAIT"));
  eq(out.kind, "pending", "a payment awaiting the payer is pending");
  const now = await load(order.id);
  eq(now.state, "pending_payment", "the order awaits payment");
  mp.set(now.providerRef, "processed", "accredited");
  const refreshed = await refreshPayment(now);
  eq(refreshed.state, "paid", "a revisit asks Mercado Pago and applies the answer");
  const gets = mp.gets;
  await refreshPayment({ ...refreshed, state: "payment_processing" });
  eq(mp.gets, gets, "refreshes are throttled per order");
}

/* --- 5f. integrity: amount and reference ----------------------------------- */
{
  const order = await placed(12000);
  const out = await submitPayment(order.id, card("SHORT"));
  const now = await load(order.id);
  ok(now.state !== "paid", "an approval for a different amount never pays the order");
  ok(
    now.events.some((e) => e.note === "amount_mismatch"),
    "the mismatch is recorded",
  );
  ok(out.kind !== "paid", "and the customer is not told it is paid");

  const other = await placed(12000);
  await submitPayment(other.id, card("ELSEWHERE"));
  const o2 = await load(other.id);
  ok(o2.state !== "paid", "an approval naming another order never pays this one");
  ok(
    o2.events.some((e) => e.note === "external_reference_mismatch"),
    "the reference mismatch is recorded",
  );
}

/* --- 5g. the answer is lost -------------------------------------------------- */
{
  const order = await placed(13000);
  const out = await submitPayment(order.id, card("LOST"));
  eq(out.kind, "processing", "a lost answer is processing, never declined");
  let now = await load(order.id);
  eq(now.state, "payment_processing", "the order waits");
  eq(now.providerRef, null, "with no provider reference");
  eq(now.attempts[0].outcome, "unanswered", "the attempt is recorded as unanswered");

  const blocked = await submitPayment(order.id, card("APRO"));
  eq(blocked.kind, "processing", "no second charge while the first may have gone through");

  /* The webhook arrives: found by external reference, applied. */
  const mpId = [...mp.orders.values()].find((o) => o.external_reference === order.id).id;
  const res = await (await webhook(signedWebhook(mpId))).json();
  eq(res.state, "paid", "the webhook finds the order by external reference and settles it");
  now = await load(order.id);
  eq(now.providerRef, mpId, "and adopts the provider reference");
}

/* --- 5h. a request that never arrived, and the stall release --------------- */
{
  const order = await placed(14000);
  const out = await submitPayment(order.id, card("NEVER"));
  eq(out.kind, "processing", "an unanswered request holds the order");
  const now = await load(order.id);
  eq(recoverStalledAttempt(now, now.updatedAt), null, "a fresh attempt is not released");
  const later = new Date(Date.parse(now.attempts[0].at) + STALLED_ATTEMPT_MS + 1000).toISOString();
  const released = recoverStalledAttempt(now, later);
  eq(
    released?.state,
    "payment_failed",
    "a stalled attempt with no reference is released for retry",
  );
  eq(lastDecline(released), "unconfirmed", "and says why");
}

/* --- 5i. provider refusals ------------------------------------------------- */
{
  const order = await placed(12000);
  const bad = await submitPayment(order.id, card("BAD"));
  eq(bad.kind, "declined", "a 400 from Mercado Pago is a decline the customer can fix");
  eq((await load(order.id)).state, "payment_failed", "nothing was created, the order is retryable");

  const down = await placed(12000);
  const out = await submitPayment(down.id, card("DOWN"));
  eq(out.kind, "processing", "a 500 is treated as unknown — money may have moved");
}

/* --- 5j. idempotency of a claimed attempt ----------------------------------- */
{
  const order = await placed(12000);
  const claimed = beginAttempt(order, { provider: "mercadopago", at: new Date().toISOString() });
  eq(
    beginAttempt(claimed, { provider: "mercadopago", at: "x" }),
    null,
    "an open attempt blocks another",
  );
  eq(
    beginAttempt({ ...order, state: "paid" }, { provider: "mercadopago", at: "x" }),
    null,
    "a paid order cannot begin an attempt",
  );
  eq(
    beginAttempt({ ...order, state: "pending_payment" }, { provider: "mercadopago", at: "x" }),
    null,
    "money in flight blocks an attempt",
  );
}

/* ======================================================================== */
/* 6. THE WEBHOOK ROUTE — hostile input                                       */
/* ======================================================================== */

{
  const known = [...mp.orders.keys()][0];
  const unsigned = await webhook(
    new Request(`https://neogen.mx/api/payments/webhook?data.id=${known}&type=order`, {
      method: "POST",
      body: JSON.stringify({ type: "order", data: { id: known } }),
    }),
  );
  eq(unsigned.status, 401, "an unsigned webhook is refused");

  const wrong = await webhook(signedWebhook(known, { secret: "not-the-secret" }));
  eq(wrong.status, 401, "a webhook signed with another secret is refused");

  const retargeted = signedWebhook(known);
  const moved = new Request(retargeted.url.replace(known, "ORD01TEST9999"), {
    method: "POST",
    headers: retargeted.headers,
    body: await retargeted.text(),
  });
  eq((await webhook(moved)).status, 401, "a valid signature cannot be moved to another payment");

  const other = await webhook(signedWebhook("12345", { type: "payment" }));
  eq(other.status, 200, "an authentic event for another topic is acknowledged");
  eq((await other.json()).outcome, "ignored", "and ignored");

  const malformed = await webhook(signedWebhook("bad id!"));
  eq(malformed.status, 400, "a signed webhook with a malformed id is refused");

  const unknown = await (await webhook(signedWebhook("ORD01NOTOURS"))).json();
  eq(
    unknown.outcome,
    "unknown_payment",
    "a payment Mercado Pago does not know is acknowledged, not retried",
  );

  const huge = await webhook(
    new Request("https://neogen.mx/api/payments/webhook", {
      method: "POST",
      headers: { "content-length": String(1024 * 1024) },
      body: "x".repeat(70 * 1024),
    }),
  );
  eq(huge.status, 413, "an oversized body is refused");

  const probe = await (await webhookProbe()).json();
  eq(probe.payments, "enabled", "the probe reports availability without details");

  const saved = process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  eq((await webhook(signedWebhook(known))).status, 503, "an unconfigured deployment answers 503");
  process.env.MERCADOPAGO_ACCESS_TOKEN = saved;
}

/* ======================================================================== */
/* 7. RECONCILIATION — pure checks                                            */
/* ======================================================================== */

{
  const order = makeOrder(5000);
  const snapshot = {
    providerRef: "ORD1",
    eventId: "mercadopago:ORD1:processed:accredited",
    state: "paid",
    detail: null,
    amount: mxn(5000),
    externalReference: order.id,
    live: false,
  };
  eq(
    reconcileSnapshot(order, snapshot, "mercadopago", "t").order.state,
    "paid",
    "a matching approval pays",
  );
  eq(
    reconcileSnapshot(order, { ...snapshot, amount: null }, "mercadopago", "t").outcome,
    "rejected",
    "an approval without an amount is refused",
  );
  eq(
    reconcileSnapshot(
      order,
      { ...snapshot, amount: { amount: 5000, currency: "USD" } },
      "mercadopago",
      "t",
    ).outcome,
    "rejected",
    "an approval in another currency is refused",
  );
  eq(
    reconcileSnapshot(order, { ...snapshot, state: null }, "mercadopago", "t").outcome,
    "noop",
    "a no-change state writes nothing",
  );
}

/* ======================================================================== */
/* 8. THE ADAPTER WITHOUT CONFIGURATION                                       */
/* ======================================================================== */

{
  const provider = createMercadoPagoProvider({ config: () => null });
  eq(provider.isConfigured(), false, "an adapter with no config is not configured");
  eq(provider.prepare(makeOrder()).ok, false, "and prepares nothing");
  eq(
    (await provider.charge(makeOrder(), card("APRO"), "k")).kind,
    "refused",
    "and charges nothing",
  );
  const prepared = activeProvider().prepare(makeOrder(9000));
  eq(
    prepared.ok && prepared.action.amount.amount,
    9000,
    "the card form is initialised with the order total",
  );
  eq(prepared.ok && prepared.action.testMode, true, "and knows it is in test mode");
  ok(
    prepared.ok && !JSON.stringify(prepared.action).includes("access-token"),
    "the access token never reaches the page",
  );
}

/* ======================================================================== */
/* 9. POSTGRES — the durable adapters on a real Postgres engine (PGlite)       */
/* ======================================================================== */

{
  const { PGlite } = await import("@electric-sql/pglite");
  const { createPostgresOrderRepository } =
    await import("../src/domain/order/adapters/postgres.ts");
  const { createPostgresDraftStore } = await import("../src/domain/checkout/adapters/postgres.ts");

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
  const migration = readFileSync(
    path.resolve(import.meta.dirname, "../db/migrations/001_orders.sql"),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  passed += 1; /* the migration is idempotent: applying it twice did not throw */

  const repo = createPostgresOrderRepository(client);
  const order = makeOrder(12000);
  const created = await repo.create(order);
  ok(created.ok, "an order persists in Postgres");
  eq((await repo.create(order)).ok, false, "the same id cannot be created twice");
  eq((await repo.get(order.id)).totals.total.amount, 12000, "an order reads back whole");

  /* Optimistic concurrency: a stale write loses. */
  const first = await repo.get(order.id);
  const second = await repo.get(order.id);
  ok((await repo.save({ ...first, status: "in_review" })).ok, "a current write succeeds");
  const stale = await repo.save({ ...second, status: "preparing" });
  eq(stale.ok ? "saved" : stale.reason, "version_conflict", "a stale write is refused");

  /* mutate re-decides against fresh state, with two concurrent writers. */
  const racers = await Promise.all([
    mutate(repo, order.id, (o) =>
      beginAttempt(o, { provider: "mercadopago", at: "2026-09-19T11:00:00.000Z" }),
    ),
    mutate(repo, order.id, (o) =>
      beginAttempt(o, { provider: "mercadopago", at: "2026-09-19T11:00:00.000Z" }),
    ),
  ]);
  eq(
    racers.filter((r) => r.ok && r.changed).length,
    1,
    "of two concurrent claims on Postgres, exactly one wins",
  );
  eq((await repo.get(order.id)).attempts.length, 1, "and one attempt is stored");

  /* Provider references and event ids, indexed. */
  const withRef = await repo.get(order.id);
  withRef.providerRef = "ORD01PG";
  withRef.attempts = withRef.attempts.map((a) => ({ ...a, providerRef: "ORD01PG" }));
  withRef.events = [
    ...withRef.events,
    {
      seq: withRef.events.length + 1,
      at: "t",
      kind: "payment_event_applied",
      providerEventId: "mercadopago:ORD01PG:processed:accredited",
      from: "payment_processing",
      to: "paid",
      note: null,
    },
  ];
  ok((await repo.save(withRef)).ok, "an order with a provider reference saves");
  eq(
    (await repo.findByProviderRef("ORD01PG"))?.id,
    order.id,
    "a provider reference resolves to its order",
  );
  ok(
    await repo.hasProviderEvent("mercadopago:ORD01PG:processed:accredited"),
    "a provider event id is globally known",
  );
  eq(await repo.hasProviderEvent("never"), false, "an unseen event id is not");

  /* An earlier attempt's reference still resolves after the order moves on. */
  const moved = await repo.get(order.id);
  moved.providerRef = "ORD01PG2";
  ok((await repo.save(moved)).ok, "the order moves to a new reference");
  eq(
    (await repo.findByProviderRef("ORD01PG"))?.id,
    order.id,
    "the old reference still finds the order",
  );

  const drafts = createPostgresDraftStore(client, () => 1);
  await drafts.put({ id: "d1", orderId: null, snapshot: { lines: [] } });
  eq((await drafts.get("d1"))?.id, "d1", "a draft persists in Postgres");
  await db.query(
    `update neogen_checkout_drafts set updated_at = now() - interval '3 days' where id = 'd1'`,
  );
  eq(await drafts.get("d1"), null, "an expired draft reads as absent");
  await drafts.delete("d1");
  await db.close();
}

/* ---- report --------------------------------------------------------------- */

if (failures.length) {
  console.error(`\npayments check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `payments check passed — ${passed} assertions: Mercado Pago Orders API vocabulary, ` +
    `webhook HMAC, charge integrity, retries, duplicates, reconciliation, Postgres`,
);
