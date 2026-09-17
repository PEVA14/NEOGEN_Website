import "server-only";

import { referencesForProduct } from "@/content/research";
import { publishedProducts } from "@/data/catalog";
import { getAvailability, getPrices } from "@/data/commerce";
import { publicAreasFor } from "@/data/discovery";
import { atlasSubjectsFrom, type AtlasSubject } from "@/domain/atlas";
import { publicEvidenceIndex } from "@/domain/quality";

/**
 * EVERY PUBLISHED COMPOUND, AS FACTS RETRIEVAL CAN SCORE.
 *
 * One pass over the existing registries — no new product, price, evidence or
 * reference store. Prices come from the commerce layer, areas from the approved
 * assignments, documentation from the evidence resolver, references from the
 * research index (already filtered to public records). The mapping itself is
 * the pure `atlasSubjectsFrom`, which `check:atlas` runs against the same
 * registries.
 */
export async function atlasSubjects(): Promise<readonly AtlasSubject[]> {
  const variantIds = publishedProducts.flatMap((p) => p.variants.map((v) => v.id));
  const [prices, availability] = await Promise.all([
    getPrices(variantIds),
    getAvailability(variantIds),
  ]);

  return atlasSubjectsFrom(publishedProducts, {
    price: (variantId) => prices.get(variantId)?.amount ?? null,
    availability: (variantId) => availability.get(variantId) ?? null,
    areas: (slug) => publicAreasFor(slug).map((area) => area.id),
    documented: (product) => publicEvidenceIndex([product]).length > 0,
    references: (slug) => referencesForProduct(slug).map((reference) => reference.id),
  });
}
