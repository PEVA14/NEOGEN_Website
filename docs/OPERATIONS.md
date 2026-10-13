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

## 6. Shipping

`src/shipping/` defines `ShippingProvider`: `quote`, `createShipment`,
`getLabel`, `getTracking`, `cancelShipment`. The only adapter is `none`, which
answers `unconfigured`.

- **Today:** operators record the parcel they booked, with carrier, service,
  tracking number and tracking URL (HTTPS only), as a `manual` shipment.
- **Later:** a carrier adapter maps its statuses to `ShipmentState` and feeds
  `updateShipment` with its own event ids.

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

**Nothing is sent: no email provider is approved.** Every entry stays
`pending`, and the console says "not sent". To add a provider:

1. Write one `NotificationChannel` adapter that calls `renderEmail` with
   `renderContextFor(orderId)`.
2. Register it in `server/notifications.ts`.

## 8. Customer order status

`/{locale}/pedido/{id}` opens only for the browser that placed the order (the
existing httpOnly cookie), or through the signed link in emails.

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

## 10a. Rate limits and security headers

**Rate limits** (`src/server/security/rateLimit.ts`) are fixed-window counters,
shared by every server instance through Postgres (`neogen_rate_limits`), in
memory without a database. A key is `rule:sha256(subject)`, so no address or
name is stored. The client address is `x-vercel-forwarded-for`, which Vercel
sets and a client cannot spoof.

| Rule          | Limit                     | Where                                                     |
| ------------- | ------------------------- | --------------------------------------------------------- |
| `ops-login`   | 5 failures / 15 min       | per name and per address; a success clears both           |
| `pay-order`   | 6 card attempts / 15 min  | per order — the card-testing brake                        |
| `pay-address` | 15 card attempts / 15 min | per address, across orders                                |
| `place-order` | 10 orders / hour          | per address; checked after every other gate, before write |
| `atlas`       | 8 generations / 10 min    | per address                                               |
| `csp-report`  | 30 reports / 10 min       | per address                                               |

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

Run `npm run db:migrate` once per database, and again after each new migration
(every statement is idempotent).

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
