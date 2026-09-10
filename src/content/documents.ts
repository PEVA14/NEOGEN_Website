/**
 * DOCUMENTS — re-keyed onto product identity, the way media already was.
 *
 * WHAT WAS WRONG BEFORE. The store was `Record<WorldId, ...>`: three keys,
 * `reta`, `glow` and `ghk-cu`. A world is a 3D environment and an art
 * direction, and exactly three of eighty-five products have one — so eighty-two
 * compounds were structurally incapable of holding a certificate of analysis.
 * The product page had to write `product.world ? documentFile(...) : null`,
 * which is the shape of a system that cannot do its job.
 *
 * THREE LEVELS OF IDENTITY, because documentation genuinely has three.
 * -------------------------------------------------------------------
 *   PRODUCT — a technical sheet or handling protocol describes the compound.
 *   VARIANT — a COA is produced for a specific strength. A 5 mg analysis says
 *             nothing about the 60 mg vial, and treating it as if it did is
 *             precisely the misrepresentation the project rules forbid.
 *   LOT     — the real unit of analytical truth. Two lots of one variant are
 *             two different manufacturing events.
 *
 * A lookup resolves MOST SPECIFIC FIRST and never widens upward: asking for a
 * lot's COA must not return the product-level sheet, because that would present
 * a general document as evidence about a particular vial.
 *
 * NOTHING IS DECLARED. `DOCUMENTS` is empty. No compound has a verified
 * document of any kind, so every lookup returns null and every surface renders
 * its unavailable state — which is why the UI and the data cannot disagree.
 * Phase 11 fills this; this phase only makes it fillable.
 */

/**
 * WHY `supplier-documentation` EXISTS AND IS INTERNAL-ONLY.
 *
 * Supplier paperwork is the most likely real document to appear first, and it
 * is the one that must never reach a browser: it carries supplier identity,
 * contact details and cost terms, all of which are private internal
 * reference. Rather than leave that to a reviewer's memory, the kind is
 * declared with `visibility: "internal"` enforced below — `publicDocumentsFor`
 * cannot return one, so a public surface cannot render one even by mistake.
 */
export type DocumentKind =
  /** Certificate of analysis for a variant or lot. */
  | "coa"
  /** A COA tied to a specific manufacturing lot. */
  | "lot-coa"
  /** Independent laboratory analysis. */
  | "third-party-analysis"
  /**
   * A Janoshik report specifically.
   *
   * Its own kind rather than a `third-party-analysis` with an issuer string,
   * because it is the one lab customers in this category ask for by name — and
   * because a report on one strength must never be presented as verifying
   * another, which the variant/lot scoping enforces.
   */
  | "janoshik-report"
  /** Compound-level technical data. */
  | "technical-sheet"
  /** Storage, reconstitution-agnostic handling and transport. */
  | "handling-protocol"
  /** INTERNAL. Never rendered publicly — see the note above. */
  | "supplier-documentation";

export type DocumentVisibility = "public" | "internal";

/** Kinds that may never be shown to a customer, whatever a record says. */
const INTERNAL_ONLY: ReadonlySet<DocumentKind> = new Set<DocumentKind>(["supplier-documentation"]);

/**
 * WHY `size` AND `format` ARE REQUIRED.
 *
 * A link that starts a download should say what it is about to hand you. They
 * are read off the real file — never estimated — which is why the type makes
 * them non-optional rather than letting a half-declared file through.
 */
export interface DocumentFile {
  /** Path under `public/`. Version the filename when the document changes. */
  href: string;
  /** e.g. "PDF". Shown next to the link. */
  format: string;
  /** Human-readable, read off the real file. e.g. "412 KB". */
  size: string;
  /** ISO date the document was issued. Never inferred from the file mtime. */
  issued: string;
}

/**
 * What a document is ABOUT.
 *
 * A discriminated union, not three optional fields, so "a COA with no variant"
 * is unrepresentable rather than a runtime check somebody forgets.
 */
export type DocumentScope =
  | { level: "product"; slug: string }
  | { level: "variant"; variantId: string }
  | { level: "lot"; variantId: string; lot: string };

export interface ProductDocument {
  kind: DocumentKind;
  scope: DocumentScope;
  file: DocumentFile;
  /**
   * The laboratory or party that produced it. Null when not stated.
   *
   * Never inferred from a filename or a kind: attributing an analysis to a lab
   * that did not sign it is a fabricated credential.
   */
  issuer: string | null;
  visibility: DocumentVisibility;
}

/**
 * THE DECLARED DOCUMENTS — deliberately empty.
 *
 * A flat list rather than a nested map: documents arrive one at a time, for
 * one lot of one variant, and a list is what that shape actually is. A nested
 * `Record<slug, Record<variant, Record<lot, ...>>>` would need three levels
 * created before the first file could be added.
 */
const DOCUMENTS: readonly ProductDocument[] = [];

/**
 * The kinds the current UI PRESENTS, in dictionary order.
 *
 * Distinct from the kinds the system can STORE: the product page and research
 * hub render three records, and their localized titles live in the
 * dictionaries. The other kinds are declarable now and presented in Phase 11 —
 * adding them here without copy would render blank rows.
 */
export const documentKinds: readonly DocumentKind[] = [
  "coa",
  "technical-sheet",
  "handling-protocol",
];

/** Everything the store can hold, for tooling and validation. */
export const allDocumentKinds: readonly DocumentKind[] = [
  "coa",
  "lot-coa",
  "third-party-analysis",
  "janoshik-report",
  "technical-sheet",
  "handling-protocol",
  "supplier-documentation",
];

export function isInternalKind(kind: DocumentKind): boolean {
  return INTERNAL_ONLY.has(kind);
}

/** What a caller is asking about. Increasingly specific. */
export interface DocumentTarget {
  slug: string;
  variantId?: string;
  lot?: string;
}

function scopeMatches(scope: DocumentScope, target: DocumentTarget): boolean {
  switch (scope.level) {
    case "product":
      return scope.slug === target.slug;
    case "variant":
      return target.variantId !== undefined && scope.variantId === target.variantId;
    case "lot":
      return (
        target.variantId !== undefined &&
        target.lot !== undefined &&
        scope.variantId === target.variantId &&
        scope.lot === target.lot
      );
  }
}

const SPECIFICITY: Record<DocumentScope["level"], number> = { lot: 3, variant: 2, product: 1 };

/**
 * Every document that applies to a target, most specific first.
 *
 * Includes internal records — this is the tooling accessor. Public surfaces
 * must call `publicDocumentsFor`.
 */
export function documentsFor(target: DocumentTarget): readonly ProductDocument[] {
  return DOCUMENTS.filter((doc) => scopeMatches(doc.scope, target)).sort(
    (a, b) => SPECIFICITY[b.scope.level] - SPECIFICITY[a.scope.level],
  );
}

/**
 * The same, filtered to what a customer may see.
 *
 * Two independent conditions, because either alone is insufficient: a record
 * marked public but of an internal-only KIND is still refused. That makes
 * accidental exposure require two mistakes rather than one.
 */
export function publicDocumentsFor(target: DocumentTarget): readonly ProductDocument[] {
  return documentsFor(target).filter(
    (doc) => doc.visibility === "public" && !isInternalKind(doc.kind),
  );
}

/**
 * The single most relevant PUBLIC document of one kind, or null.
 *
 * What the product page and research ledger call. Null for every product
 * today, which is the correct answer and the one the unavailable state renders.
 */
export function documentFile(kind: DocumentKind, target: DocumentTarget): DocumentFile | null {
  return publicDocumentsFor(target).find((doc) => doc.kind === kind)?.file ?? null;
}

/** Whether ANY public document exists for a product. Drives a trust affordance later. */
export function hasDocuments(slug: string): boolean {
  return publicDocumentsFor({ slug }).length > 0;
}
