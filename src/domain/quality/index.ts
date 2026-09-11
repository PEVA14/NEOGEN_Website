import { DOCUMENTS, INTERNAL_ONLY_TYPES, isKnownDocumentType } from "@/content/documents";
import { getIssuer, getLot, ISSUERS, LOTS, publicLot } from "@/data/quality";

import type { DocumentScope, DocumentType, QualityDocument } from "@/content/documents";
import type { Issuer, Lot, PublicLot } from "@/data/quality";

/**
 * THE EVIDENCE RESOLVER — the only thing allowed to decide a trust state.
 *
 * A visible quality state on any NEOGEN surface comes from here and nowhere
 * else. No component sets a badge, no dictionary string implies one, and no
 * product carries a "verified" flag. If this function returns nothing, the
 * page shows its deliberate no-evidence state.
 *
 * NARROWEST LEVEL, NEVER WIDER.
 * -----------------------------
 * Evidence attaches to the narrowest thing it actually supports and does not
 * travel upward:
 *
 *   a LOT COA          → that lot, of that presentation. Not the presentation's
 *                        other lots. Not the product.
 *   a VARIANT analysis → that presentation. Not the 5 mg when it tested 10 mg.
 *   a PRODUCT document → documentation about the compound — a technical sheet.
 *                        It can never be an analysis: an analysis that does
 *                        not name a presentation is refused, because it could
 *                        only be read as verifying all of them.
 *
 * So there is no code path that turns one presentation's report into another
 * presentation's state, and `check:quality` tests every widening it can think
 * of.
 *
 * FAIL SAFE. An unknown type, an unknown issuer, a scope that does not resolve
 * to this product, a missing file: the document is dropped from the public
 * result and reported by `auditDocuments`. Nothing unknown renders "as best
 * it can".
 *
 * PURE. Registries are injected with production defaults, which is what lets
 * the checks drive every branch with fixtures while the site reads the real —
 * currently empty — registries.
 */

export type EvidenceLevel = "product" | "variant" | "lot";

/**
 * The factual states a surface may show. Ordered weakest to strongest.
 *
 * Each is a statement about a document that exists, never a quality claim
 * about a substance: "a certificate of analysis is available for this lot" is
 * a fact NEOGEN can support; "this lot is pure" is not NEOGEN's to say.
 */
export const EVIDENCE_STATES = [
  "documentation-available",
  "coa-available",
  "lot-coa",
  "third-party-tested",
  "janoshik-verified",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];

export interface EvidenceRecord {
  documentId: string;
  type: DocumentType;
  level: EvidenceLevel;
  /** Null at product level. */
  variantId: string | null;
  /** Only at lot level, and only for a public lot. */
  lot: PublicLot | null;
  /** Public issuer identity: a name, or a role when the name is private. */
  issuer: { id: string; name: string | null; kind: Issuer["kind"] };
  issuedOn: string | null;
  reportId: string | null;
  /** Where to read it: the hosted file, else the issuer's report page. */
  href: string;
  file: { format: string; size: string } | null;
  external: boolean;
  states: readonly EvidenceState[];
}

export interface PresentationEvidence {
  variantId: string;
  records: readonly EvidenceRecord[];
  /** Distinct states across this presentation's records, strongest first. */
  states: readonly EvidenceState[];
}

export interface ProductEvidence {
  slug: string;
  /** Documentation about the compound — never analyses. */
  product: readonly EvidenceRecord[];
  presentations: readonly PresentationEvidence[];
  /** True if anything at all resolved. The only input to "show a state or not". */
  hasEvidence: boolean;
}

export interface QualityRegistries {
  documents: readonly QualityDocument[];
  lots: readonly Lot[];
  issuers: Readonly<Record<string, Issuer>>;
}

export const DEFAULT_REGISTRIES: QualityRegistries = {
  documents: DOCUMENTS,
  lots: LOTS,
  issuers: ISSUERS,
};

/** The subset of a catalogue product the resolver needs. */
export interface EvidenceSubject {
  slug: string;
  variants: readonly { id: string }[];
}

export type DocumentRejection =
  | "unknown_type"
  | "unknown_issuer"
  | "internal_type"
  | "not_public"
  | "not_approved"
  | "level_not_allowed_for_type"
  | "scope_other_product"
  | "scope_unknown_variant"
  | "scope_unknown_lot"
  | "lot_not_public"
  | "no_file_or_report_url"
  | "report_url_invalid"
  | "janoshik_without_report_id"
  | "janoshik_wrong_type"
  | "analysis_by_non_independent_issuer";

/**
 * WHICH LEVELS EACH TYPE MAY BE ATTACHED AT.
 *
 * The rule that makes widening impossible lives in this table. Every analysis
 * type is variant- or lot-only; nothing that tests a substance may attach at
 * product level.
 */
const ALLOWED_LEVELS: Readonly<Record<DocumentType, readonly EvidenceLevel[]>> = {
  "technical-document": ["product", "variant"],
  "handling-storage": ["product", "variant"],
  "supplier-documentation": [],
  coa: ["variant", "lot"],
  "lot-coa": ["lot"],
  "third-party-analysis": ["variant", "lot"],
  "analytical-report": ["variant", "lot"],
};

/**
 * THE JANOSHIK RULE — all five conditions, or no Janoshik state.
 *
 *   1. a real document record exists (it is being evaluated, so it does);
 *   2. its issuer is exactly `janoshik`;
 *   3. it carries the laboratory's own report / task identifier;
 *   4. it is attached to an exact presentation or lot — never a product;
 *   5. it is explicitly public and approved.
 *
 * And it must be a third-party analysis. A Janoshik-issued document that fails
 * condition 3 is not downgraded to a generic "tested" state — it is refused
 * outright, because showing the laboratory's name without a report a reader
 * can check is the misrepresentation this rule exists to prevent.
 */
export function isJanoshikVerified(doc: QualityDocument, level: EvidenceLevel): boolean {
  return (
    doc.issuer === "janoshik" &&
    doc.type === "third-party-analysis" &&
    typeof doc.reportId === "string" &&
    doc.reportId.trim().length > 0 &&
    (level === "variant" || level === "lot") &&
    doc.visibility === "public" &&
    doc.status === "approved"
  );
}

function statesFor(doc: QualityDocument, issuer: Issuer, level: EvidenceLevel): EvidenceState[] {
  switch (doc.type) {
    case "technical-document":
    case "handling-storage":
      return ["documentation-available"];
    case "coa":
      return level === "lot" ? ["lot-coa"] : ["coa-available"];
    case "lot-coa":
      return ["lot-coa"];
    case "third-party-analysis":
      return isJanoshikVerified(doc, level)
        ? ["third-party-tested", "janoshik-verified"]
        : ["third-party-tested"];
    case "analytical-report":
      return issuer.kind === "independent-laboratory"
        ? ["third-party-tested"]
        : ["documentation-available"];
    case "supplier-documentation":
      return [];
  }
}

type Evaluation = { ok: true; record: EvidenceRecord } | { ok: false; reason: DocumentRejection };

function resolveScope(
  scope: DocumentScope,
  subject: EvidenceSubject,
  lots: readonly Lot[],
):
  | { ok: true; level: EvidenceLevel; variantId: string | null; lot: Lot | null }
  | { ok: false; reason: DocumentRejection } {
  switch (scope.level) {
    case "product":
      return scope.slug === subject.slug
        ? { ok: true, level: "product", variantId: null, lot: null }
        : { ok: false, reason: "scope_other_product" };
    case "variant":
      if (scope.slug !== subject.slug) return { ok: false, reason: "scope_other_product" };
      return subject.variants.some((v) => v.id === scope.variantId)
        ? { ok: true, level: "variant", variantId: scope.variantId, lot: null }
        : { ok: false, reason: "scope_unknown_variant" };
    case "lot": {
      const lot = getLot(scope.lotId, lots);
      if (!lot) return { ok: false, reason: "scope_unknown_lot" };
      if (lot.slug !== subject.slug) return { ok: false, reason: "scope_other_product" };
      if (!subject.variants.some((v) => v.id === lot.variantId)) {
        return { ok: false, reason: "scope_unknown_variant" };
      }
      return { ok: true, level: "lot", variantId: lot.variantId, lot };
    }
  }
}

/**
 * Evaluate one document against one product. The single decision point —
 * `resolveEvidence` and `auditDocuments` both call this, so what renders and
 * what the audit reports cannot disagree.
 */
export function evaluateDocument(
  doc: QualityDocument,
  subject: EvidenceSubject,
  registries: QualityRegistries = DEFAULT_REGISTRIES,
): Evaluation {
  if (!isKnownDocumentType(doc.type)) return { ok: false, reason: "unknown_type" };
  const issuer = getIssuer(doc.issuer, registries.issuers);
  if (!issuer) return { ok: false, reason: "unknown_issuer" };
  if (INTERNAL_ONLY_TYPES.has(doc.type)) return { ok: false, reason: "internal_type" };
  if (doc.visibility !== "public") return { ok: false, reason: "not_public" };
  if (doc.status !== "approved") return { ok: false, reason: "not_approved" };

  const scope = resolveScope(doc.scope, subject, registries.lots);
  if (!scope.ok) return scope;
  if (!ALLOWED_LEVELS[doc.type].includes(scope.level)) {
    return { ok: false, reason: "level_not_allowed_for_type" };
  }

  /* A lot that is not public cannot be named, so neither can its evidence. */
  const lot = scope.lot ? publicLot(scope.lot) : null;
  if (scope.lot && !lot) return { ok: false, reason: "lot_not_public" };

  if (doc.issuer === "janoshik") {
    if (doc.type !== "third-party-analysis") return { ok: false, reason: "janoshik_wrong_type" };
    if (!doc.reportId || !doc.reportId.trim()) {
      return { ok: false, reason: "janoshik_without_report_id" };
    }
  }

  if (doc.type === "third-party-analysis" && issuer.kind !== "independent-laboratory") {
    return { ok: false, reason: "analysis_by_non_independent_issuer" };
  }

  if (doc.reportUrl !== null && !/^https:\/\/\S+$/.test(doc.reportUrl)) {
    return { ok: false, reason: "report_url_invalid" };
  }
  const href = doc.file?.href ?? doc.reportUrl;
  if (!href) return { ok: false, reason: "no_file_or_report_url" };

  return {
    ok: true,
    record: {
      documentId: doc.id,
      type: doc.type,
      level: scope.level,
      variantId: scope.variantId,
      lot,
      issuer: {
        id: issuer.id,
        name: issuer.publicName ? issuer.name : null,
        kind: issuer.kind,
      },
      issuedOn: doc.issuedOn,
      reportId: doc.reportId,
      href,
      file: doc.file ? { format: doc.file.format, size: doc.file.size } : null,
      external: !doc.file,
      states: statesFor(doc, issuer, scope.level),
    },
  };
}

const RANK = new Map<EvidenceState, number>(EVIDENCE_STATES.map((s, i) => [s, i]));

function distinctStrongestFirst(states: readonly EvidenceState[]): EvidenceState[] {
  return [...new Set(states)].sort((a, b) => (RANK.get(b) ?? 0) - (RANK.get(a) ?? 0));
}

/**
 * Resolve every public piece of evidence for one product.
 *
 * Every presentation is listed, including the ones with nothing — the page
 * shows the whole ladder, so a reader can see that the 10 mg has a report and
 * the 60 mg does not, instead of inferring coverage from a product-level badge.
 */
export function resolveEvidence(
  subject: EvidenceSubject,
  registries: QualityRegistries = DEFAULT_REGISTRIES,
): ProductEvidence {
  const accepted = registries.documents
    .map((doc) => evaluateDocument(doc, subject, registries))
    .filter((e): e is { ok: true; record: EvidenceRecord } => e.ok)
    .map((e) => e.record)
    .sort((a, b) => (b.issuedOn ?? "").localeCompare(a.issuedOn ?? ""));

  const product = accepted.filter((r) => r.level === "product");
  const presentations = subject.variants.map((variant) => {
    const records = accepted.filter((r) => r.level !== "product" && r.variantId === variant.id);
    return {
      variantId: variant.id,
      records,
      states: distinctStrongestFirst(records.flatMap((r) => r.states)),
    };
  });

  return {
    slug: subject.slug,
    product,
    presentations,
    hasEvidence: accepted.length > 0,
  };
}

export interface DocumentAuditIssue {
  documentId: string;
  reason: DocumentRejection | "scope_matches_no_product" | "duplicate_id";
}

/**
 * Every declared document that will NOT render, and why — for tooling.
 *
 * Documents that are simply internal or not yet approved are not errors; they
 * are waiting. Everything else — an unknown issuer, a Janoshik record with no
 * report id, an analysis attached to a whole product — is a data error and
 * fails `check:quality`.
 */
export function auditDocuments(
  subjects: readonly EvidenceSubject[],
  registries: QualityRegistries = DEFAULT_REGISTRIES,
): readonly DocumentAuditIssue[] {
  const issues: DocumentAuditIssue[] = [];
  const seen = new Set<string>();
  const waiting: ReadonlySet<DocumentRejection> = new Set([
    "not_public",
    "not_approved",
    "internal_type",
  ]);

  for (const doc of registries.documents) {
    if (seen.has(doc.id)) issues.push({ documentId: doc.id, reason: "duplicate_id" });
    seen.add(doc.id);

    const owner = subjectFor(doc.scope, subjects, registries.lots);
    if (!owner) {
      issues.push({ documentId: doc.id, reason: "scope_matches_no_product" });
      continue;
    }
    const result = evaluateDocument(doc, owner, registries);
    if (!result.ok && !waiting.has(result.reason)) {
      issues.push({ documentId: doc.id, reason: result.reason });
    }
  }
  return issues;
}

function subjectFor(
  scope: DocumentScope,
  subjects: readonly EvidenceSubject[],
  lots: readonly Lot[],
): EvidenceSubject | undefined {
  if (scope.level === "lot") {
    const lot = getLot(scope.lotId, lots);
    return lot ? subjects.find((s) => s.slug === lot.slug) : undefined;
  }
  return subjects.find((s) => s.slug === scope.slug);
}

/** One row of the public documentation index. */
export interface IndexedEvidence extends EvidenceRecord {
  slug: string;
}

/** Every public record across the catalogue, for the documentation explorer. */
export function publicEvidenceIndex(
  subjects: readonly EvidenceSubject[],
  registries: QualityRegistries = DEFAULT_REGISTRIES,
): readonly IndexedEvidence[] {
  return subjects.flatMap((subject) => {
    const evidence = resolveEvidence(subject, registries);
    return [...evidence.product, ...evidence.presentations.flatMap((p) => p.records)].map(
      (record) => ({ ...record, slug: subject.slug }),
    );
  });
}
