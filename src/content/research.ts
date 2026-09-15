import { AREA_OVERVIEWS, areaCitedReferenceIds } from "@/content/areas";
import { citedReferenceIds, OVERVIEWS } from "@/content/overview";
import { isPublicReference, REFERENCES } from "@/content/references";
import { publishedProducts } from "@/data/catalog";
import { productsInArea } from "@/data/discovery";

import type { Reference } from "@/content/references";
import type { DiscoveryAreaId } from "@/data/discovery/types";

/**
 * THE RESEARCH CONNECTION — one truth, read from both ends.
 *
 *   PDP research section  →  Reference Registry  ←  Research Hub
 *
 * A reference is never attached to a product directly. It is CITED by a
 * sourced statement in that product's overview, and the product ↔ reference
 * relationship is derived from those citations. So there is no second list of
 * "papers about this compound" to drift out of step with what the page
 * actually says — a reference appears on a product page exactly when a
 * published statement on that page cites it, and in the hub's index exactly
 * when at least one such statement exists anywhere.
 *
 * Server-only by construction: it imports the catalogue. The hub and pages
 * pass the resolved, already-public records down to components as props.
 */

/** Public references cited by a product's public overview, in registry order. */
export function referencesForProduct(slug: string): readonly Reference[] {
  const ids = new Set(citedReferenceIds(slug));
  return REFERENCES.filter((ref) => ids.has(ref.id) && isPublicReference(ref));
}

/** Products whose public overview cites a reference. */
export function productsCitingReference(referenceId: string): readonly string[] {
  return publishedProducts
    .filter((p) => citedReferenceIds(p.slug).includes(referenceId))
    .map((p) => p.slug);
}

/**
 * References relevant to a discovery area: everything cited by the public
 * overviews of the area's products.
 *
 * Derived rather than tagged. Area copy stays a merchandising label and never
 * acquires a bibliography of its own that nothing on a product page supports.
 */
export function referencesForArea(area: DiscoveryAreaId): readonly Reference[] {
  const ids = new Set([
    ...productsInArea(area).flatMap((p) => citedReferenceIds(p.slug)),
    /* The area's own context section cites too, under the same rules. */
    ...areaCitedReferenceIds(area),
  ]);
  return REFERENCES.filter((ref) => ids.has(ref.id) && isPublicReference(ref));
}

export interface AreaResearchEntry {
  reference: Reference;
  /** Compounds OF THIS AREA whose public overview cites the reference. */
  products: readonly string[];
}

/** The registries the area research connection reads. Real by default. */
export interface AreaResearchDeps {
  overviews: typeof OVERVIEWS;
  areaOverviews: typeof AREA_OVERVIEWS;
  references: readonly Reference[];
}

const AREA_RESEARCH_DEPS: AreaResearchDeps = {
  overviews: OVERVIEWS,
  areaOverviews: AREA_OVERVIEWS,
  references: REFERENCES,
};

/**
 * The area page's research connection: each public reference the area cites,
 * with the area's own compounds that cite it. A reference cited only by the
 * area context carries an empty product list — it is still a real citation,
 * but the page must not attach it to a compound that never cited it.
 *
 * Registries are injectable for the same reason the evidence resolver's are:
 * so a check, or the development-only design preview, can drive every branch
 * without a fixture ever touching the real registry.
 */
export function areaResearch(
  area: DiscoveryAreaId,
  deps: AreaResearchDeps = AREA_RESEARCH_DEPS,
): readonly AreaResearchEntry[] {
  const items = productsInArea(area);
  const productDeps = { overviews: deps.overviews, references: deps.references };
  const citedBy = new Map(items.map((p) => [p.slug, citedReferenceIds(p.slug, productDeps)]));
  const ids = new Set([
    ...[...citedBy.values()].flat(),
    ...areaCitedReferenceIds(area, { overviews: deps.areaOverviews, references: deps.references }),
  ]);
  return deps.references
    .filter((ref) => ids.has(ref.id) && isPublicReference(ref))
    .map((reference) => ({
      reference,
      products: items.filter((p) => citedBy.get(p.slug)?.includes(reference.id)).map((p) => p.slug),
    }));
}

export interface ResearchIndexEntry {
  reference: Reference;
  products: readonly string[];
}

/** The hub's reference index: every cited public reference and who cites it. */
export function researchReferenceIndex(): readonly ResearchIndexEntry[] {
  return REFERENCES.filter(isPublicReference)
    .map((reference) => ({ reference, products: productsCitingReference(reference.id) }))
    .filter((entry) => entry.products.length > 0)
    .sort((a, b) => (b.reference.year ?? 0) - (a.reference.year ?? 0));
}
