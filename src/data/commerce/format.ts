import type { Money } from "./types";

/**
 * MONEY FORMATTING — deliberately in its own module.
 *
 * Client islands need this (the bag and the commerce block both render
 * prices), and importing it from `./index` would drag `prices.generated.ts`
 * — the whole 147-variant price map — into the browser bundle along with it.
 *
 * It is also why the formatter cannot simply be passed down as a prop:
 * functions do not cross the server/client boundary. Both sides import this
 * instead, and the only thing that travels is a locale tag.
 *
 * Takes a full BCP-47 tag, not a bare language. `Intl` renders MXN as
 * "6500 MXN" for "es" and "$6,500" for "es-MX" — a Mexican store wants the
 * Mexican convention.
 */
export function formatPrice(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: 0,
  }).format(money.amount);
}
