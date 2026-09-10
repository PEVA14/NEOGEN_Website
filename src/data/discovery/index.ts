import { products, type Product } from "@/data/catalog";

import { AREAS } from "./areas";
import { ASSIGNMENTS } from "./assignments";
import { isPublic } from "./types";

import type { DiscoveryArea, DiscoveryAreaId, DiscoveryAssignment } from "./types";

export { AREAS, areaBySlug, areaIds, getArea } from "./areas";
export { ASSIGNMENTS } from "./assignments";
export { isPublic } from "./types";
export type { DiscoveryArea, DiscoveryAreaId, DiscoveryAssignment, Provenance } from "./types";

const NONE: readonly DiscoveryAssignment[] = [];

/**
 * Every assignment held for a product, DRAFTS INCLUDED.
 *
 * For tooling and review only — the owner-review table reads this. No page
 * may call it: use `publicAreasFor`.
 */
export function assignmentsFor(slug: string): readonly DiscoveryAssignment[] {
  return ASSIGNMENTS[slug] ?? NONE;
}

/**
 * The areas a product may be SHOWN in, in display order.
 *
 * This is the only discovery accessor a component should reach for. Drafts are
 * filtered out here, once, so no page has to remember to do it — and the
 * default behaviour of forgetting is to show nothing rather than to show an
 * unsupported claim.
 */
export function publicAreasFor(slug: string): readonly DiscoveryArea[] {
  return (
    assignmentsFor(slug)
      .filter(isPublic)
      /*
       * An id with no matching area is DROPPED, not thrown on. A typo in the
       * assignment map should cost a product its place in one listing, never a
       * 500 on the catalogue — and `check:catalog` reports it by name, so it
       * cannot hide. Failing safe here is what makes the check able to report
       * every problem instead of dying on the first.
       */
      .map((a) => AREAS.find((area) => area.id === a.area))
      .filter((area): area is DiscoveryArea => Boolean(area))
      .sort((a, b) => a.order - b.order)
  );
}

/** Products publicly filed under an area, in catalogue order. */
export function productsInArea(area: DiscoveryAreaId): readonly Product[] {
  return products.filter((p) => publicAreasFor(p.slug).some((a) => a.id === area));
}

/**
 * Areas with at least one product to show.
 *
 * Drives the nav, the homepage and the catalogue's filter row, so an area
 * cannot appear anywhere until it has something in it. Today this is empty:
 * every assignment is still a draft.
 */
export function publicAreas(): readonly DiscoveryArea[] {
  return AREAS.filter((area) => productsInArea(area.id).length > 0).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * Other products sharing at least one public area, closest first.
 *
 * "Closest" is the number of areas in common, so a product overlapping in two
 * areas outranks one overlapping in a single area. Falls back to nothing
 * rather than to an arbitrary list — the caller decides what to do with an
 * empty result, because on the product page the honest fallback is the
 * existing same-category behaviour.
 */
export function relatedByArea(slug: string, limit = 3): readonly Product[] {
  const own = new Set(publicAreasFor(slug).map((a) => a.id));
  if (own.size === 0) return [];

  return products
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      product: p,
      shared: publicAreasFor(p.slug).filter((a) => own.has(a.id)).length,
    }))
    .filter((row) => row.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map((row) => row.product);
}
