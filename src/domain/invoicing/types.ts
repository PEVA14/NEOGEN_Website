import type { Money } from "@/data/commerce";

/**
 * INVOICING (CFDI) — THE SEAM, NOT AN INTEGRATION.
 *
 * NEOGEN does not issue invoices today and collects no fiscal data at
 * checkout. This file fixes the shape an invoicing provider (a PAC such as
 * Facturapi or Facturama — neither is approved) would plug into, so the
 * order model does not have to change when one is chosen. It encodes NO tax
 * rule: which SAT product keys, units, tax objects and IVA treatment apply to
 * this catalogue is for NEOGEN's accountant to decide, and every such value
 * is left for configuration rather than guessed here.
 *
 * What the provider would need is listed in `docs/INVOICING_READINESS.md`,
 * with what the current order already holds and what it does not.
 *
 * THE NEOGEN ORDER STAYS THE IDENTITY. An invoice references an order id;
 * the provider's UUID (folio fiscal) is an external reference on the invoice
 * record, never the other way round.
 */

/** Who the invoice is for, when a customer requests one. Collected only on request. */
export interface FiscalRecipient {
  rfc: string;
  /** Legal name exactly as registered with SAT. */
  legalName: string;
  /** SAT's code for the recipient's tax regime. Supplied by the customer. */
  taxRegime: string;
  /** Postal code of the recipient's fiscal address. */
  fiscalPostalCode: string;
  /** SAT's code for the intended use of the CFDI. Supplied by the customer. */
  cfdiUse: string;
}

export type InvoiceStatus =
  /** A customer asked for an invoice; nothing sent to a provider. */
  | "requested"
  /** Sent to the provider, not yet stamped. */
  | "submitted"
  /** Stamped by the PAC: it has a folio fiscal. */
  | "issued"
  | "failed"
  /** Cancelled with SAT — a provider operation, never simulated. */
  | "cancelled";

export interface InvoiceRecord {
  /** NEOGEN's id: `<order>:invoice:<n>`. */
  id: string;
  orderId: string;
  status: InvoiceStatus;
  /** Null for a global invoice to the general public, when the accountant uses one. */
  recipient: FiscalRecipient | null;
  total: Money;
  provider: string | null;
  /** The folio fiscal (UUID) once stamped. */
  providerRef: string | null;
  requestedAt: string;
  issuedAt: string | null;
  error: string | null;
}

export type InvoiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: "unconfigured" | "rejected" | "provider_error"; detail?: string } };

/**
 * THE PROVIDER CONTRACT. No adapter exists; the registry would hold only an
 * `unconfigured` one, exactly like shipping. Per-line SAT keys come from a
 * mapping the accountant approves (SKU → product key, unit key, tax object),
 * passed in rather than stored on the catalogue before anyone has decided it.
 */
export interface InvoiceProvider {
  readonly id: string;
  isConfigured(): boolean;
  issue(
    invoice: InvoiceRecord,
    lines: readonly {
      sku: string;
      description: string;
      quantity: number;
      unitPrice: Money;
      satProductKey: string;
      satUnitKey: string;
    }[],
    idempotencyKey: string,
  ): Promise<InvoiceResult<{ providerRef: string; issuedAt: string }>>;
  cancel(providerRef: string, reason: string): Promise<InvoiceResult<{ cancelled: true }>>;
  /** Short-lived URLs to the XML and PDF. Never stored. */
  documents(providerRef: string): Promise<InvoiceResult<{ xml: string; pdf: string }>>;
}

export const noneInvoiceProvider: InvoiceProvider = {
  id: "none",
  isConfigured: () => false,
  issue: async () => ({ ok: false, error: { code: "unconfigured" } }),
  cancel: async () => ({ ok: false, error: { code: "unconfigured" } }),
  documents: async () => ({ ok: false, error: { code: "unconfigured" } }),
};
