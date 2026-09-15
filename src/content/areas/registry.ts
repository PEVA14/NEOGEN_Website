import type { AreaOverview } from "./types";
import type { DiscoveryAreaId } from "@/data/discovery/types";

/**
 * AREA OVERVIEWS — keyed by area, and empty.
 *
 * No area context has been written against sources, so none exists, and the
 * area page omits its context section rather than filling it with generic
 * copy about metabolism or recovery. Writing one follows the product overview
 * rule: every statement in `themes` and `pathways` needs reference ids that
 * already exist in `content/references` and are approved there.
 */
export const AREA_OVERVIEWS: Readonly<Partial<Record<DiscoveryAreaId, AreaOverview>>> = {};
