import { forbiddenTermIn, isPublishable } from "@/content/lifecycle";
import { publicReferencesById, REFERENCES } from "@/content/references";

import { OVERVIEWS } from "./registry";

import type { Locale } from "@/i18n/config";
import type { Reference } from "@/content/references";
import type { DiscoveryAreaId } from "@/data/discovery/types";
import type { CopyBlock, ProductOverview, SourcedStatement } from "./types";

export type { CopyBlock, ProductOverview, SourcedStatement } from "./types";
export { OVERVIEWS } from "./registry";

export interface PublicStatement {
  id: string;
  text: string;
  references: readonly Reference[];
}

export interface PublicOverview {
  summary: string | null;
  researchContext: readonly PublicStatement[];
  areasOfInvestigation: readonly { area: DiscoveryAreaId; statement: PublicStatement }[];
  mechanismNotes: readonly PublicStatement[];
  keyReferences: readonly Reference[];
  technicalNotes: readonly string[];
}

export type OverviewIssueCode =
  | "statement_without_reference"
  | "reference_not_public"
  | "statement_not_scientific_class"
  | "forbidden_term"
  | "derived_copy_without_lineage"
  | "empty_text";

export interface OverviewIssue {
  slug: string;
  itemId: string;
  code: OverviewIssueCode;
  detail?: string;
}

interface Deps {
  overviews: Readonly<Record<string, ProductOverview>>;
  references: readonly Reference[];
}

const DEFAULT_DEPS: Deps = { overviews: OVERVIEWS, references: REFERENCES };

/**
 * Can this sourced statement render, in this locale?
 *
 * Four conditions, all required: its lifecycle is publishable, it is class C
 * (a scientific statement dressed as derived copy is how a claim avoids
 * needing a source), its text contains no forbidden vocabulary, and at least
 * one of its references is public. A statement whose only reference was
 * withdrawn disappears with it.
 */
function publicStatement(
  statement: SourcedStatement,
  locale: Locale,
  references: readonly Reference[],
): PublicStatement | null {
  if (!isPublishable(statement.provenance)) return null;
  if (statement.provenance.class !== "scientific-source") return null;
  const text = statement.text[locale]?.trim();
  if (!text) return null;
  if (
    forbiddenTermIn(text) ||
    forbiddenTermIn(statement.text.es) ||
    forbiddenTermIn(statement.text.en)
  ) {
    return null;
  }
  const refs = publicReferencesById(statement.references, references);
  if (refs.length === 0) return null;
  return { id: statement.id, text, references: refs };
}

function publicCopy(block: CopyBlock | null, locale: Locale): string | null {
  if (!block || !isPublishable(block.provenance)) return null;
  /* A copy block may not carry a scientific claim at all — that is what
     `SourcedStatement` is for. */
  if (block.provenance.class === "scientific-source") return null;
  const text = block.text[locale]?.trim();
  if (!text) return null;
  if (forbiddenTermIn(block.text.es) || forbiddenTermIn(block.text.en)) return null;
  return text;
}

/**
 * The publishable part of a product's overview, or null when nothing is.
 *
 * Null is the common case and the correct one: the product page omits the
 * section entirely rather than rendering a heading over nothing.
 */
export function publicOverview(
  slug: string,
  locale: Locale,
  deps: Deps = DEFAULT_DEPS,
): PublicOverview | null {
  const overview = deps.overviews[slug];
  if (!overview) return null;

  const pick = (list: readonly SourcedStatement[]) =>
    list
      .map((s) => publicStatement(s, locale, deps.references))
      .filter((s): s is PublicStatement => s !== null);

  const result: PublicOverview = {
    summary: publicCopy(overview.summary, locale),
    researchContext: pick(overview.researchContext),
    areasOfInvestigation: overview.areasOfInvestigation
      .map((entry) => {
        const statement = publicStatement(entry.statement, locale, deps.references);
        return statement ? { area: entry.area, statement } : null;
      })
      .filter((e): e is { area: DiscoveryAreaId; statement: PublicStatement } => e !== null),
    mechanismNotes: pick(overview.mechanismNotes),
    keyReferences: publicReferencesById(overview.keyReferences, deps.references),
    technicalNotes: overview.technicalNotes
      .map((n) => publicCopy(n, locale))
      .filter((n): n is string => n !== null),
  };

  const empty =
    !result.summary &&
    result.researchContext.length === 0 &&
    result.areasOfInvestigation.length === 0 &&
    result.mechanismNotes.length === 0 &&
    result.keyReferences.length === 0 &&
    result.technicalNotes.length === 0;
  return empty ? null : result;
}

/** Every reference id a product's public overview cites. */
export function citedReferenceIds(slug: string, deps: Deps = DEFAULT_DEPS): readonly string[] {
  const ids = new Set<string>();
  for (const locale of ["es", "en"] as const) {
    const o = publicOverview(slug, locale, deps);
    if (!o) continue;
    for (const s of [
      ...o.researchContext,
      ...o.mechanismNotes,
      ...o.areasOfInvestigation.map((a) => a.statement),
    ]) {
      for (const r of s.references) ids.add(r.id);
    }
    for (const r of o.keyReferences) ids.add(r.id);
  }
  return [...ids];
}

/**
 * Everything wrong with the declared overviews — for tooling, not pages.
 *
 * Pages call `publicOverview`, which silently drops what cannot render. This
 * reports it, so an approved statement that quietly vanished because its paper
 * was withdrawn shows up as a failing check rather than as a shorter page.
 */
export function auditOverviews(deps: Deps = DEFAULT_DEPS): readonly OverviewIssue[] {
  const issues: OverviewIssue[] = [];
  const known = new Map(deps.references.map((r) => [r.id, r]));

  for (const overview of Object.values(deps.overviews)) {
    const statements = [
      ...overview.researchContext,
      ...overview.mechanismNotes,
      ...overview.areasOfInvestigation.map((a) => a.statement),
    ];
    for (const s of statements) {
      if (!s.text.es.trim() || !s.text.en.trim()) {
        issues.push({ slug: overview.slug, itemId: s.id, code: "empty_text" });
      }
      const term = forbiddenTermIn(s.text.es) ?? forbiddenTermIn(s.text.en);
      if (term)
        issues.push({ slug: overview.slug, itemId: s.id, code: "forbidden_term", detail: term });
      if (s.provenance.class !== "scientific-source") {
        issues.push({ slug: overview.slug, itemId: s.id, code: "statement_not_scientific_class" });
      }
      if (s.references.length === 0) {
        issues.push({ slug: overview.slug, itemId: s.id, code: "statement_without_reference" });
      }
      if (s.provenance.status === "approved") {
        for (const id of s.references) {
          const ref = known.get(id);
          if (!ref || publicReferencesById([id], deps.references).length === 0) {
            issues.push({
              slug: overview.slug,
              itemId: s.id,
              code: "reference_not_public",
              detail: id,
            });
          }
        }
      }
    }
    for (const block of [overview.summary, ...overview.technicalNotes]) {
      if (!block) continue;
      const term = forbiddenTermIn(block.text.es) ?? forbiddenTermIn(block.text.en);
      if (term)
        issues.push({
          slug: overview.slug,
          itemId: block.id,
          code: "forbidden_term",
          detail: term,
        });
      if (
        block.provenance.class === "derived-copy" &&
        !isPublishable({ ...block.provenance, status: "approved" })
      ) {
        issues.push({
          slug: overview.slug,
          itemId: block.id,
          code: "derived_copy_without_lineage",
        });
      }
    }
  }
  return issues;
}
