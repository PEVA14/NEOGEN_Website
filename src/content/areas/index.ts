import { forbiddenTermIn } from "@/content/lifecycle";
import {
  publicCopy,
  publicStatement,
  type PublicStatement,
  type SourcedStatement,
} from "@/content/overview";
import { publicReferencesById, REFERENCES, type Reference } from "@/content/references";

import { AREA_OVERVIEWS } from "./registry";

import type { DiscoveryAreaId } from "@/data/discovery/types";
import type { Locale } from "@/i18n/config";
import type { AreaOverview } from "./types";

export type { AreaOverview } from "./types";
export { AREA_OVERVIEWS } from "./registry";

export interface PublicAreaOverview {
  summary: string | null;
  themes: readonly PublicStatement[];
  pathways: readonly PublicStatement[];
  keyReferences: readonly Reference[];
}

interface Deps {
  overviews: Readonly<Partial<Record<DiscoveryAreaId, AreaOverview>>>;
  references: readonly Reference[];
}

const DEFAULT_DEPS: Deps = { overviews: AREA_OVERVIEWS, references: REFERENCES };

/**
 * The publishable part of an area's context, or null when nothing is.
 *
 * Null is today's answer for every area, and the page omits the section. The
 * rules are the product overview's own: an unsourced, unapproved, mis-classed
 * or forbidden-vocabulary statement is dropped, not softened.
 */
export function publicAreaOverview(
  area: DiscoveryAreaId,
  locale: Locale,
  deps: Deps = DEFAULT_DEPS,
): PublicAreaOverview | null {
  const overview = deps.overviews[area];
  if (!overview) return null;

  const pick = (list: readonly SourcedStatement[]) =>
    list
      .map((s) => publicStatement(s, locale, deps.references))
      .filter((s): s is PublicStatement => s !== null);

  const result: PublicAreaOverview = {
    summary: publicCopy(overview.summary, locale),
    themes: pick(overview.themes),
    pathways: pick(overview.pathways),
    keyReferences: publicReferencesById(overview.keyReferences, deps.references),
  };

  /*
   * A summary alone is not a context section. Without at least one sourced
   * statement the page would be setting a framing sentence under a heading
   * that promises research context, which is the "sounds right" failure.
   */
  if (result.themes.length === 0 && result.pathways.length === 0) return null;
  return result;
}

/** Reference ids an area's public overview cites, in either locale. */
export function areaCitedReferenceIds(
  area: DiscoveryAreaId,
  deps: Deps = DEFAULT_DEPS,
): readonly string[] {
  const ids = new Set<string>();
  for (const locale of ["es", "en"] as const) {
    const o = publicAreaOverview(area, locale, deps);
    if (!o) continue;
    for (const s of [...o.themes, ...o.pathways]) for (const r of s.references) ids.add(r.id);
    for (const r of o.keyReferences) ids.add(r.id);
  }
  return [...ids];
}

export interface AreaOverviewIssue {
  area: DiscoveryAreaId;
  itemId: string;
  code: "statement_without_reference" | "statement_not_scientific_class" | "forbidden_term";
  detail?: string;
}

/** Everything wrong with the declared area overviews — for `check:content`. */
export function auditAreaOverviews(deps: Deps = DEFAULT_DEPS): readonly AreaOverviewIssue[] {
  const issues: AreaOverviewIssue[] = [];
  for (const overview of Object.values(deps.overviews)) {
    if (!overview) continue;
    for (const s of [...overview.themes, ...overview.pathways]) {
      if (s.references.length === 0)
        issues.push({ area: overview.area, itemId: s.id, code: "statement_without_reference" });
      if (s.provenance.class !== "scientific-source")
        issues.push({ area: overview.area, itemId: s.id, code: "statement_not_scientific_class" });
      const term = forbiddenTermIn(s.text.es) ?? forbiddenTermIn(s.text.en);
      if (term)
        issues.push({ area: overview.area, itemId: s.id, code: "forbidden_term", detail: term });
    }
  }
  return issues;
}
