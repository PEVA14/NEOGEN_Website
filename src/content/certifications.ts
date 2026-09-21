import type { Locale } from "@/i18n/config";

/**
 * CERTIFICATIONS AND REGISTRATIONS — the slot, with nothing in it.
 *
 * A stakeholder asked the site to communicate that NEOGEN's peptides are
 * "certified in Mexico". NOTHING IN THIS REPOSITORY SUPPORTS THAT SENTENCE:
 *
 *   - no certificate of analysis has been produced for any product
 *     (`content/documents.ts` — `DOCUMENTS` is empty);
 *   - no manufacturing lot has been received or declared
 *     (`data/quality/lots.ts`);
 *   - no laboratory has analysed anything for NEOGEN
 *     (`data/quality/issuers.ts` lists who COULD, not who has);
 *   - the regulatory classification review has not happened, and it is the
 *     first launch blocker in `docs/PROJECT_STATE.md` §6;
 *   - no Mexican registration, licence or padrón entry is on file.
 *
 * "Certified" is also the single most consequential word an operation like this
 * can print. Certified BY WHOM, AGAINST WHAT STANDARD, COVERING WHAT — a badge
 * without those three is not a weak claim, it is a false one, and in Mexico it
 * is the kind of false one COFEPRIS acts on.
 *
 * So this module is the same shape as `content/policies.ts`: a typed registry,
 * a publication gate, and an empty list. The UI that reads it renders nothing
 * today and renders the real thing the day a record lands here — which is the
 * only way this site will ever say "certified", and it will say exactly what
 * the certificate says.
 *
 * WHAT THE OWNER MUST PROVIDE, per record, before one may be added:
 *   1. the issuing body's legal name;
 *   2. the standard, licence or registration the record is under;
 *   3. its identifier, as printed on the document;
 *   4. what it covers — the legal entity, a facility, a product, or one lot;
 *   5. its validity dates;
 *   6. the document itself, or a public registry URL that resolves to it.
 * Anything short of all six is a conversation, not a certification.
 */

/**
 * What a record asserts. Deliberately separate from the issuer, for the same
 * reason `content/documents.ts` separates type from issuer: "ISO" is not a
 * certification, and a laboratory's name is not a standard.
 */
export type CertificationKind =
  /** A licence, registration or permit from a public authority. */
  | "regulatory-registration"
  /** Conformity with a published standard, assessed by a certification body. */
  | "standard-certification"
  /** An independent laboratory's analysis of a defined scope. */
  | "third-party-analysis"
  /** Membership of a register or chamber. Never evidence of product quality. */
  | "registry-membership";

/** What the record covers. A company certificate says nothing about a vial. */
export type CertificationScope = "entity" | "facility" | "product" | "lot";

export type CertificationStatus = "draft" | "owner-review" | "verified";

export interface Certification {
  id: string;
  kind: CertificationKind;
  scope: CertificationScope;
  /** The issuing body's legal name, exactly as it appears on the document. */
  issuer: string;
  /** The standard, licence or programme. Never a marketing phrase. */
  standard: string;
  /** The identifier printed on the document, so a reader can verify it. */
  identifier: string;
  /** ISO dates. `validUntil` null only where the document itself has no expiry. */
  validFrom: string;
  validUntil: string | null;
  /**
   * Where a reader checks it independently: the public registry entry, or a
   * file this site serves. A record whose claim cannot be followed to a source
   * is not publishable, whatever its status says.
   */
  verifyUrl: string | null;
  /**
   * Plain-language statement of what it covers, per locale. Written from the
   * document, never around it.
   */
  covers: Record<Locale, string> | null;
  status: CertificationStatus;
}

/**
 * EMPTY, AND NOT A GAP IN THE DATA.
 *
 * An entry here is a document someone is holding. Adding one because a
 * conversation suggested it exists is how a site ends up certifying itself.
 */
const CERTIFICATIONS: readonly Certification[] = [];

export const certifications: readonly Certification[] = CERTIFICATIONS;

/**
 * Publishable — verified, covering a stated scope, and independently checkable.
 *
 * The `verifyUrl` half is deliberate. A certification a customer cannot check
 * is a badge, and badges are what this site refuses to manufacture.
 */
export function isVerified(record: Certification): boolean {
  return record.status === "verified" && record.verifyUrl !== null && record.covers !== null;
}

/** What any public surface may render. Empty today. */
export function publicCertifications(): readonly Certification[] {
  return CERTIFICATIONS.filter(isVerified);
}

/**
 * Does NEOGEN have anything to say about certification yet?
 *
 * Used by the pages that would carry it, so the section is ABSENT rather than
 * present-and-apologetic. `docs/PROJECT_STATE.md` §4: a fact we do not have is
 * absent — no "pending", no "coming soon", on a trust surface least of all.
 */
export function hasCertifications(): boolean {
  return publicCertifications().length > 0;
}
