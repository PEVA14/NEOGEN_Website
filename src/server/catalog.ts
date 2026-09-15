import "server-only";

import { stillMedia } from "@/content/media";
import { formatStrength, presentationRange, productType, type Product } from "@/data/catalog";
import { formatPrice, getAvailability, getPrices } from "@/data/commerce";
import { publicAreasFor } from "@/data/discovery";
import { resolveEvidence, type QualityRegistries } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { routes } from "@/config/routes";

import type { AvailabilityValue, CatalogProduct, StrengthKind } from "@/components/catalog/filters";
import type { Dictionary } from "@/i18n/types";

/**
 * THE CATALOGUE ENTRIES — one builder for every browser on the site.
 *
 * The catalogue page and every area page hand the same shape to the same
 * client browser, so they build it here, once. Every field is read from a
 * registry or a resolver on the server: prices and availability from commerce,
 * areas from the approved assignments, `documented` from the evidence resolver,
 * `photographed` from the media layer. The browser receives facts, never
 * the registries themselves, which is what keeps them out of the bundle.
 *
 * `primaryArea` lets an area page tone every plate in its own area.
 */
export async function catalogEntries(
  items: readonly Product[],
  {
    locale,
    dict,
    primaryArea,
    registries,
  }: {
    locale: Locale;
    dict: Dictionary;
    primaryArea?: string;
    /** Evidence registries — real by default, injectable for the design preview. */
    registries?: QualityRegistries;
  },
): Promise<CatalogProduct[]> {
  const variantIds = items.flatMap((p) => p.variants.map((v) => v.id));
  const [prices, availability] = await Promise.all([
    getPrices(variantIds),
    getAvailability(variantIds),
  ]);
  const tag = localeTags[locale];

  return items.map((product, position) => {
    const cheapest =
      product.variants
        .map((v) => prices.get(v.id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .sort((a, b) => a.amount - b.amount)[0] ?? null;
    const areas = publicAreasFor(product.slug).map((a) => a.id);
    const evidence = resolveEvidence(product, registries);

    return {
      id: product.id,
      index: String(position + 1).padStart(2, "0"),
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      category: product.category,
      categoryLabel: dict.products.catalog.categoryLabels[product.category] ?? product.category,
      productType: productType(product),
      areas,
      areaId: primaryArea ?? areas[0] ?? null,
      world: product.world,
      worldLabel: product.world ? dict.home.products.worldLabels[product.world] : undefined,
      href: localizePath(routes.product(product.slug), locale),
      price: cheapest ? formatPrice(cheapest, tag) : null,
      priceAmount: cheapest?.amount ?? null,
      strengths: product.variants.map((v) => formatStrength(v.strength)).join(" · "),
      range: presentationRange(product),
      presentations: product.variants.length,
      formats: [...new Set(product.variants.map((v) => v.strength.kind as StrengthKind))],
      vials: [
        ...new Set(product.variants.map((v) => v.vials).filter((n): n is number => n !== null)),
      ],
      availability: [
        ...new Set(
          product.variants
            .map((v) => availability.get(v.id))
            .filter((a): a is AvailabilityValue => Boolean(a)),
        ),
      ],
      documented: evidence.hasEvidence,
      photographed: stillMedia(product.slug).kind === "image",
      ctaLabel: dict.home.products.cta,
    };
  });
}

/** The browser's copy, assembled from the dictionary in one place. */
export function catalogCopy(dict: Dictionary) {
  return {
    ...dict.products.catalog,
    areaLabels: Object.fromEntries(
      Object.entries(dict.discovery.areas).map(([id, area]) => [id, area.short]),
    ),
    typeLabels: dict.productTypes,
    availabilityLabels: dict.commerce.availability,
  };
}
