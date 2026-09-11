import { REFERENCES } from "./registry";

import type { Reference, SourceType } from "./types";

export type { Reference, SourceType } from "./types";
export { REFERENCES } from "./registry";

export const SOURCE_TYPES: readonly SourceType[] = [
  "journal-article",
  "review-article",
  "clinical-trial-registry",
  "preprint",
  "book",
  "regulatory-document",
  "dataset",
  "other",
];

export type ReferenceIssueCode =
  | "missing_title"
  | "missing_authors"
  | "no_identifier"
  | "doi_invalid"
  | "pmid_invalid"
  | "url_invalid"
  | "year_invalid"
  | "source_type_unknown";

export interface ReferenceIssue {
  referenceId: string;
  code: ReferenceIssueCode;
}

/** A bare DOI: prefix `10.` + registrant, a slash, a suffix. */
const DOI = /^10\.\d{4,9}\/\S+$/;
const PMID = /^\d{1,9}$/;

/**
 * Structural validation — the part a machine can check.
 *
 * It cannot check that the title matches the paper; that is what `status`
 * records a human doing. It CAN refuse a record that could never be followed
 * back to its source, which is the minimum a citation has to be.
 */
export function validateReference(
  ref: Reference,
  currentYear: number = new Date().getFullYear(),
): readonly ReferenceIssue[] {
  const issues: ReferenceIssue[] = [];
  const push = (code: ReferenceIssueCode) => issues.push({ referenceId: ref.id, code });

  if (!ref.title.trim()) push("missing_title");
  if (ref.authors.length === 0 || ref.authors.some((a) => !a.trim())) push("missing_authors");
  if (!ref.doi && !ref.pmid && !ref.url) push("no_identifier");
  if (ref.doi !== null && !DOI.test(ref.doi)) push("doi_invalid");
  if (ref.pmid !== null && !PMID.test(ref.pmid)) push("pmid_invalid");
  if (ref.url !== null && !/^https:\/\/\S+$/.test(ref.url)) push("url_invalid");
  if (
    ref.year !== null &&
    (!Number.isInteger(ref.year) || ref.year < 1800 || ref.year > currentYear)
  ) {
    push("year_invalid");
  }
  if (!SOURCE_TYPES.includes(ref.sourceType)) push("source_type_unknown");
  return issues;
}

/** Approved AND structurally valid. The only references a page may cite. */
export function isPublicReference(ref: Reference): boolean {
  return ref.status === "approved" && validateReference(ref).length === 0;
}

export function getReference(
  id: string,
  registry: readonly Reference[] = REFERENCES,
): Reference | undefined {
  return registry.find((r) => r.id === id);
}

/** Resolve ids to PUBLIC references, dropping any that are missing or unapproved. */
export function publicReferencesById(
  ids: readonly string[],
  registry: readonly Reference[] = REFERENCES,
): readonly Reference[] {
  const seen = new Set<string>();
  const out: Reference[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const ref = getReference(id, registry);
    if (ref && isPublicReference(ref)) out.push(ref);
  }
  return out;
}

/**
 * Where a reader follows the citation.
 *
 * DOI first, because a DOI survives a publisher moving its site; PubMed
 * second; the raw URL last. Built from the identifier, so the link and the
 * identifier printed beside it cannot disagree.
 */
export function referenceHref(ref: Reference): string | null {
  if (ref.doi) return `https://doi.org/${ref.doi}`;
  if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`;
  return ref.url;
}
