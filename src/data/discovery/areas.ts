import type { DiscoveryArea, DiscoveryAreaId } from "./types";

/**
 * THE EIGHT AREAS — initial draft structure, approved as a starting point.
 *
 * Renaming one is a dictionary change. Merging two is a change here plus a
 * find-and-replace in `assignments.ts`. Splitting one is the same in reverse.
 * No component reads an area id literally, so none of those three operations
 * touches a page.
 */
export const AREAS: readonly DiscoveryArea[] = [
  { id: "metabolic", order: 1, slug: "metabolica" },
  { id: "recovery", order: 2, slug: "recuperacion" },
  { id: "longevity", order: 3, slug: "longevidad" },
  { id: "growth", order: 4, slug: "desarrollo" },
  { id: "skin", order: 5, slug: "piel" },
  { id: "neuro", order: 6, slug: "neuro" },
  { id: "hormonal", order: 7, slug: "hormonal" },
  { id: "materials", order: 8, slug: "materiales" },
];

export const areaIds: readonly DiscoveryAreaId[] = AREAS.map((a) => a.id);

export function getArea(id: DiscoveryAreaId): DiscoveryArea {
  const area = AREAS.find((a) => a.id === id);
  if (!area) throw new Error(`Unknown discovery area: ${id}`);
  return area;
}

export function areaBySlug(slug: string): DiscoveryArea | undefined {
  return AREAS.find((a) => a.slug === slug);
}
