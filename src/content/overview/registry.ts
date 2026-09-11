import type { ProductOverview } from "./types";

/**
 * PRODUCT OVERVIEWS — keyed by slug, and empty.
 *
 * No overview has been written against sources, so none exists. The product
 * page does not fill the gap with generic scientific copy; it renders the
 * verified product record it already has and omits the overview section.
 *
 * Writing one: every statement in `researchContext`, `areasOfInvestigation`
 * and `mechanismNotes` needs reference ids that exist in
 * `content/references` and are approved there first.
 */
export const OVERVIEWS: Readonly<Record<string, ProductOverview>> = {};
