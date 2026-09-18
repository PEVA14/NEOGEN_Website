import type { AtlasEvidenceRef, AtlasSubject } from "./types";
import type { ResearchFunctionId } from "@/content/functions";
import type { Availability } from "@/data/commerce";
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
  /** Owner-maintained stock state of a variant, or null when not determined. */
  availability: (variantId: string) => Availability | null;
  areas: (slug: string) => readonly DiscoveryAreaId[];
  /** Publicly tagged research functions — `publicFunctions` on the server. */
  functions: (slug: string) => readonly ResearchFunctionId[];
  documented: (product: Product) => boolean;
  references: (slug: string) => readonly string[];
  /** Approved statements by id — `publicStatementRefs` on the server. */
  evidence: (slug: string) => readonly AtlasEvidenceRef[];
}

export function atlasSubjectsFrom(
  products: readonly Product[],
  deps: AtlasSubjectDeps,
): AtlasSubject[] {
  return products.map((product, order) => {
    const variants = product.variants.map((variant) => ({
      id: variant.id,
      price: deps.price(variant.id),
      availability: deps.availability(variant.id),
    }));
    const amounts = variants
      .map((variant) => variant.price)
      .filter((amount): amount is number => amount !== null);

    return {
      slug: product.slug,
      name: product.name,
      world: product.world,
      areas: deps.areas(product.slug),
      functions: deps.functions(product.slug),
      forms: [...new Set(product.variants.map((variant) => variant.strength.kind))],
      presentations: product.variants.length,
      variants,
      entryPrice: amounts.length > 0 ? Math.min(...amounts) : null,
      documented: deps.documented(product),
      referenceIds: deps.references(product.slug),
      evidence: deps.evidence(product.slug),
      order,
    };
  });
}
