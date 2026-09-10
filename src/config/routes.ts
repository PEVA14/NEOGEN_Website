import type { CheckoutStepId } from "@/domain/checkout/types";

/**
 * URL segment per checkout step — Spanish, matching every other route segment.
 *
 * Declared here rather than in the domain so that paths live in one file: the
 * domain owns the ORDER of the steps, this owns what they are called in a URL.
 */
export const checkoutSegments: Record<CheckoutStepId, string> = {
  contact: "contacto",
  shipping: "envio",
  delivery: "entrega",
  payment: "pago",
  review: "revision",
  confirmation: "confirmacion",
};

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
  /**
   * A discovery area's listing.
   *
   * Under /productos rather than at the root, because an area is a VIEW of the
   * catalogue and not a separate section — which also keeps the breadcrumb
   * honest and leaves one place that owns product URLs.
   */
  area: (slug: string) => `/productos/area/${slug}`,
  research: "/investigacion",
  article: (slug: string) => `/investigacion/${slug}`,
  cart: "/carrito",
  checkout: "/checkout",
  /**
   * One route per checkout step.
   *
   * A ROUTE, not client-side step state, and that is the load-bearing choice
   * of Phase 10. Each step is a server component rendering a plain form whose
   * action validates on the server, so the whole checkout works with no
   * client JavaScript at all: browser back and forward behave, a step can be
   * linked and reloaded, and the validation a customer meets is the same code
   * that decides whether an order may be created. A single page holding step
   * state in the client would have needed a second, weaker copy of every rule.
   */
  checkoutStep: (step: CheckoutStepId) => `/checkout/${checkoutSegments[step]}`,
  /** The confirmation for one order. Not indexable, not guessable-by-sequence. */
  orderConfirmation: (orderId: string) => `/checkout/confirmacion/${orderId}`,
  /**
   * A policy document.
   *
   * The route exists; the documents do not. `publicPolicyBySlug` returns
   * nothing for an unapproved policy, so every one of these 404s today — see
   * `content/policies.ts` for why an empty policy page is worse than none.
   */
  policy: (slug: string) => `/politicas/${slug}`,
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
