import type { AtlasSubject } from "./types";
import type { Product } from "@/data/catalog";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * Registry products → retrieval subjects. Pure: every registry lookup arrives
 * as a dependency, so the server builds subjects from the live registries and
 * `check:atlas` builds them the same way — one code path, tested as it runs.
 */
export interface AtlasSubjectDeps {
  /** Price of a variant in MXN, or null when it has none. */
  price: (variantId: string) => number | null;
  areas: (slug: string) => readonly DiscoveryAreaId[];
  documented: (product: Product) => boolean;
  references: (slug: string) => readonly string[];
}

export function atlasSubjectsFrom(
  products: readonly Product[],
  deps: AtlasSubjectDeps,
): AtlasSubject[] {
  return products.map((product, order) => {
    const amounts = product.variants
      .map((variant) => deps.price(variant.id))
      .filter((amount): amount is number => amount !== null);

    return {
      slug: product.slug,
      name: product.name,
      world: product.world,
      areas: deps.areas(product.slug),
      forms: [...new Set(product.variants.map((variant) => variant.strength.kind))],
      presentations: product.variants.length,
      entryPrice: amounts.length > 0 ? Math.min(...amounts) : null,
      documented: deps.documented(product),
      referenceIds: deps.references(product.slug),
      order,
    };
  });
}
