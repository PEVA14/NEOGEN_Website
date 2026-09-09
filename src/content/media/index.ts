import type { WorldId } from "@/config/worlds";
import { products } from "@/data/catalog";

import { MEDIA } from "./registry";

import type { ProductImage, ProductMedia } from "./types";

export type { ProductImage, ProductMedia } from "./types";
export { MEDIA } from "./registry";

/** The shape a product with no declared assets resolves to. */
const NONE: ProductMedia = {
  primary: null,
  alternates: [],
  detail: null,
  packaging: null,
  poster: null,
  model: null,
};

/**
 * THE ONE MEDIA LOOKUP.
 *
 * Every surface that shows a product — the catalogue card, the flagship stage,
 * the generic plate, the social card — resolves through this and nothing else.
 * Before this existed the card read a world-keyed registry, the stage read a
 * path off `config/worlds`, and the social card had no product media at all:
 * three conventions for one question.
 *
 * Always returns a complete `ProductMedia`, so callers branch on the FIELD
 * they need rather than on whether the product has an entry.
 */
export function productMedia(slug: string): ProductMedia {
  const declared = MEDIA[slug];
  return declared ? { ...NONE, ...declared } : NONE;
}

/**
 * What a still frame should draw for this product.
 *
 * The card and the generic plate ask exactly this question, and they must
 * answer it identically — a catalogue that shows a photograph next to a
 * product page that shows a diagram is the inconsistency this phase exists to
 * prevent.
 *
 * `diagram` is a deliberate, visibly non-photographic fallback. It is never
 * promoted to a social card: a technical drawing shared as product imagery
 * reads as a real product shot once it leaves the page that framed it.
 */
export type StillMedia =
  { kind: "image"; image: ProductImage } | { kind: "diagram"; reason: "no-photography" };

export function stillMedia(slug: string): StillMedia {
  const image = productMedia(slug).primary;
  return image ? { kind: "image", image } : { kind: "diagram", reason: "no-photography" };
}

/**
 * The media of the product a world depicts.
 *
 * The homepage's Experience sections are built around a world rather than
 * around a slug, but the asset they need still belongs to a product. Resolved
 * through the catalogue registry rather than a second world-to-slug table, so
 * there is nothing to keep in sync: a world with no product, or a product that
 * loses its world, resolves to no media instead of to a stale path.
 */
export function mediaForWorld(world: WorldId): ProductMedia {
  const product = products.find((item) => item.world === world);
  return product ? productMedia(product.slug) : NONE;
}

/**
 * `sizes` for the catalogue and homepage card grid.
 *
 * The grid is one column below 48rem and three inside a 90rem container above
 * it, so above the container's own max width the card stops growing and a
 * `33vw` hint over-fetches on a wide display. Stated once, here, because a
 * wrong `sizes` is invisible until someone looks at a network panel.
 */
export const CARD_SIZES = "(min-width: 90rem) 28rem, (min-width: 48rem) 33vw, 100vw";

/**
 * `sizes` for the product page plate, which is capped at 34rem and is one of
 * two columns above 64rem.
 */
export const PLATE_SIZES = "(min-width: 64rem) 34rem, 100vw";
