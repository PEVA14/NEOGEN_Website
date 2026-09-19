# Payments: Mercado Pago integration

**Status (2026-09-19):** the integration is complete and runs against Mercado
Pago's **test** environment. It has not processed a real test payment yet
because no credentials exist; the automated suite (`npm run check:payments`)
exercises it against a scripted fake of the Orders API.

**Production is blocked on merchant eligibility, not code.** Mercado Pago's
seller policies restrict medicamentos without registro sanitario (see
PROJECT_STATE §6, blocker 2). Whether NEOGEN's catalogue is accepted is a
decision for Mercado Pago and the classification review. Nothing here works
around that review.

Read with `docs/CONVENTIONS.md` §13 (checkout) and
`docs/PERSISTENCE_RECOMMENDATION.md`.

---

## 1. The approach, and why

| Choice            | What                                                                                                                        | Why                                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product           | **Checkout API** (Checkout Transparente)                                                                                    | Customers stay inside the NEOGEN checkout. Checkout Pro would redirect to Mercado Pago.                                                                                                                                 |
| API               | **Orders API** (`POST /v1/orders`, `GET /v1/orders/{id}`)                                                                   | Mercado Pago's current recommended path for Checkout API in Mexico. The older Payments API is not used.                                                                                                                 |
| Card capture      | **Card Payment Brick** (`https://sdk.mercadopago.com/js/v2`)                                                                | The integration Mercado Pago recommends for cards. Card number, expiry and security code are Mercado Pago iframes, and the browser turns them into a single-use token. NEOGEN never receives, logs or stores card data. |
| Processing mode   | `automatic`, one payment per order, 1 instalment                                                                            | One request charges the order. Meses sin intereses are a business decision (fees, eligibility) that nobody has made, so the form and the server both enforce 1.                                                         |
| Confirmation      | The synchronous answer to our own charge request, and **webhooks** (topic "Order (Mercado Pago)"), each re-fetched by `GET` | Both come from requests NEOGEN signs with its secret token. A webhook body is never trusted for state (see §6).                                                                                                         |
| SDK on the server | None: plain `fetch`                                                                                                         | Four HTTPS calls. One less dependency holding a secret.                                                                                                                                                                 |

Sources, read 2026-09-19 on developers.mercadopago.com (MX):

- `checkout-api-orders/overview`
- `…/payment-integration/cards`
- `…/notifications`
- `…/payment-management/status/order-status`
- `…/payment-management/status/transaction-status`
- `…/payment-management/integration-errors`
- `…/resources/test-cards`
- `…/integration-test/cards`
- `…/go-to-production`
- `checkout-bricks/common-initialization`
- sdk-js `docs/bricks/card-payment.md`

## 2. Architecture

```
bag (browser)
  → beginCheckout: reprice against the registry          server/checkout/actions.ts
  → contact → shipping → delivery → review               draft, server state
  → placeOrder: freeze the snapshot into an Order        state `created`
  → /checkout/pago/[id]: Card Payment Brick              components/checkout/MercadoPagoCardForm.tsx
  → payOrder (server action): ownership + input check    server/checkout/pay.ts, payments/instrument.ts
  → submitPayment: claim attempt → charge → reconcile    server/payments.ts
      → PaymentProvider.charge                            payments/adapters/mercadopago
          → POST /v1/orders (X-Idempotency-Key)
  → reconcileSnapshot → applyPaymentEvent               payments/reconcile.ts, domain/order/events.ts
  → confirmation page (refreshes in-flight payments)     checkout/confirmacion/[id]
webhook → /api/payments/webhook → verify HMAC → GET /v1/orders/{id} → reconcileSnapshot
```

- **Provider-independent.** Mercado Pago's vocabulary exists only in
  `src/payments/adapters/mercadopago/`. The order machine sees NEOGEN states,
  the UI sees NEOGEN decline reasons, and nothing outside the adapter knows the
  provider's name, except one string: the `component` key that names which
  client island mounts the embedded fields.
- **A second provider** is one adapter implementing `PaymentProvider`
  (`src/payments/types.ts`) plus one line in the registry
  (`src/payments/index.ts`). Its client island would be a sibling of
  `MercadoPagoCardForm`.
- **Review comes before payment.** A charge is against an order, and an
  order's amounts are frozen at review. The step order is now contact →
  shipping → delivery → review → payment → confirmation.

## 3. Payment state mapping

Order-level `status` / `status_detail` → NEOGEN `PaymentState`
(`vocabulary.ts`; `check:payments` asserts every documented row):

| Mercado Pago order                                                             | NEOGEN                    | Notes                                                   |
| ------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------- |
| `created`                                                                      | no change                 | Nothing processed yet                                   |
| `processing` / any, `in_review`                                                | `payment_processing`      | Page refreshes itself; no second charge possible        |
| `action_required` / `waiting_payment`, `waiting_transfer`, `pending_challenge` | `pending_payment`         | The payer must act                                      |
| `action_required` / `waiting_capture`, `waiting_retry`                         | `payment_processing`      | Processor or seller acts next                           |
| `processed` / `accredited`, `partially_refunded`                               | `paid`                    | Only if amount and external reference match (§5)        |
| `failed`                                                                       | `payment_failed` + reason | Retryable                                               |
| `canceled`, `expired`                                                          | `payment_failed` + reason | A failed **attempt**; the NEOGEN order is not cancelled |
| `refunded`                                                                     | `refunded`                |                                                         |
| `charged_back`                                                                 | `disputed` (new state)    | Operator decides; `disputed → paid / refunded`          |
| anything undocumented                                                          | no change                 | Never guessed                                           |

Transaction `status_detail` → `DeclineReason` (one customer sentence each, ES/EN):

| Transaction detail                                | Reason               |
| ------------------------------------------------- | -------------------- |
| `insufficient_amount`, `card_insufficient_amount` | `insufficient_funds` |
| `bad_filled_card_data`, `invalid_card_token`      | `card_data`          |
| `required_call_for_authorize`                     | `call_for_authorize` |
| `card_disabled`                                   | `card_disabled`      |
| `high_risk`                                       | `high_risk`          |
| `rejected_by_issuer`                              | `issuer_rejected`    |
| `amount_limit_exceeded`                           | `amount_limit`       |
| `invalid_installments`                            | `installments`       |
| `max_attempts_exceeded`                           | `attempts_exceeded`  |
| `3ds_challenge_expired`                           | `expired`            |
| anything else                                     | `generic`            |

Other reasons, not from a transaction detail:

- `cancelled` and `expired` come from the order status.
- `unconfirmed` is NEOGEN's own reason: an attempt that went unanswered for 15 minutes.

HTTP answers to `POST /v1/orders`:

| Answer                                                        | What NEOGEN does                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 2xx or 402 with an order body                                 | Apply it (402 is how a declined card is answered)                                                       |
| 400, 402 without a body                                       | Refused: nothing was created. `payment_failed`; the customer may retry                                  |
| 401, 403, 429                                                 | Refused for a non-card reason: nothing was created. Retryable                                           |
| 409 (key used), 423 (key locked), 5xx, timeout, network error | **Unanswered.** Money may have moved, so the order stays `payment_processing` for the webhook to settle |

## 4. Idempotency and duplicate protection

| Threat                                  | Guard                                                                                                                                                                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double click, second tab, replayed POST | `beginAttempt` claims the order under its optimistic version lock **before** calling Mercado Pago. Only `created` and `payment_failed` are payable, and an open attempt blocks another. Proven: two simultaneous submissions produce exactly one charge          |
| Retried request to Mercado Pago         | `X-Idempotency-Key = <order id>:attempt:<n>`. Stable per attempt, never random                                                                                                                                                                                   |
| Duplicate or redelivered webhook        | Event id = the **fact**: `mercadopago:<order>:<status>:<detail>`. It is checked globally before the order is loaded, and stored under a unique key (Postgres primary key). The synchronous answer and its webhook share the key, so they apply once between them |
| Late or out-of-order event              | The `TRANSITIONS` table refuses it. `paid` has no way back except `refunded` / `disputed`                                                                                                                                                                        |
| Late event for an earlier attempt       | Refused and recorded. If it claims payment, the note `paid_on_earlier_attempt` flags a charge to reconcile by hand                                                                                                                                               |
| A bare "mark as paid"                   | `transition()` refuses `paid` from every state. Only a provider snapshot can set it                                                                                                                                                                              |
| Refresh or revisit                      | The payment page redirects anything not payable to the confirmation. In-flight orders are re-fetched from Mercado Pago (throttled per order)                                                                                                                     |
| Lost answer                             | The order waits in `payment_processing`. The webhook finds it by `external_reference` (the NEOGEN order id). With no reference after 15 minutes, it is released to `payment_failed` (`unconfirmed`); a late approval can still move `payment_failed → paid`      |

## 5. Integrity checks (never paid unless all hold)

- The snapshot's `external_reference` equals the order id.
- For `paid`: the snapshot's amount and currency equal the order's frozen total.
  A mismatch is recorded as `amount_mismatch` and the order is not paid.
- The amount charged is always `order.totals.total`, read on the server. The
  server action has no amount field, and the Brick's `transaction_amount` is
  ignored.
- The bag is repriced from the registry when checkout starts, and again before
  the order is created (existing Phase 10 behaviour).

## 6. Webhook verification

Mercado Pago's documented scheme, in `adapters/mercadopago/signature.ts`:

- The `x-signature: ts=<ms>,v1=<hex>` header carries the signature.
- The manifest is `id:<data.id from the query, lowercased>;request-id:<x-request-id>;ts:<ts>;`.
- `v1` is HMAC-SHA256 of the manifest with the webhook secret, compared in
  constant time.

Route responses:

| Response | When                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------- |
| 401      | Missing or invalid signature                                                                   |
| 400      | Malformed id                                                                                   |
| 413      | Body over 64 KB                                                                                |
| 200      | Handled, duplicate, ignored topic, or unknown payment                                          |
| 503      | Mercado Pago unreachable, write conflict, or payments unconfigured, so the delivery is retried |

The signature does not cover the body, so the body is never read for state:
the verified id is used to `GET /v1/orders/{id}`. There is no timestamp window,
because a replay only causes a fresh fetch, and Mercado Pago's retry `ts`
behaviour is undocumented.

## 7. What NEOGEN stores, and what stays with Mercado Pago

| NEOGEN stores (order record)                                                                                                                                                                                        | Only Mercado Pago holds                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mercado Pago order id(s) per attempt, attempt outcome, idempotency key, NEOGEN payment state, decline reason code, audit events (fact ids, from → to, note), plus the order itself: lines, totals, contact, address | Card number, expiry, security code, cardholder name, the card token after use, issuer, tax id (passed through from the Brick, never stored), bank responses |

- **Sent to Mercado Pago:** the total, the order id, the payer email, the
  optional tax id from the Brick, and the token.
- **Not sent:** line items, product names, phone and address. Whether to
  send items (it may help Mercado Pago's risk scoring) is an owner decision.
- **Logging:** nothing in the payment path logs a request body, a token or a
  secret.

## 8. Environment variables

See `.env.example`.

| Variable                       | Secret  | Notes                                                                                                                                 |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_COMMERCE_ENABLED` | no      | Business switch. Build-time. `true` to open the bag and checkout                                                                      |
| `MERCADOPAGO_MODE`             | no      | `test` or `live`. Explicit: test and production tokens share the `APP_USR-` prefix                                                    |
| `MERCADOPAGO_ACCESS_TOKEN`     | **yes** | Server only                                                                                                                           |
| `MERCADOPAGO_PUBLIC_KEY`       | no      | Passed to the Brick at render time (runtime, not inlined)                                                                             |
| `MERCADOPAGO_WEBHOOK_SECRET`   | **yes** | Without it the adapter refuses to configure                                                                                           |
| `DATABASE_URL`                 | **yes** | Postgres. Optional in test mode; **required in live mode**: `paymentBlockers()` returns `live_without_database` and payment stays off |

Payment is available when all three hold:

1. The commerce flag is on.
2. All four Mercado Pago variables are valid.
3. For live mode, a database is configured.

Otherwise the review step says payment is unavailable and no order is created.

## 9. Setup required from the owner

1. **Mercado Pago account and application.** In _Your integrations_ →
   _Create application_, choose **Checkout API** / online payments, with the
   Orders integration.
2. **Test credentials.** Go to _Tests → Test credentials_ and activate them.
   Copy the Public Key and the Access Token into `.env.local`, with
   `MERCADOPAGO_MODE=test`.
3. **Webhook.**
   1. Go to _Webhooks → Configure notifications_. Set the URL to
      `https://<your-domain>/api/payments/webhook`. The panel has a
      production-mode tab; confirm in the panel which tab applies to test
      credentials.
   2. Select the event **Order (Mercado Pago)** and save.
   3. Reveal the **secret key** and set `MERCADOPAGO_WEBHOOK_SECRET`.
   4. Use _Simulate notification_ to check the endpoint. A simulated id that
      is not a real order answers 200 `unknown_payment`, which is correct.
4. **Database** (needed for any deployed environment, mandatory for live):
   1. Provision Postgres. Neon via Vercel is recommended.
   2. Set `DATABASE_URL`.
   3. Run `npm run db:migrate` once. It is idempotent.
5. **Production credentials** (later): _Production → Production credentials_
   requires the industry, the website URL and acceptance of Mercado Pago's
   terms. That acceptance is the owner's act. Then set `MERCADOPAGO_MODE=live`.

## 10. Local testing

**Without a public URL** (simplest). Webhooks cannot reach `localhost`, and
they do not need to:

- The synchronous answer settles approved and declined cards immediately.
- The confirmation page re-fetches in-flight orders from Mercado Pago on every
  render. It watches itself for three minutes.

**With webhooks** (a tunnel):

1. Run `cloudflared tunnel --url http://localhost:3000`, or `ngrok http 3000`.
2. Put `https://<tunnel>/api/payments/webhook` in the test-mode webhook
   settings.
3. Webhook deliveries show in the Mercado Pago panel with the route's JSON
   answer (`outcome`, `state`).

**Offline suite:** `npm run check:payments` has 189 assertions against a
scripted Orders API and PGlite. It runs inside `npm run check`.

## 11. A complete test purchase

1. Create `.env.local` with:
   - `NEXT_PUBLIC_COMMERCE_ENABLED=true`
   - `MERCADOPAGO_MODE=test`
   - the test Access Token and Public Key
   - the webhook secret
   - optionally `DATABASE_URL`
2. Restart `npm run dev`. The commerce flag is read at build or dev start.
3. Add products totalling **at least MX$10,000**. Below that, no shipping rate
   exists and review refuses to total the order (blocker 4).
4. Checkout:
   1. At contact, any valid email works. In test mode the server sends
      Mercado Pago's required sandbox payer email, `test@testuser.com`.
   2. Enter an address, then a delivery method.
   3. At review, choose **Continue to payment**.
5. On the payment step, use a test card with 1 instalment. The cardholder
   name picks the result:
   - Mastercard `5474 9254 3267 0366` or Visa `4075 5957 1648 3764`,
     CVV 123, expiry 11/30.
   - `APRO`: approved. You land on the confirmation, which says "Pago
     confirmado" and clears the bag.
   - `OTHE`: declined. The reason shows, and the form is fresh for a retry.
     The order and bag are untouched.
   - `CONT`: pending. The confirmation shows "Estamos confirmando tu pago"
     and refreshes until Mercado Pago settles it.
   - `FUND`, `CALL`, `SECU`, `EXPI`: specific decline reasons.
6. Verify the order at Mercado Pago with `GET /v1/orders/{id}` and the test
   token, as its test guide describes. The id is the order's `providerRef`.

## 12. What still blocks accepting a real payment

1. **Merchant eligibility.** Mercado Pago must accept NEOGEN's business and
   catalogue (see §6 of PROJECT_STATE: its policy restricts medicamentos
   without registro sanitario). Classification review first.
2. **Production credentials** activated by the owner (industry, website,
   terms), and an **SSL** production domain (mandatory per Mercado Pago).
3. **Durable database** provisioned and migrated. Live mode refuses to run
   without one.
4. **Regulatory classification review**, which also gates the commerce flag.
5. **Final prices**, and with them tax handling (IVA is to be included in
   displayed prices).
6. **Shipping rates below MX$10,000.** Such orders cannot be totalled today.
7. **Legal texts:** Terms, Privacy notice (including the 2025 LFPDPPP
   international-transfer question), returns and refunds. None are approved.
8. **Email provider**, for customer and operator messages. Today they are
   queued as `pending` in an in-memory outbox and **not sent**.
9. **Operations:** there is no admin UI to see paid orders, act on
   `disputed` or `paid_on_earlier_attempt`, or trigger refunds. The adapter's
   `refund()` exists but nothing calls it.

## 13. Architected, not enabled

These need business decisions and are not switched on:

- **Meses sin intereses.** Fees and eligibility are undecided.
- **SPEI, OXXO and other cash methods.** They would render as `instructions`
  and sit in `pending_payment`. Undecided: which methods, expiry windows, and
  whether this catalogue is eligible.
- **3-D Secure challenge.** A `pending_challenge` answer maps to
  `pending_payment`, but no challenge UI exists. Mercado Pago's risk settings
  decide whether it is ever requested; if it is, the challenge flow is the
  next piece to build.
- **Saved cards and customer accounts.**
- **Partial refunds.**
