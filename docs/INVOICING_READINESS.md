# Invoicing (CFDI) readiness — architecture only

**Status (2026-09-23):** NEOGEN does not issue CFDI invoices, and checkout
collects no fiscal data. `src/domain/invoicing/types.ts` defines the seam:

- `InvoiceRecord`
- `FiscalRecipient`
- the `InvoiceProvider` interface, with an `unconfigured` adapter only

No PAC (Facturapi, Facturama or any other) is integrated or approved.

**Nothing below is a tax rule.** It lists what an invoicing integration would
need and whether the current order holds it. Which values apply to this
catalogue is for NEOGEN's accountant (contador) to decide. Treat every item as
a question to confirm with them, not an instruction.

## What the order already holds

| Needed for an invoice                  | Current order                              |
| -------------------------------------- | ------------------------------------------ |
| An immutable reference                 | `order.id`                                 |
| Line description, quantity, unit price | `order.lines` (frozen at order time)       |
| Totals                                 | `order.totals` (whole MXN)                 |
| Date of the operation                  | `order.createdAt`, `order.milestones.paid` |
| Payment evidence                       | provider, attempt refs, payment state      |
| A stable product identifier            | the SKU (`variantId`)                      |
| Customer name and email                | `order.contact` (not fiscal data)          |

## What it does not hold, and should not collect until decided

- **Recipient fiscal data**, per invoice request only:
  - RFC
  - legal name as registered with SAT
  - tax regime
  - fiscal postal code
  - CFDI use
- **Per-SKU catalogue keys:**
  - SAT product/service key
  - SAT unit key
  - tax object
  - how IVA applies

  NEOGEN's owner answer is that IVA will be _included_ in displayed prices
  once they are final. How that is itemised on a CFDI is the accountant's
  call.

- **Payment form and method codes** for Mercado Pago card payments.
- **The general-public (global) invoice policy**, for customers who do not
  request one.
- **The issuer's own fiscal data and certificates (CSD)**, held by the PAC,
  never in this repository.

## Recommended shape when approved

1. **Customer request:** a "request invoice" flow on the order-status page,
   collecting `FiscalRecipient`. It is stored on an `InvoiceRecord` linked by
   `orderId`, never on the order itself.
2. **Accountant-approved mapping:** a SKU → (product key, unit key, tax
   object) map, kept in configuration and checked by a gate so no SKU is
   invoiced without one.
3. **The PAC adapter:**
   - one `InvoiceProvider` implementation
   - idempotent on the invoice id
   - the folio fiscal stored as `providerRef`
4. **Linked to operations:**
   - an operations-console panel on the order
   - the order's `externalRefs` gains `{ system: "invoicing", ref: <UUID> }`

## Owner decisions blocking this

1. Choose a PAC.
2. The accountant defines the SAT keys and IVA treatment per SKU.
3. Global-invoice policy and the customer invoice-request window.
4. Privacy notice wording for fiscal data (the same counsel question as
   personal data in `PERSISTENCE_RECOMMENDATION.md`).
