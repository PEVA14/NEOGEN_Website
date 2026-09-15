import { productsInArea, publicAreas } from "@/data/discovery";

import type { DiscoveryArea, DiscoveryAreaId } from "@/data/discovery";

/**
 * AREA PAGE DERIVATIONS — what a discovery area page shows, decided from data.
 *
 * An area page is one system rendered eight times, and the only honest source
 * of variation between the eight is the catalogue itself: how many compounds
 * an area holds, which of them are flagships, which areas share compounds with
 * it. Every section the page renders is the output of one of these functions,
 * and a section whose function returns nothing is not rendered.
 *
 * PURE. Inputs are products and area ids; nothing here reads the clock, the
 * request or a dictionary, which is what lets `check:catalog` assert every rule
 * against the real registry.
 *
 * WHAT NONE OF THIS MAY EVER SAY: that a compound is popular, recommended,
 * best-selling or better than another. There is no data for any of that, so
 * the ordering rules below are stated as what they are — flagship designation,
 * then catalogue order — and the page labels the result "entry compounds".
 */

/** The minimum a derivation needs from a product. */
export interface AreaSubject {
  slug: string;
  /** Non-null for the three flagships, which carry an Experience world. */
  world: string | null;
}

/**
 * HOW MANY ENTRY COMPOUNDS AN AREA FEATURES — a function of its size.
 *
 *   12 or more   three: one lead and two beside it
 *   5 – 11       two: one lead and one beside it
 *   4 or fewer   none
 *
 * The floor matters more than the steps. Featuring two of three materials
 * repeats most of the list directly above the list, which is not an editorial
 * choice but an echo; below five compounds the full index IS the page.
 */
export function featuredCount(total: number): 0 | 2 | 3 {
  if (total >= 12) return 3;
  if (total >= 5) return 2;
  return 0;
}

/**
 * THE ENTRY ORDER — flagships first, then catalogue order.
 *
 * A flagship is an owner decision already public across the site (its world,
 * its homepage section), so leading with one asserts nothing new. Everything
 * after it keeps the registry's own sequence. The sort is stable, so two
 * flagships in one area keep their catalogue order relative to each other.
 *
 * The masthead's "way in" line and the featured section read this same order,
 * so the names a reader sees in the masthead are the compounds that lead the
 * section below it — never a second, disagreeing list.
 */
export function entryOrder<T extends AreaSubject>(items: readonly T[]): T[] {
  return items
    .map((item, position) => ({ item, position }))
    .sort(
      (a, b) =>
        Number(b.item.world !== null) - Number(a.item.world !== null) || a.position - b.position,
    )
    .map(({ item }) => item);
}

/** The featured entry compounds for an area of these products. */
export function featuredInArea<T extends AreaSubject>(items: readonly T[]): T[] {
  return entryOrder(items).slice(0, featuredCount(items.length));
}

export interface RelatedArea<T extends AreaSubject = AreaSubject> {
  area: DiscoveryArea;
  /** Products of THIS area that are also filed under the related one. */
  shared: readonly T[];
}

/**
 * RELATED AREAS — by shared compounds, never by hand.
 *
 * Two areas are related exactly when at least one published compound is filed
 * under both, and ranked by how many. Ties fall back to area order so the
 * ranking is deterministic. An area sharing nothing is not listed, and there is
 * no curated "you may also like" relation anywhere to override this.
 */
export function relatedAreas(
  areaId: DiscoveryAreaId,
  limit = 4,
  deps: {
    areas: () => readonly DiscoveryArea[];
    productsIn: (id: DiscoveryAreaId) => readonly AreaSubject[];
  } = { areas: publicAreas, productsIn: productsInArea },
): RelatedArea[] {
  const own = deps.productsIn(areaId);
  return deps
    .areas()
    .filter((other) => other.id !== areaId)
    .map((other) => ({
      area: other,
      shared: own.filter((p) => deps.productsIn(other.id).some((q) => q.slug === p.slug)),
    }))
    .filter((entry) => entry.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || a.area.order - b.area.order)
    .slice(0, limit);
}

export interface ContinuePlan {
  /** The next public area in area order that is neither this one nor already related. */
  nextArea: DiscoveryArea | null;
  /** The research materials area, offered from every other area. */
  materials: DiscoveryArea | null;
}

/**
 * WHERE THE PAGE SENDS A READER NEXT.
 *
 * The page always offers the full catalogue and the Research Hub; these are the
 * two destinations that depend on the area:
 *
 *   nextArea   the following public area, wrapping, skipping any already shown
 *              in related areas — so the end of the page never repeats a link
 *              the reader passed thirty seconds earlier. Null when every other
 *              area is already related.
 *   materials  the materials area, from every area except itself. Consumables
 *              are the one adjacency that holds for every compound area; it is
 *              listed as a destination, never as an instruction.
 */
export function continuePlan(
  areaId: DiscoveryAreaId,
  relatedIds: readonly DiscoveryAreaId[],
  areas: readonly DiscoveryArea[] = publicAreas(),
): ContinuePlan {
  const ordered = [...areas].sort((a, b) => a.order - b.order);
  const at = ordered.findIndex((a) => a.id === areaId);
  const skip = new Set<DiscoveryAreaId>([areaId, ...relatedIds, "materials"]);
  let nextArea: DiscoveryArea | null = null;
  for (let step = 1; at >= 0 && step < ordered.length; step += 1) {
    const candidate = ordered[(at + step) % ordered.length];
    if (!skip.has(candidate.id)) {
      nextArea = candidate;
      break;
    }
  }
  const materials =
    areaId === "materials" ? null : (ordered.find((a) => a.id === "materials") ?? null);
  return { nextArea, materials };
}
