import { AVAILABILITY } from "./availability";
import { generatedPrices } from "./prices.generated";

import type { Availability, Money, VariantCommerce } from "./types";

export type { Availability, Money, VariantCommerce } from "./types";
/* Re-exported so server code has one import; client islands should import
   `@/data/commerce/format` directly to avoid pulling the price map. */
export { formatPrice } from "./format";
export { ORDER_LIMITS } from "./limits";

/**
 * THE COMMERCE BOUNDARY.
 *
 * Every read of a price or a stock state goes through here. That is the entire
 * point: today the answers come from a generated file in this repository,
 * because there is no backend. When there is one — a database, a CMS, an
 * inventory feed — only this module changes, and no page, component or route
 * has to know it happened.
 *
 * The accessors are async for the same reason. They resolve immediately now,
 * but callers that already `await` will not need rewriting when the answer
 * starts coming over a network.
 */

export async function getVariantCommerce(variantId: string): Promise<VariantCommerce> {
  return {
    price: generatedPrices[variantId] ?? null,
    availability: AVAILABILITY[variantId] ?? null,
  };
}

export async function getPrices(variantIds: readonly string[]): Promise<Map<string, Money | null>> {
  return new Map(variantIds.map((id) => [id, generatedPrices[id] ?? null]));
}

/**
 * Stock state per variant, batched alongside `getPrices`.
 *
 * A separate call rather than a widened `getPrices` return: price and
 * availability change on completely different cadences — one is authored once,
 * the other whenever the supplier situation moves — and callers that only need
 * a "from" price should not be made to think about stock.
 */
export async function getAvailability(
  variantIds: readonly string[],
): Promise<Map<string, Availability | null>> {
  return new Map(variantIds.map((id) => [id, AVAILABILITY[id] ?? null]));
}
