/**
 * Single source of truth for route paths.
 *
 * Paths here are LOCALE-FREE. Use `localizePath(path, locale)` from
 * `@/i18n/routing` at the point of use. Route segment folder names are Spanish
 * because Mexico is the initial market; the English locale serves the same
 * segments under `/en`.
 *
 * TODO(phase-later): decide whether English should use translated segments
 * (`/en/products`). That requires a segment-mapping table and is deliberately
 * deferred — it is additive, not a rewrite.
 */
export const routes = {
  home: "/",
  products: "/productos",
  product: (slug: string) => `/productos/${slug}`,
  research: "/investigacion",
  article: (slug: string) => `/investigacion/${slug}`,
  cart: "/carrito",
  checkout: "/checkout",
  /**
   * PREPARED, NOT BUILT. The reference navigation is
   * `NEOGEN | Products | NEOGEN Research | About NEOGEN | [ BAG: N ]`.
   * The path is declared here so nav and routing are ready for it, but the
   * page is out of scope for Phase 3 — so it is deliberately NOT in
   * `primaryNav` yet. Adding it there before the route exists would ship a
   * link straight to a 404.
   * TODO(phase-later): build /nosotros and move this into primaryNav.
   */
  about: "/nosotros",
} as const;

/** Keys into `Dictionary["nav"]`, so navigation carries no hard-coded copy. */
export const primaryNav = [
  { key: "products", href: routes.products },
  { key: "research", href: routes.research },
] as const;

/** Reference nav order, including routes not yet built. Documentation only. */
export const plannedNav = ["products", "research", "about"] as const;

export type NavKey = (typeof primaryNav)[number]["key"];
