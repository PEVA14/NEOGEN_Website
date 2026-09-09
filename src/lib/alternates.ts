import { locales, localeTags, type Locale } from "@/i18n/config";
import { siteConfig } from "@/config/site";
import { localizePath } from "@/i18n/routing";

import type { Metadata } from "next";

/**
 * Canonical and hreflang for ONE page.
 *
 * WHY THIS IS NOT IN THE LAYOUT.
 * ------------------------------
 * Next merges layout metadata into every page beneath it, so a single
 * `alternates.canonical` on the locale layout is inherited by the catalogue,
 * the bag, the research hub and every product page alike — each one declaring
 * itself a duplicate of the locale home. Search engines take that at its word
 * and collapse the site to one indexed URL.
 *
 * So alternates are declared per page, from the route they actually live at.
 * A page that forgets to call this gets NO canonical, which is merely a missed
 * hint; a page that inherits the wrong one is actively told to deindex itself.
 *
 * `path` is the unlocalised route from `config/routes` — this localises it.
 */
export function alternates(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localizePath(path, locale),
    languages: {
      ...Object.fromEntries(locales.map((l) => [localeTags[l], localizePath(path, l)])),
      // x-default points at the same page in the default locale, not at the
      // site root — it answers "which version for an unmatched language", not
      // "where does this site start".
      "x-default": localizePath(path, siteConfig.defaultLocale),
    },
  };
}
