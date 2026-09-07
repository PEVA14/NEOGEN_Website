import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Locale-aware path helpers.
 *
 * Every locale is prefixed (`/es/...`, `/en/...`) rather than leaving Spanish
 * unprefixed. That keeps one route tree, makes hreflang unambiguous, and
 * avoids a whole class of "which locale am I actually on" bugs.
 */

/** Prefixes an app-relative path with a locale: `("/productos", "en") -> "/en/productos"`. */
export function localizePath(path: string, locale: Locale): string {
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

/** Splits `/en/productos` into its locale and the remaining path. */
export function splitLocaleFromPath(pathname: string): {
  locale: Locale;
  path: string;
} {
  const [, maybeLocale, ...rest] = pathname.split("/");

  if (isLocale(maybeLocale)) {
    return { locale: maybeLocale, path: `/${rest.join("/")}` };
  }

  return { locale: defaultLocale, path: pathname };
}

/** Rewrites the current pathname to another locale, preserving the page. */
export function switchLocalePath(pathname: string, nextLocale: Locale): string {
  const { path } = splitLocaleFromPath(pathname);
  return localizePath(path, nextLocale);
}
