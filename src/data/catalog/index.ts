import { generatedProducts } from "./generated";

import type { CategoryId, Product, Strength } from "./types";

export type { CategoryId, Product, ProductVariant, Strength } from "./types";
export {
  CONFIRMED_TYPE,
  derivedType,
  productType,
  productTypes,
  type ProductType,
} from "./productType";

/**
 * THE CATALOG REGISTRY — the source of truth for what NEOGEN sells.
 *
 * Note what this is NOT: `config/worlds.ts`. A world is a 3D environment and an
 * art direction, and exactly three products have one. Organising a catalogue of
 * 86 products around a concept 83 of them lack would put the tail in a
 * permanent special case.
 */
export const products: readonly Product[] = generatedProducts;

/**
 * The supplier-oriented buckets the catalogue was imported with.
 *
 * PRESERVED, not replaced. `ProductType` (factual) and `DiscoveryArea`
 * (merchandising) are the two axes going forward, but this one still drives
 * the catalogue filter and the register, and removing it in the same change
 * that adds the other two would leave the migration unverifiable.
 */
export const categories: readonly CategoryId[] = ["metabolic", "peptides", "blends", "solvents"];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsInCategory(category: CategoryId): readonly Product[] {
  return products.filter((p) => p.category === category);
}

/**
 * Whether a product gets a page.
 *
 * DERIVED, never a hand-set flag. A product is publishable when it has at least
 * one variant with a stated presentation — that is the minimum needed to say
 * what the thing actually is. Price is deliberately not part of this test:
 * publishable and purchasable are different questions, and a product page that
 * presents a compound honestly without a price is better than a 404.
 */
export function isPublishable(product: Product): boolean {
  return product.variants.some((v) => v.vials !== null);
}

export const publishedProducts: readonly Product[] = products.filter(isPublishable);

/**
 * The dose ladder as one line — "5 mg – 60 mg", or a single value.
 *
 * A COMMERCIAL fact, and one of the strongest reasons to open a product: a
 * name alone says nothing about whether the range covers what a reader needs.
 * Collapsed to first and last because a card cannot carry seven values, and
 * only where every variant shares a unit — across units a range is
 * meaningless, so the values are listed instead.
 */
export function presentationRange(product: Product): string {
  const labels = product.variants.map((v) => formatStrength(v.strength));
  if (labels.length === 1) return labels[0];

  const kinds = new Set(product.variants.map((v) => v.strength.kind));
  if (kinds.size > 1) return labels.slice(0, 2).join(" · ") + (labels.length > 2 ? " …" : "");

  return `${labels[0]} – ${labels[labels.length - 1]}`;
}

/** Human-readable dose, in the unit the source actually stated. */
export function formatStrength(strength: Strength): string {
  switch (strength.kind) {
    case "solid":
      return `${strength.mg} mg`;
    case "solution":
      return `${strength.mg} mg / ${strength.ml} ml`;
    case "volume":
      return `${strength.ml} ml`;
    case "iu":
      return `${strength.iu} IU`;
    case "blend":
      return strength.componentsMg.map((mg) => `${mg} mg`).join(" + ");
  }
}
