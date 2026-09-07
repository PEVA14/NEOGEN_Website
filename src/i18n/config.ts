/**
 * NEOGEN — Localization configuration
 *
 * Approach: zero i18n dependencies.
 *
 * A `[locale]` route segment plus typed dictionary modules covers everything
 * the MVP needs (default Spanish, second locale, switcher, locale-independent
 * components). `Intl.NumberFormat` / `Intl.DateTimeFormat` are built into the
 * platform and handle MXN and dates.
 *
 * A library (next-intl) would earn its place at ICU message formatting, plural
 * rules and many namespaces. If that day comes, `getDictionary()` is the only
 * seam that has to change.
 */

export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

/** Mexico is the initial market — Spanish is the default experience. */
export const defaultLocale: Locale = "es";

/** BCP 47 tags for `<html lang>`, `Intl.*` and hreflang. */
export const localeTags: Record<Locale, string> = {
  es: "es-MX",
  en: "en-US",
};

/** Endonyms — a language is always named in its own language. */
export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}
