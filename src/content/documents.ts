import type { ContentStatus } from "@/content/lifecycle";

/**
 * QUALITY DOCUMENTS — what exists as evidence, and exactly what it is about.
 *
 * PHASE 10 moved this off world identity onto product / variant / lot. Phase 11
 * separates the two questions a document answers, which were one field:
 *
 *   TYPE   — what the document is. A certificate of analysis. A third-party
 *            analysis. A technical sheet.
 *   ISSUER — who produced it. A laboratory, the manufacturer, NEOGEN.
 *
 * "Janoshik report" used to be a type. It is not: it is a third-party analysis
 * whose issuer is Janoshik. Keeping them apart is what stops a laboratory's
 * name becoming a free-floating badge — see `domain/quality` for the rules
 * that decide when "Janoshik verified" may appear, and how narrowly.
 *
 * NOTHING IS DECLARED. No document has been produced or checked for any
 * product. `DOCUMENTS` is empty, every resolution is empty, and every surface
 * renders its deliberate no-evidence state. Declaring a document here means
 * holding the real file or the real report link — never describing one.
 */
export type DocumentType =
  /** Compound-level technical data: identity, format, specification. */
  | "technical-document"
  /** INTERNAL ONLY. Supplier paperwork — identity, contacts, terms. */
  | "supplier-documentation"
  /** Certificate of analysis for an exact presentation. */
  | "coa"
  /** Certificate of analysis for an exact manufacturing lot. */
  | "lot-coa"
  /** Analysis by an independent laboratory. */
  | "third-party-analysis"
  /** Storage and handling conditions. Never preparation or use. */
  | "handling-storage"
  /** Any other analytical report — identity, mass spectrometry, endotoxin. */
  | "analytical-report";

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  "technical-document",
  "supplier-documentation",
  "coa",
  "lot-coa",
  "third-party-analysis",
  "handling-storage",
  "analytical-report",
];

/**
 * Types that may never render publicly, whatever a record's `visibility` says.
 *
 * Two independent conditions have to fail for supplier paperwork to reach a
 * browser: the record would have to be marked public AND this set would have
 * to lose its entry. One mistake is not enough.
 */
export const INTERNAL_ONLY_TYPES: ReadonlySet<DocumentType> = new Set<DocumentType>([
  "supplier-documentation",
]);

export function isKnownDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

/**
 * A file served from this site.
 *
 * `size` and `format` are read off the real file, never estimated — a link that
 * starts a download should say what it is about to hand you.
 */
export interface DocumentFile {
  /** Path under `public/`. Version the filename when the document changes. */
  href: string;
  /** e.g. "PDF". */
  format: string;
  /** Human-readable, read off the real file. e.g. "412 KB". */
  size: string;
}

/**
 * What a document is ABOUT — the narrowest thing it supports.
 *
 * A discriminated union, not optional fields, so "a lot COA with no lot" is
 * unrepresentable. A LOT scope names a lot record; the product and presentation
 * are read from that record, never restated here where they could disagree.
 */
export type DocumentScope =
  | { level: "product"; slug: string }
  | { level: "variant"; slug: string; variantId: string }
  | { level: "lot"; lotId: string };

export interface QualityDocument {
  /** Stable id, never reused. */
  id: string;
  type: DocumentType;
  /** A key into `data/quality/issuers`. Unknown issuers are refused. */
  issuer: string;
  scope: DocumentScope;
  /** The file, when NEOGEN hosts it. */
  file: DocumentFile | null;
  /**
   * The issuer's own identifier for this report — a laboratory task number.
   *
   * Required for a Janoshik verification to render. Copied from the report
   * itself, character for character.
   */
  reportId: string | null;
  /** The issuer's own page for this report, copied from the report. */
  reportUrl: string | null;
  /** ISO date the issuer dated the document. Never the date it was uploaded. */
  issuedOn: string | null;
  /** Public only by explicit decision. */
  visibility: "public" | "internal";
  /** Review of the RECORD — that it was checked against the document. */
  status: ContentStatus;
}

/** THE DECLARED DOCUMENTS — deliberately empty. See the module note. */
export const DOCUMENTS: readonly QualityDocument[] = [];
