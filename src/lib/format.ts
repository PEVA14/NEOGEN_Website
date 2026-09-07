import { localeTags, type Locale } from "@/i18n/config";
import type { Money } from "@/types/product";

/**
 * Locale-aware formatting via the platform `Intl` API — no dependency.
 *
 * These helpers format values that ALREADY EXIST. They never invent one, and
 * never produce a fallback number for missing data: unverified values are
 * handled by `Verifiable<T>` and the neutral status pattern instead.
 */

/** Formats minor-unit currency. Callers must have a `verified` price. */
export function formatMoney(money: Money, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency: money.currency,
  }).format(money.amount / 100);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeTags[locale], options).format(value);
}

/** Formats an ISO 8601 date string for editorial/research surfaces. */
export function formatDate(
  isoDate: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(localeTags[locale], options).format(new Date(isoDate));
}
