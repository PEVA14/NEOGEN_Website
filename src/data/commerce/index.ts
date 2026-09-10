import { AVAILABILITY } from "./availability";
import { generatedPrices } from "./prices.generated";

import type { Availability, Money, VariantCommerce } from "./types";

export type { Availability, Money, VariantCommerce } from "./types";

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

/**
 * ORDER LIMITS.
 *
 * Owner-set: no minimum beyond one pack, and a ceiling of 99 — a provisional
 * cap rather than a stock statement, since there is no stock figure to cap
 * against. Stated here so the quantity control, the bag and any future
 * server-side validation read one number instead of three.
 */
export const ORDER_LIMITS = { min: 1, max: 99 } as const;

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

/**
 * Formats for display. MXN is quoted in whole pesos across this catalogue.
 *
 * Takes a full BCP-47 tag, not a bare language. `Intl` renders MXN as
 * "6500 MXN" for "es" and "$6,500" for "es-MX" — and a Mexican store wants the
 * Mexican convention.
 */
export function formatPrice(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amount);
}
