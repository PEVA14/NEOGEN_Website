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

| Page                        | What it does                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/ops/pedidos`              | Views with counts: Requiere atención, Por preparar, En preparación, Listos para envío, En tránsito, Entregados, Pendientes de pago, En disputa, Reembolsados, Cancelados, Todos. Each row shows the order number, age, customer, destination, SKUs, total and the three axes. Search takes an order-number prefix or an exact email. |
| `/ops/pedidos/[id]`         | Axes band, attention list (with "mark reviewed" for event reasons), items with SKU and lots, fulfilment actions, shipments, payment and refunds, history, customer, totals, stock holds, messages, notes and external references, and cancel. Only legal actions are offered, and the server refuses the rest anyway.                |
| `/ops/pedidos/[id]/empaque` | A printable packing slip: order number, recipient, and per line SKU, product, presentation, quantity and lots, with a tick box. It has no prices and no invented warehouse bins.                                                                                                                                                     |
| `/ops/inventario`           | Tracked stock levels, a count/adjust form (idempotent per form), the lot registry and the ledger.                                                                                                                                                                                                                                    |
| `/ops/mensajes`             | The outbox, with honest status ("Pendiente — sin proveedor de correo; no se ha enviado") and a sandboxed preview of the exact email.                                                                                                                                                                                                 |

### Access

The console is off until `OPS_ACCOUNTS` and `OPS_SESSION_SECRET` are set; until
then every route is a 404.

- **Accounts:** one per person, stored as scrypt hashes, so every action is
  attributed.
- **Session:** an HMAC-signed, httpOnly, SameSite=Strict cookie, scoped to
  `/ops`, lasting 12 hours.
- **Lockout:** 5 failures per address or name locks for 15 minutes. The
  lockout lives in each server instance's memory.
- **Headers:** every `/ops` response carries noindex, no-store, no-referrer
  and `X-Frame-Options: DENY`.
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

Context is an **allow-list** of scalar keys, so a secret, token, payload,
email or address has no key to travel under. `check:payments` asserts none
appear.

## 11. Schema

`db/migrations/002_operations.sql` (idempotent, applied after 001):

| Change                                   | Purpose                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `neogen_orders`: new columns and indexes | `fulfilment_state`, `shipment_state` and `attention`, for listing. Existing rows are backfilled the same way `upgradeOrder` reads them. |
| `neogen_inventory`                       | Stock levels; a row exists only for a counted SKU.                                                                                      |
| `neogen_inventory_holds`                 | One hold per (order, SKU): held, released or consumed.                                                                                  |
| `neogen_inventory_movements`             | Append-only ledger, idempotent by id.                                                                                                   |
| `neogen_notification_outbox`             | The durable outbox.                                                                                                                     |

Run `npm run db:migrate` once per database.

## 12. Tests

- **`npm run check:operations`** (313 assertions) covers:
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
- **`npm run check:payments`** adds stock holds around real submissions,
  signal redaction and the refund mapping.
