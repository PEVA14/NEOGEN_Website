/**
 * QUALITY DATA — lots and the parties that issue documents about them.
 *
 * PRODUCT → VARIANT → LOT → DOCUMENT is the chain evidence travels along, and
 * this module owns the third link. A lot is a manufacturing event: two lots of
 * the same 10 mg presentation are two different things, and an analysis of one
 * says nothing about the other.
 */

/**
 * Where a lot is in its life. There is no "verified" state here on purpose —
 * verification is a property of DOCUMENTS about a lot, resolved in
 * `domain/quality`, never a flag someone sets on the lot itself.
 */
export type LotStatus = "in-stock" | "reserved" | "depleted" | "quarantined" | "retired";

export interface Lot {
  /** NEOGEN's public lot identifier, as printed on the label. */
  id: string;
  slug: string;
  variantId: string;
  /** NEOGEN's own internal reference — purchase order, receiving record. */
  internalReference: string;
  /**
   * THE SUPPLIER'S BATCH IDENTIFIER. INTERNAL, ALWAYS.
   *
   * It identifies the supplier as surely as their name does, and the supplier
   * is private internal reference. `publicLot()` strips it, the public
   * resolver never reads it, and `check:quality` asserts neither can leak it.
   */
  supplierBatchReference: string | null;
  /** ISO dates. Null when not known — never estimated from another date. */
  manufacturedOn: string | null;
  receivedOn: string | null;
  expiresOn: string | null;
  retestOn: string | null;
  status: LotStatus;
  /**
   * Whether this lot's public identifier may be shown at all.
   *
   * Off by default. A lot exists in inventory the moment it is received; it
   * becomes a thing customers can see evidence for only when someone decides
   * so — and a document attached to a non-public lot does not render.
   */
  publicVisibility: boolean;
}

/** What a public surface may know about a lot. No internal fields exist on it. */
export interface PublicLot {
  id: string;
  slug: string;
  variantId: string;
  manufacturedOn: string | null;
  expiresOn: string | null;
  retestOn: string | null;
  status: LotStatus;
}

/**
 * WHO PRODUCED A DOCUMENT — separate from WHAT the document is.
 *
 * "Janoshik" is an issuer, not a verification tier. A third-party analysis is
 * a document TYPE; Janoshik is one laboratory that may issue one. Folding the
 * two together would let a lab's name become a badge that floats free of any
 * specific report, which is exactly the misuse the Janoshik rules exist to
 * prevent.
 */
export type IssuerKind = "independent-laboratory" | "manufacturer" | "supplier" | "neogen";

export interface Issuer {
  id: string;
  /** Display name. */
  name: string;
  kind: IssuerKind;
  /**
   * Whether the issuer may be NAMED publicly.
   *
   * False for the supplier: supplier identity is private internal reference,
   * so a supplier-issued document that is otherwise public shows its issuer
   * as a role ("supplier"), never as a company.
   */
  publicName: boolean;
}
