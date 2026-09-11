import { MEDIA } from "./registry";

import type { ProductImage, ProductMedia } from "./types";

export type { ProductImage, ProductMedia } from "./types";
export { MEDIA } from "./registry";

/**
 * The shape a product with no declared assets resolves to.
 *
 * THIS MODULE MUST NOT IMPORT `@/data/catalog`. Client components resolve
 * media through it — the product card most of all — and pulling the registry
 * in shipped all 85 products and 147 variants to the browser. The one
 * resolver that genuinely needs the catalogue (`mediaForWorld`) lives in
 * `./forWorld`, which only server code imports.
 */
export const NO_MEDIA: ProductMedia = {
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
  return declared ? { ...NO_MEDIA, ...declared } : NO_MEDIA;
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

/**
 * WHAT A FLAGSHIP STAGE SHOWS WHILE NO LIVE MODEL IS RUNNING.
 *
 * Two different questions share one frame, and they must not be confused:
 *
 *   with a MODEL  — the still is the model's own rendered `poster`, because it
 *                   stands in for that exact scene while the GLB loads.
 *   without one   — the still is the product's `primary` photograph. A render
 *                   of a scene that does not exist is not a substitute.
 *
 * So GLOW gaining a photograph lights up its stage with no layout change, and
 * RETA never shows a photograph in the frame its 3D object is about to occupy.
 */
export function resolveStageStill(media: ProductMedia): ProductImage | null {
  return media.model ? media.poster : (media.primary ?? media.poster);
}

/**
 * The supplementary images, in display order: alternates, then detail, then
 * packaging. Empty for every product today, and the strip that renders them
 * then renders nothing.
 */
export function galleryImages(
  media: ProductMedia,
): readonly { role: "alternate" | "detail" | "packaging"; image: ProductImage }[] {
  return [
    ...media.alternates.map((image) => ({ role: "alternate" as const, image })),
    ...(media.detail ? [{ role: "detail" as const, image: media.detail }] : []),
    ...(media.packaging ? [{ role: "packaging" as const, image: media.packaging }] : []),
  ];
}
