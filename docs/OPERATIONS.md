# Operations: orders after checkout

**Status (2026-09-23):** built and tested offline, not deployed. It covers
the order model, the operations console (`/ops`), fulfilment, shipments
recorded by hand, inventory, lots, refunds, notifications, customer order
status, analytics and observability. There is no carrier, email provider,
analytics product, ERP or invoicing provider. Each has a boundary with an
honest "not configured" adapter.

Read with `docs/PAYMENTS.md` (the payment core, unchanged in principle) and
`docs/CONVENTIONS.md` §12b.

---

## 1. The model

The **NEOGEN order** (`NG-…`) is the identity. Everything else is attached to
it: the Mercado Pago order ids per attempt, shipment ids, carrier tracking
numbers and future ERP ids. No external id ever replaces it.

An order has **three separate axes**:

| Axis       | Field                     | Who moves it                                   | States                                                                                            |
| ---------- | ------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Payment    | `order.state`             | only the payment provider's answer (unchanged) | created, pending_payment, payment_processing, paid, payment_failed, cancelled, refunded, disputed |
| Fulfilment | `order.fulfilment.state`  | the system (queue on payment) and operators    | unfulfilled, queued, preparing, ready_to_ship, fulfilled, on_hold, cancelled                      |
| Shipment   | `order.shipments[].state` | operators today; a carrier adapter later       | pending, in_transit, exception, delivered, returned, cancelled (summary: `not_shipped`)           |

They combine freely. For example:

- paid · preparing · not_shipped
- refunded · cancelled · cancelled
- disputed · on_hold · not_shipped
- refunded · fulfilled · delivered (a refund after delivery)

Beside them the order carries:

- `cancellation`
- `refunds[]`
- `fulfilment.lots[]` (lot per line)
- `milestones` (the first time each point was reached)
- `notes[]` (internal)
- `externalRefs[]`
- `acks[]` (attention acknowledged)
- `access.nonce` (guest link)

### Rules enforced in the domain (`src/domain/order/operations.ts`)

- **Payment gates fulfilment.** Nothing is queued, prepared, packed or
  dispatched unless the payment is `paid`.
- **Dispatch alone fulfils.** `fulfilled` is reached only by dispatching a
  shipment, which fulfils the order in the same write.
- **The provider confirms money.** A refund is `requested` by NEOGEN and
  `submitted` to the provider. It becomes `confirmed` only when the provider's
  payment state says `refunded`, the same rule as `paid`.
- **Cancelling depends on where the order is:**
  - Unpaid: the payment is cancelled.
  - Paid: fulfilment stops and a full refund is requested.
  - Disputed: fulfilment stops, with no refund. The chargeback is already
    moving the money.
  - Payment in flight: refused.
  - Already dispatched: refused, because that is a return.
- **Payment changes carry across (`followPayment`):**
  - `paid` queues an unfulfilled order and lifts a dispute hold.
  - `disputed` holds the work.
  - `refunded` confirms the open refund, or records a provider-side one. It
    cancels work not yet dispatched and leaves a parcel already out as it is.
- **Old orders read upgraded.** Orders stored before this pass are upgraded on
  read (`upgradeOrder`): a paid order joins the queue, and nothing else is
  invented.

## 2. Events

`order.events` is the audit trail. It was extended, not replaced. Each event
has:

- `kind`
- `axis`
- `from` / `to`
- `source` (system, customer, provider or operator)
- `actor` (the operator's account name)
- `ref` (a shipment, refund or lot id)
- `meta` (scalars only: carrier, tracking number, SKU, quantity)

Events never carry tokens, payloads or addresses.

**Deduplication:**

- Provider events are deduplicated globally by `providerEventId`, the
  database's primary key. A future carrier webhook uses the same field.
- Operator actions are serialised by the order's version lock. A repeated
  click finds an illegal transition, so two operators pressing "ready to ship"
  produce one transition and one refusal.

## 3. The console (`/ops`)

A separate root layout: Spanish, no storefront chrome, Quiet Mode.

| Page                        | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ops/pedidos`              | Views with counts, grouped: Atención; Preparar y enviar (Por preparar, En preparación, Listos para envío); En camino; Completados; then Pagos y cierres (Pendientes de pago, En disputa, Reembolsados, Cancelados) and Todos. A selector on a phone. Each row shows the order number, customer, destination, items, age, the three states, and why it needs attention or its next step. Search takes an order-number prefix or an exact email.                                        |
| `/ops/pedidos/[id]`         | The lifecycle (payment, preparation, shipping, delivery) and one "Qué sigue" block with the attention reasons ("mark reviewed" for event reasons) and the main action. Then items with lots, preparation, shipments, payment and refunds (raw provider detail folded away), history by day, customer, summary, stock holds, messages, notes, external references and cancellation. Every action states whether it can be undone, moves money, notifies the customer or changes stock. |
| `/ops/pedidos/[id]/empaque` | A printable packing slip: order number, recipient, and per line SKU, product, presentation, quantity and lots, with a tick box. It has no prices and no invented warehouse bins.                                                                                                                                                                                                                                                                                                      |
| `/ops/inventario`           | A status band (SKUs counted, sold out, units reserved), tracked stock levels, uncounted SKUs, a count/adjust form (idempotent per form), the ledger in words with links to orders, and the lot registry.                                                                                                                                                                                                                                                                              |
| `/ops/mensajes`             | Provider and tracking-link status, the outbox with honest per-message status (why messages are pending is said once), and a sandboxed preview of the exact email.                                                                                                                                                                                                                                                                                                                     |

### Access

The console is off until `OPS_ACCOUNTS` and `OPS_SESSION_SECRET` are set; until
then every route is a 404.

- **Accounts:** one per person, stored as scrypt hashes, so every action is
  attributed.
- **Session:** an HMAC-signed, httpOnly, SameSite=Strict cookie, scoped to
  `/ops`, lasting 12 hours.
- **Lockout:** 5 failures per address or name lock both for the rest of a
  15-minute window. The counts are the shared rate-limit store's (§10a), so
  every server instance sees the same failures.
- **Headers:** every `/ops` response carries noindex, no-store, no-referrer,
  `X-Frame-Options: DENY` and an enforced first-party Content-Security-Policy
  (§10a).
- **Server actions:** each one re-checks the session and validates every field
  against a closed list.

**To enable it:**

1. Run `npm run ops:account -- <name>` for each person and join the outputs
   with commas into `OPS_ACCOUNTS`.
2. Set `OPS_SESSION_SECRET` to at least 32 random characters.
3. Consider the host's access protection (e.g. Vercel deployment protection)
   as a second layer. This is not an identity provider: it has no 2FA and no
   password reset.

### 3.1 Content: Simple Effects (`/ops/contenido/efectos`)

The console's one content tool, not an order tool: the owner-authored tags
and one-sentence descriptions per product (CONVENTIONS §20.14). Same
sign-in, same 404-when-closed.

- **List**: all 85 products, with tabs (all · no content · drafts · in
  review · approved · flagged), search by name or slug, and each row's
  status, warnings and last edit.
- **Bulk status** (on the list): tick rows, or "Seleccionar todas las de
  esta vista", then "Aprobar seleccionadas" or "Pasar a borrador". Only
  the status changes. Each entry passes the same gate as a single save;
  one missing a language or using an unknown tag is left as it was and
  named in the summary. Warnings never skip an entry.
- **Product** (`/ops/contenido/efectos/<slug>`): tags from the vocabulary,
  the ES and EN sentences with a length counter, internal notes, the
  status, warnings as you type, and a preview with the
  public components (catalogue card, PDP, Vista rápida, record) in either
  language. "Anterior / Siguiente" walks the catalogue for one-by-one
  review.
- **Warnings are advisory.** The editor flags dosing or administration
  wording, personal recommendations, strong effect verbs, treatment verbs, a
  missing translation and length, and repeats the count beside "Aprobado".
  Simple Effects warnings are advisory editorial signals. They never
  determine publication eligibility. Publication is an explicit owner
  decision. Approval needs only both languages and known tags.
- **Import** (`…/importar`): paste or upload CSV or JSON in the export's
  shape, review the plan, then confirm. Everything arrives as a draft.
- **Export** (`…/exportar?formato=csv|json`): every product, filled or not —
  the template for drafting elsewhere.
- **Tags** (`…/etiquetas`): add or relabel; a tag in use cannot be deleted.

Saves go to `src/content/effects/simple-effects.json`. Edit locally, commit
the file, and the next build publishes what is approved. A deployed copy
cannot save (`read_only`). Each save records who saved it and when, plus a
revision number that refuses a save from a stale tab.

**From a draft to the live site**

1. Run the site locally (`npm run dev`) with `OPS_ACCOUNTS` and
   `OPS_SESSION_SECRET` in `.env.local` (§3, "Access"), and sign in at `/ops/acceso`.
2. Write the entries in the editor, or import them (`…/importar`). Imports
   arrive as drafts. Extra columns in a file (for example a reviewer's
   notes) are ignored; only the export's columns are read.
3. Approve: one at a time in the editor ("Aprobado" → "Guardar"), or many
   at once from the list. `next dev` shows an approved entry on the public
   pages after a reload.
4. Commit `src/content/effects/simple-effects.json` and push. The host's
   next build is what customers see.

To unpublish, set the entry (or a selection) back to "Borrador" and repeat
step 4. "En revisión" is an optional holding state for your own use; it
never renders.

## 4. Inventory

Tracking is **opt-in per SKU**. A SKU is untracked, and sells without limit
as before, until an operator records a physical count. No count is seeded.

**Holds:**

- Stock is held **before the payment provider is called**, all lines or none.
  If a tracked SKU is short, the attempt is closed as refused (`out_of_stock`)
  and Mercado Pago is never called.
- In Postgres a hold is a conditional `UPDATE … WHERE on_hand - reserved >= q`
  in one transaction, in SKU order. The concurrency test puts 12 checkouts on
  5 units and exactly 5 win, on both stores.

**After each order change**, the shelf is re-derived from the order
(`desiredHold`):

- **Held:** payment in flight or taken.
- **Released:** failed or cancelled before dispatch.
- **Consumed:** dispatched.

A refund after dispatch restores nothing. A returned parcel is restocked by an
operator (`return_restock`).

**What is not modelled:**

- warehouse locations
- multiple warehouses
- stock by lot, since lots live in the quality registry, not in stock rows
- backorders

## 5. Lots

The lot registry (`src/data/quality/lots.ts`) is reused and is **empty**.
Assignment is built and validated:

- The lot must exist.
- It must match the line's SKU.
- It must be `in-stock`.
- It must not have expired on the day of assignment.
- Quantities cannot exceed the line.

The supplier batch reference never leaves the registry.

**Whether a lot is required before dispatch is an owner decision.** It is not
enforced today, because no lot has been received.

## 6. Shipping (Skydropx — owner decision B2, 2026-10-15; D1)

`src/shipping/` defines `ShippingProvider`; the adapters are `skydropx`
(Skydropx PRO API v1, read from its official OpenAPI reference) and `none`.
With no complete Skydropx configuration the provider is `none` and checkout
keeps its old free-threshold-only rule; operators can always record a
`manual` shipment.

**Checkout.** After the address, the delivery step asks Skydropx for rates
for that address (origin and parcel from configuration) and keeps them on
the server-side draft. The customer chooses a rate by id; carrier, cost and
price are read from the stored quote. **Free shipping (owner,
2026-10-18):** at a merchandise subtotal of MX$10,000 or more, the CHEAPEST
eligible rate in the quote is NEOGEN's subsidy — that option is free, and a
faster one costs the customer only the difference (Standard 160 → 0;
Express 430 → 270). Below the threshold the customer pays the selected
rate. The order keeps the real cost (`delivery.quote.cost`, then
`booking.cost`), the subsidy and its base (`subsidy`, `subsidyBase`) and the
customer's charge (`delivery.price` = `totals.shipping`); a re-quote
recomputes the subsidy from the fresh rates. A quote is
offered for 60 minutes; at placement a stale rate is re-quoted for the same
carrier and service — same price continues, a new price goes back to
review with a notice, a vanished service back to delivery. Failures (bad
address, no coverage, timeout, outage, too many quotes) show a message in
the customer's language with "quote again" or "correct the address". Quotes
count against `RULES.shippingQuote` (20 per 15 minutes per address).

**Labels — only after payment, once.** When an order becomes paid the label
is bought after the response (`after()`), and the reconcile and the console
can repeat it safely:

1. a booking record is saved under the order's version lock before Skydropx
   is called — a second process finds it and joins it;
2. Skydropx `unique_shipment` replays the first answer for the same rate
   (96 h) and answers 409 while it is still running — a lost answer,
   repeated, returns the same shipment;
3. if Skydropx refuses the rate (expired), the same carrier and service is
   re-quoted once and booked on the new rate (compare-and-set).

A refusal marks the booking `failed`: the order stays **paid**, its stock
stays **held**, and "Requiere atención" shows "Guía no comprada". A paid
order without a label after 30 minutes shows "Sin guía".

**In `/ops`, per order** (section Envío): the carrier and service chosen at
checkout, the booking state and last error, the logistics cost against what
the customer paid, the provider's raw status, and:

- **Comprar la guía ahora / Reintentar la compra** — the same idempotent
  path; it never buys a second label.
- **Descargar guía (PDF)** — fetched from Skydropx at that moment and passed
  through by the server (`/ops/pedidos/<id>/guia`); the provider's URL never
  reaches the browser or a customer.
- **Actualizar desde la paquetería** — reads the shipment and applies it.
- **Cancelar la guía en la paquetería** — confirmed; separate from cancelling
  the order.

**Tracking.** Skydropx webhooks (`/api/shipping/webhook`, HMAC-SHA512 over
the raw body) and refreshes go through `applyTracking`. Statuses map:
created → pending; picked_up / in_transit / last_mile → in transit;
delivery_attempt, delivered_to_branch, exception, in_return → exception
(with the reason); delivered → delivered; in_return with returned_status
delivered → returned; canceled → cancelled. Anything else is ignored and
kept as the raw status. Duplicates (`skydropx:<shipment>:<status>`) and
out-of-order facts change nothing. A carrier pickup fulfils the order and
consumes its stock even if nobody pressed "ready to ship" (the label was
bought on payment).

**Cancelling.** Cancelling an order that has a label no longer cancels the
shipment locally: the shipment is marked, "Cancelar guía" is flagged, and an
operator cancels it at Skydropx. A refusal (already collected) is recorded
and the flag stays. The refund never waits for the carrier.

**Customers** see carrier, tracking number and the carrier's tracking link
on their order page, and an explanation of a delivery problem in their
language. Emails: shipped, tracking, delivered, and one "delivery problem"
email per shipment — through the outbox, each once.

**Scheduled job.** `/api/cron/reconcile-payments` also books labels still
owed and refreshes parcels not yet delivered (`shipping` in its answer).

**What Skydropx receives:** origin and parcel (configuration); for quotes,
the destination's postal code, state, city and colonia; for a label, the
recipient's name, street and number, colonia, notes and phone. **Not** the
customer's email — the label's contact email is `SHIPPING_ORIGIN_EMAIL`. The
Aviso de Privacidad (B1) must name Skydropx and the carrier as recipients.

### 6b. The Skydropx contract, verified (2026-10-18)

Against the official API reference (`pro.skydropx.com/es-MX/api-docs.json`,
OpenAPI 3.0.1 "Skydropx API v1"; identical on 10-15 and 10-18).
VERIFIED = stated by the reference; CONFIGURABLE = deliberately left to
configuration; UNVERIFIED = needs a real sandbox call.

| Behaviour                                                                                                                                                   | Status                                   | Notes                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Production host `https://api-pro.skydropx.com`                                                                                                              | VERIFIED                                 | The only server the reference lists                                                                                                    |
| Sandbox API host                                                                                                                                            | CONFIGURABLE / UNVERIFIED                | The reference names only the sandbox panel `sb-pro.skydropx.com`; `SKYDROPX_API_URL` is required in sandbox — confirm it with Skydropx |
| `POST /api/v1/oauth/token`, client credentials, `access_token` + `expires_in`; 2 h token; 2 requests/s                                                      | VERIFIED                                 |                                                                                                                                        |
| Token request encoding                                                                                                                                      | UNVERIFIED                               | The reference's example is form-encoded, its schema says JSON; form first, JSON on 400/415                                             |
| `POST /api/v1/quotations` `{quotation:{address_from, address_to, parcels}}`; `area_level1/2/3` = state/city/colonia; dimensions integer ≥1 cm, weight ≥1 kg | VERIFIED                                 |                                                                                                                                        |
| `GET /api/v1/quotations/{id}` until `is_completed`                                                                                                          | VERIFIED                                 | Polled within 9 s at ≤2 req/s                                                                                                          |
| Rate fields `id`, `success`, `status`, `total`, `currency_code`, `days`, `provider_*`                                                                       | VERIFIED                                 | `total` includes cost, IVA and service fee                                                                                             |
| Rate status vocabulary (pending, not_applicable, approved, no_coverage, coverage_checked, price_found_internal/external, tariff_price_not_found)            | VERIFIED                                 | Offered only with `success` and a positive `total`                                                                                     |
| `requires_origin_verification: true` → the shipment fails                                                                                                   | VERIFIED                                 | Such rates are never offered                                                                                                           |
| Rates valid 24 h                                                                                                                                            | VERIFIED (stated)                        | The reference also ties `unique_shipment`'s 96 h cache to "the rate's lifecycle"; actual expiry UNVERIFIED                             |
| Quote 422 `errors.address_to/address_from/parcel`                                                                                                           | VERIFIED                                 | Only `address_to` blames the customer                                                                                                  |
| `POST /api/v1/shipments/` (trailing slash), required `rate_id`, `address_from`, `address_to`, `packages`; field limits                                      | VERIFIED                                 | Destination area comes from the quote                                                                                                  |
| `consignment_note` and `package_type` required                                                                                                              | VERIFIED                                 | Values CONFIGURABLE (Carta Porte lists)                                                                                                |
| `unique_shipment: true` — replay 200 for the same rate for 96 h, 409 while in progress                                                                      | VERIFIED                                 | NEOGEN's idempotency layer 2                                                                                                           |
| Creation answers 202 and resolves asynchronously                                                                                                            | VERIFIED                                 | `sync_label_creation` exists only on the un-quoted `/rate/shipments` endpoints, not used                                               |
| 422 `{errors, error_code}` (credits, rate not found, Carta Porte…)                                                                                          | VERIFIED (examples)                      | Mapped to reasons; re-quote only for `errors.rate_id`                                                                                  |
| A rate refused after expiry answers `errors.rate_id`                                                                                                        | UNVERIFIED                               | Assumed from the "no existe un rate con ese id" example                                                                                |
| `workflow_status` values                                                                                                                                    | UNVERIFIED                               | Only `pending`/`success` documented; `success` = created, `error_detail` present = failed, anything else = still creating              |
| Package `label_url`, `tracking_number`, `tracking_url_provider`, `tracking_status` in `included`                                                            | VERIFIED                                 | Label fetched on demand, never stored                                                                                                  |
| Package `tracking_status` uses the webhook vocabulary                                                                                                       | VERIFIED (tracking endpoint codes match) |                                                                                                                                        |
| `POST /api/v1/shipments/{id}/cancellations` `{reason, shipment_id}` → `{success, status}`; 422 cannot cancel                                                | VERIFIED                                 |                                                                                                                                        |
| Webhook registration in the panel (Conexiones > Webhooks), no API                                                                                           | VERIFIED                                 |                                                                                                                                        |
| Webhook HMAC-SHA512 over the raw body, lowercase hex, `Authorization: HMAC <sig>`, header name configurable (3–25 chars)                                    | VERIFIED                                 | Bearer mode deliberately refused                                                                                                       |
| Webhook payload `packages` with `status`, `tracking_*`, `label_url`, `returned_status`, `relationships.shipment.data.id`; status list                       | VERIFIED                                 | No event id: dedup by shipment + status                                                                                                |
| Webhook "Created" / "Error"                                                                                                                                 | VERIFIED (listed)                        | Both read the shipment                                                                                                                 |
| Webhook retry behaviour on non-2xx                                                                                                                          | UNVERIFIED                               | Not documented; the reconcile covers missed events                                                                                     |
| `auto_advance` (sandbox only; created → picked_up → in_transit → last_mile → delivered each minute)                                                         | VERIFIED                                 | `SKYDROPX_SANDBOX_AUTO_ADVANCE=true`                                                                                                   |
| `printing_format` standard/thermal                                                                                                                          | VERIFIED                                 |                                                                                                                                        |
| Pickup: rates say `pickup_automatic`; scheduling is `/pickups`                                                                                              | VERIFIED (fields)                        | Not automated: a non-automatic carrier needs a pickup booked in Skydropx                                                               |

### 6a. Setting it up

1. Skydropx sandbox (`sb-pro.skydropx.com`) → Conexiones > API: client id and
   secret. Set in Vercel **Preview**: `SKYDROPX_MODE=sandbox`,
   `SKYDROPX_CLIENT_ID`, `SKYDROPX_CLIENT_SECRET`, and `SKYDROPX_API_URL` —
   the sandbox API host Skydropx gives you (the API reference names only
   production, `https://api-pro.skydropx.com`; confirm the sandbox host with
   Skydropx).
2. The origin (`SHIPPING_ORIGIN_NAME`, `_COMPANY`, `_PHONE`, `_EMAIL`,
   `_STREET` (street and number, ≤45), `_REFERENCE` (≤30), `_POSTAL_CODE`,
   `_STATE` (name), `_CITY`, `_NEIGHBORHOOD`), the packed order
   (`SHIPPING_PARCEL_LENGTH_CM`, `_WIDTH_CM`, `_HEIGHT_CM`, `_WEIGHT_KG`, at
   least 1 kg), and the Carta Porte codes (`SKYDROPX_CONSIGNMENT_NOTE`,
   `SKYDROPX_PACKAGE_TYPE`, from Skydropx's code lists). Optional:
   `SKYDROPX_ORIGIN_TEMPLATE_ID`, `SKYDROPX_CARRIERS_ALLOW` /
   `SKYDROPX_CARRIERS_DENY` (`fedex` or `fedex:express_saver`),
   `SKYDROPX_PRINTING_FORMAT` (`standard`/`thermal`),
   `SKYDROPX_SANDBOX_AUTO_ADVANCE=true` (sandbox moves parcels every minute).
3. Skydropx → Conexiones > Webhooks: URL
   `https://<host>/api/shipping/webhook` (on a protected Preview add
   `?x-vercel-protection-bypass=<secret>`), **HMAC** authentication, header
   `Authorization` (or set `SKYDROPX_WEBHOOK_HEADER`), the shipment
   ("Envíos") events. The HMAC key goes in `SKYDROPX_WEBHOOK_SECRET`.
4. Production: the same with production credentials, `SKYDROPX_MODE=live`,
   no `SKYDROPX_API_URL` (defaults to `https://api-pro.skydropx.com`), and —
   only when ready to buy real labels — `SKYDROPX_LIVE_LABELS=enabled`. Live
   mode is refused on any deployment whose `VERCEL_ENV` is not `production`.

Tests: `check:shipping` (144 assertions against a fake Skydropx).

## 7. Notifications

Messages are **owed by state** (`messagesOwed`) and queued once each. The
outbox is idempotent on message id, and in Postgres it is a table
(`neogen_notification_outbox`).

| Message                              | When                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| order.placed (customer + operations) | first provider confirmation of payment               |
| order.shipped                        | a shipment dispatched                                |
| order.tracking                       | tracking added after dispatch                        |
| order.delivered                      | carrier/operator reports delivery                    |
| order.cancelled                      | cancellation of an order the customer had paid       |
| order.refunded                       | the provider confirmed the refund (not on a request) |
| order.disputed (operations only)     | a chargeback                                         |

**Not messages:**

- preparing
- ready to ship
- a payment failure (the customer is on the page)
- a refund request

**Templates:** `renderEmail` (ES/EN) produces a table-based layout with inline
styles, system fonts, no images and no trackers, plus a plain-text part. It
makes no delivery or legal promises, and `check:content` scans its copy.

**Sending: Resend** (owner decision B6, 2026-10-15;
`domain/notifications/adapters/resend.ts`). One channel inside the same
outbox — the outbox still decides what is owed and records every attempt.

- **Off until switched on.** It sends only with `RESEND_API_KEY`,
  `EMAIL_FROM` and `EMAIL_SENDING=enabled` all set. Until then every message
  stays `pending` and `/ops/mensajes` names what is missing (names, never
  values). Set `EMAIL_SENDING=enabled` only once the sending domain is
  verified in Resend; the messages still pending then go out on the next
  retry.
- **Who gets what.** Customer emails go to the order's email, in the
  order's language (ES/EN). Operations emails ("new paid order", "dispute")
  go to `EMAIL_OPERATIONS_TO` (comma-separated), in Spanish; without it they
  are not sent and stay retryable.
- **Testing on Preview.** `EMAIL_REDIRECT_TO` sends every email to one
  test address instead, with `[TEST · customer|internal]` in the subject.
  On the Production deployment a redirect makes the channel refuse to send
  at all, so it cannot silently divert customers' email.
- **Failures never touch an order.** A send runs after the order is saved,
  never throws, and is recorded on the outbox entry: `unconfigured` (key,
  permission or unverified domain — retried), `provider_error` (outage or
  rate limit — retried), `rejected` (the message itself — not retried).
  After 8 recorded failures a message is no longer retried on its own and
  stays visible as failed.
- **Retries are safe.** Resend's idempotency key is `<message id>:<attempt>`:
  a send that reached Resend but was never recorded is deduplicated by
  Resend for 24 hours; a recorded failure is retried under the next key. A
  message recorded as sent is never sent again. Retries run on every order
  change, in the daily job (`/api/cron/reconcile-payments`, which now also
  reports `emails`), and with "Reintentar envíos" in `/ops/mensajes`.
- **Privacy.** Resend receives the customer's name, email, order lines and
  totals (that is the email). The Aviso de Privacidad (B1) must name it as a
  processor.

## 8. Customer order status

`/{locale}/pedido/{id}` opens for three kinds of browser, and an order id alone
opens nothing:

| Access                                | How                                                                  | Opens                                                      |
| ------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Owner** (`neogen.orders` cookie)    | placed the order here, or followed the order's signed email link     | status page (with postal code), confirmation, payment step |
| **Tracker** (`neogen.tracked` cookie) | `/{locale}/rastrear`: order number plus the email it was placed with | status page only: no postal code, no payment action        |
| Anyone else                           | —                                                                    | the same "not found" as a missing order                    |

Both cookies are httpOnly, last a day and keep the last five orders. **Every
order id in them carries a proof**, `HMAC-SHA256(ORDER_ACCESS_SECRET,
"order-<owner|track>:v1:<id>")`, so a cookie written by hand opens nothing and a
tracking proof cannot be used as ownership. Without the secret, a development
server signs with a per-process key; a production build takes no payments
(`order_access_unconfigured`). Cookies issued before 2026-10-12 carried no
proof and no longer open anything.

**"Rastrear mi pedido"** (`server/orderLookup.ts`) accepts the number as typed
(lower case, spaces, without `NG-`). A missing order and a wrong email give the
same answer, compared as hashes in constant time. Throttled: 10 lookups per 15
minutes per address, and 5 per order number (§10a). The status page never shows
a street address, phone or email to anyone. The footer links to it only while
commerce is on, and the status page's "not found" offers it.

**The signed link:**

- `?t=` is HMAC-SHA256 of the order id and a per-order random nonce, using
  `ORDER_ACCESS_SECRET`.
- The `acceso` route verifies it, adds the order to the ownership cookie and
  redirects to the plain URL, so the token never stays in history or a
  Referer header.
- A forged token, or another order's, lands on the same "not found" as a
  missing order.

**The status shown** comes from the order's own milestones:

- The four steps are payment confirmed, preparing, on its way and delivered.
- Paying never shows "shipped".
- Off the normal path (unpaid, cancelled, refunded, disputed, held,
  returned) there is no progress bar.
- No delivery date is computed.

## 9. Refunds, cancellations, disputes

**Full refunds only.** Partial refunds exist in Mercado Pago's API but are
not enabled here: no refund policy has been approved.

**Submitting a refund** (`submitRefund`) calls the adapter's existing
`refund()`: `POST /v1/orders/{id}/refund` with no body and an
`X-Idempotency-Key` equal to the refund id. This was checked against Mercado
Pago's "Refund order" reference on 2026-09-23.

- **Then:** it marks the refund `submitted` and fetches the order state.
- **409 answers:** documented ones such as "already refunded" or "key already
  used" count as submitted, and the fetched state decides.
- **Live credentials:** refunds are refused unless `OPS_LIVE_REFUNDS=enabled`.

**Mapping change:** the refund reference shows a fully refunded order as
`processed`/`refunded`, while the status page lists `refunded`/`refunded`.
Both now map to NEOGEN `refunded`.

**Disputes:** these come only from Mercado Pago (`charged_back` →
`disputed`). NEOGEN holds the work, and the dispute is resolved at the
provider.

## 9a. Payments that never settled

A payment moves for two reasons only: the synchronous answer to our own
charge, and a webhook. If the answer was "still processing" and no webhook
arrives (wrong or protected notification URL, an outage, a provider that never
sends one), nothing asks again: the order sits in "Procesando" with its stock
held until someone opens its page. Two things ask on purpose:

- **The console's "Revisar con el procesador"** (order page, Pago panel,
  shown only while a payment is in flight). One order, on demand. This is the
  way to settle a stuck order on a Preview deployment, where scheduled jobs do
  not run.
- **The scheduled job** `GET /api/cron/reconcile-payments`, listed in
  `vercel.json` (daily, 14:00 UTC; Hobby allows no more often). It asks the
  provider about every `pending_payment` / `payment_processing` order that has
  not changed for 5 minutes, at most 50 per run and 45 seconds of work.

**It never invents an outcome.** It applies only an answer the provider gave,
through the same idempotent, version-locked path as a webhook
(`applySnapshot`: reconcile, follow the other axes, bring stock and messages
into line). If the provider still says "processing", the order and its held
stock stay as they are, and the console's 30-minute flag keeps telling an
operator. An attempt that never produced a provider reference is released as
failed after 15 minutes (`recoverStalledAttempt`), as before.

**After one hour, the payment is cancelled at the provider** (owner,
2026-10-15; LAUNCH_PLAN D12; `PAYMENT_EXPIRY_MS`). When a check — the job,
the console's button, or the customer reopening their order — finds a
payment still unresolved an hour after its attempt, it asks Mercado Pago to
cancel it (`POST /v1/orders/{id}/cancel`, one idempotency key per attempt),
then reads and applies the result. Only an accepted cancellation releases
the stock: the attempt becomes "failed", the customer may pay again, and the
money can no longer be taken late. If Mercado Pago refuses (the payment is
already settling), nothing is released, the order keeps its stock and its
"Pago atascado" flag, and the refusal is logged as `payment.expiry_refused`.
If Mercado Pago cannot be reached, the next check tries again.

**Timing.** The hour is a minimum. On Vercel Hobby the job runs once a day,
so an abandoned payment's stock comes back at the next daily run, or sooner
when the customer or an operator opens the order.

**Closed by default.** The route answers 503 without `CRON_SECRET` (32+
characters) and 401 without `Authorization: Bearer <CRON_SECRET>`; it answers
counts only (no order ids, names or amounts). Vercel sends the header itself
once the variable exists. Set it on **Production** — scheduled jobs run on the
production deployment only. To run it by hand against any deployment:

    curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/reconcile-payments

(add Vercel's protection-bypass header on a protected preview.)

**Tests:** `check:payments` § 8c (35 assertions: stays put when the provider
still processes, settles an approval or a failure the webhook missed, releases
stock on a failure, leaves an unreachable or unknown order alone, skips orders
changed in the last 5 minutes, ignores abandoned `created` orders, is bounded
by size and by time, and the route's authentication), and the new `list`
filters on the real Postgres engine.

## 10. Analytics and observability

**Analytics** (`src/analytics/`) has six funnel events:

- product_viewed
- bag_added
- checkout_started
- checkout_progressed
- payment_attempted
- purchase_completed (fired once, when the provider first confirms)

Payloads are SKUs, quantities, prices and step names only, and `sanitize`
drops everything else. The default sink is none. On the client each event is
also a DOM `neogen:analytics` CustomEvent.

**Observability** (`src/server/observe.ts`) writes one JSON line per
operational signal to the server log. Signals cover:

- payment provider errors
- rejected or unsettled webhooks
- persistence conflicts
- inventory shortfalls and failures
- notification failures
- refund errors
- sign-in failures
- rate-limit refusals and an unreachable limiter
- CSP violations (directive and blocked host only)

Context is an **allow-list** of scalar keys, so a secret, token, payload,
email or address has no key to travel under. `check:payments` asserts none
appear.

## 10b. Watching production (owner decision B14, 2026-10-15)

**No monitoring service.** Production failures are watched with what already
exists: Vercel's logs and the console. The code keeps one seam for a
dedicated tool later — `observe.ts` writes every signal through a list of
sinks, so adding one (a log drain, an error service) is a new `Sink`, not a
change to any call site.

**Vercel keeps runtime logs for one hour on the Hobby plan** (one day on
Pro). A daily look at the logs therefore sees almost nothing. The durable
record is the console:

| Where                                | What it shows                                                                                                                                                                                                                                 | How long it lasts                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `/ops` → **Requiere atención**       | Every order that needs a person: disputed charge, payment stuck over 30 minutes, an approved payment on an earlier attempt (possible double charge), an amount mismatch, an open or unconfirmed refund, a parcel incident, a stock shortfall. | In the database, until resolved or acknowledged |
| `/ops/mensajes`                      | Customer and operator emails: sent, pending, failed.                                                                                                                                                                                          | In the database                                 |
| Uptime monitor on `/api/health` (C9) | The site is down, or the database is unreachable.                                                                                                                                                                                             | The monitor's own history                       |
| Vercel → project → **Logs**          | The signals below, for diagnosing something happening now.                                                                                                                                                                                    | 1 hour (Hobby)                                  |

**Daily routine (5 minutes):** open `/ops` → **Requiere atención** and clear
or acknowledge each row; open **Mensajes** and check nothing is `failed`;
glance at the uptime monitor. When something looks wrong, reproduce or wait
for it to recur and read Vercel's logs within the hour.

**Reading the logs.** Vercel → **neogen-website** → **Logs**, environment
**Production**, level **Warning** and **Error**, and search for `neogen` (each
signal is one JSON line `{"neogen":{"signal":…,"severity":…,"context":…}}`).
Context never carries a customer's name, email, address, token or secret.

| Signal                                                                | Severity   | Means                                                                                        | Do                                                                                                                             |
| --------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `payment.provider_error`                                              | warn/error | Mercado Pago did not answer or refused a request                                             | If repeated: Mercado Pago's status page; check credentials                                                                     |
| `payment.webhook_unauthenticated`                                     | warn       | A notification failed its signature (answered 401)                                           | Many in a row: the webhook secret in Vercel does not match the account that charges (see LAUNCH_PLAN 1.3 for the test account) |
| `payment.webhook_rejected`                                            | warn       | A payment answer was refused: wrong amount, another order's reference, or an earlier attempt | The order is in "Requiere atención"; reconcile in Mercado Pago's panel                                                         |
| `payment.webhook_unsettled`                                           | warn       | A verified notification could not be applied yet (`provider_unreachable`)                    | Mercado Pago retries; if it persists, use "Revisar con el procesador"                                                          |
| `payment.not_persisted`                                               | error      | A payment answer could not be saved                                                          | Check the database (`/api/health`); the reconcile repairs it once it is back                                                   |
| `payment.expired` / `payment.expiry_refused`                          | info/warn  | D12: an hour-old payment was cancelled / Mercado Pago refused to cancel                      | Refused: the order stays in "Requiere atención"; reconcile in Mercado Pago's panel                                             |
| `inventory.short` / `inventory.hold_failed` / `inventory.sync_failed` | warn       | Stock could not be held, or the store could not be read                                      | The order is flagged "Faltaron existencias"; recount in `/ops/inventario`                                                      |
| `notification.send_failed` / `notification.enqueue_failed`            | warn       | An email could not be sent or queued                                                         | `/ops/mensajes`; retries are automatic, a permanent failure stays visible there                                                |
| `persistence.conflict`                                                | warn       | Two writes raced on one order                                                                | Usually harmless (one won); repeated on one order: look at it                                                                  |
| `ops.login_failed` / `ops.login_locked`                               | warn       | Console sign-in failures / a locked account                                                  | Unexpected names or volume: rotate `OPS_SESSION_SECRET` and passwords                                                          |
| `security.rate_limit_unavailable`                                     | error      | The shared rate limiter is down; limits fall back                                            | Check the database                                                                                                             |
| `security.csp_violation`                                              | warn       | The browser blocked a resource                                                               | A new third-party host needs adding to the CSP, or something injected                                                          |

**When to add a tool.** If an incident is missed because it happened more
than an hour before anyone looked, add a log drain or an error service as a
new sink, or move to Vercel Pro for a day of logs.

## 10a. Rate limits and security headers

**Rate limits** (`src/server/security/rateLimit.ts`) are fixed-window counters,
shared by every server instance through Postgres (`neogen_rate_limits`), in
memory without a database. A key is `rule:sha256(subject)`, so no address or
name is stored. The client address is `x-vercel-forwarded-for`, which Vercel
sets and a client cannot spoof.

| Rule            | Limit                     | Where                                                     |
| --------------- | ------------------------- | --------------------------------------------------------- |
| `ops-login`     | 5 failures / 15 min       | per name and per address; a success clears both           |
| `pay-order`     | 6 card attempts / 15 min  | per order — the card-testing brake                        |
| `pay-address`   | 15 card attempts / 15 min | per address, across orders                                |
| `place-order`   | 10 orders / hour          | per address; checked after every other gate, before write |
| `track-address` | 10 lookups / 15 min       | "Rastrear mi pedido", per address                         |
| `track-order`   | 5 lookups / 15 min        | per order number — the brake on guessing its email        |
| `atlas`         | 8 generations / 10 min    | per address                                               |
| `csp-report`    | 30 reports / 10 min       | per address                                               |

A refusal logs `security.rate_limited` with the rule. **The limiter fails
open**: if the store cannot be reached (an outage, or a deploy before migration
003), the request is allowed and `security.rate_limit_unavailable` is logged at
error level. None of these limits is the only gate.

**Headers** (`src/config/securityHeaders.ts`, applied by `next.config.ts`):

- Everywhere: `Strict-Transport-Security: max-age=63072000`, `nosniff`,
  `X-Frame-Options: DENY`, a Permissions-Policy without camera, microphone,
  location, USB or topics, and an enforced CSP of `object-src 'none'`,
  `base-uri 'self'`, `frame-ancestors 'none'`.
- Storefront: `Referrer-Policy: strict-origin-when-cross-origin` and the full
  policy, enforced, allowing Mercado Pago's domain families (`mercadopago`,
  `mercadolibre`, `mercadolivre`, `mlstatic`) for scripts, frames,
  connections, images and fonts. Preview builds also allow Vercel's toolbar
  hosts (`vercel.live` and the others Vercel documents); Production does not.
- `/ops`: the full first-party policy, enforced.

`'unsafe-inline'` stays in `script-src`: Next streams page data as inline
scripts, and a per-request nonce would make every static page render on demand.
Origins are still restricted.

**Reports** go to `POST /api/csp-report` (both the `report-uri` and Reporting
API formats), logged as `security.csp_violation` with the directive, the
disposition and the blocked **host** only. Browsers deliver them in batches,
sometimes a minute later.

**A new Mercado Pago host** shows up as a `security.csp_violation` naming it.
Add it to `MERCADO_PAGO` in `src/config/securityHeaders.ts`. While
investigating, `STOREFRONT_ENFORCED = false` sends the storefront policy as
report-only again.

## 11. Schema

`db/migrations/002_operations.sql` (idempotent, applied after 001):

| Change                                   | Purpose                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `neogen_orders`: new columns and indexes | `fulfilment_state`, `shipment_state` and `attention`, for listing. Existing rows are backfilled the same way `upgradeOrder` reads them. |
| `neogen_inventory`                       | Stock levels; a row exists only for a counted SKU.                                                                                      |
| `neogen_inventory_holds`                 | One hold per (order, SKU): held, released or consumed.                                                                                  |
| `neogen_inventory_movements`             | Append-only ledger, idempotent by id.                                                                                                   |
| `neogen_notification_outbox`             | The durable outbox.                                                                                                                     |

`db/migrations/003_rate_limits.sql` adds `neogen_rate_limits` (key, window
start, hits) for §10a. Rows older than a day are deleted as the limiter runs.

**Running migrations.** `npm run db:migrate` (`scripts/db-migrate.mjs`, rules
in `scripts/lib/migrate.mjs`) uses `DATABASE_URL_UNPOOLED` when set, otherwise
`DATABASE_URL`, and records every file it applies in `neogen_schema_migrations`
(name, checksum, time), each file and its record in one transaction. A recorded
file is skipped. 001–003 predate tracking and were written to be re-run: a
database migrated before 2026-10-13 re-applies them once, safely, and records
them. Every later file runs exactly once; editing one after it ran is refused —
write a new migration. Run it after each deploy that adds a file.

## 11a. Health check

`GET /api/health` answers 200 with `{status, storage, database, schema,
payments}` when the site is serving and its database (if any) answers, and 503
when a configured database does not answer within 3 seconds. `schema` is the
newest migration the database has recorded — compare it with the newest file in
`db/migrations`. No host, role, error text or variable name is ever included;
the route is public and never cached.

## 12. Tests

- **`npm run check:operations`** (352 assertions) covers:
  - the schema upgrade and backfill
  - fulfilment, lot and shipment transitions
  - cancellation, refund and dispute interactions
  - attention and views
  - inventory on memory and PGlite, including the race
  - Postgres lists, search, counts and the outbox
  - notification dedup and spam rules
  - customer view steps
  - access tokens
  - operator auth
  - email escaping and copy
  - analytics privacy
  - rate limits (memory, PGlite and concurrent hits, failing open), CSP report
    parsing and the header sets
- **`npm run check:payments`** adds stock holds around real submissions,
  signal redaction and the refund mapping.
