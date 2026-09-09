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
 * Stock is unknown for every variant: there is no inventory system to ask.
 * Kept as a single named constant so the day one exists, this is the one line
 * that changes — rather than a `null` sprinkled through the codebase.
 */
const AVAILABILITY_UNKNOWN: Availability | null = null;

export async function getVariantCommerce(variantId: string): Promise<VariantCommerce> {
  return {
    price: generatedPrices[variantId] ?? null,
    availability: AVAILABILITY_UNKNOWN,
  };
}

export async function getPrices(variantIds: readonly string[]): Promise<Map<string, Money | null>> {
  return new Map(variantIds.map((id) => [id, generatedPrices[id] ?? null]));
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
