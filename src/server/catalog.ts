import "server-only";

import { stillMedia } from "@/content/media";
import { OVERVIEWS, publicCopy, type ProductOverview } from "@/content/overview";
import { formatStrength, presentationRange, productType, type Product } from "@/data/catalog";
import { formatPrice, getAvailability, getPrices, type Money } from "@/data/commerce";
import { publicAreasFor } from "@/data/discovery";
import { resolveEvidence, type QualityRegistries } from "@/domain/quality";
import { perVial } from "@/domain/storefront";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { routes } from "@/config/routes";

import type { AvailabilityValue, CatalogProduct, StrengthKind } from "@/components/catalog/filters";
import type { CardDetails, CardDetailsCopy } from "@/components/ui/ProductCard";
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
    overviews,
  }: {
    locale: Locale;
    dict: Dictionary;
    primaryArea?: string;
    /** Evidence registries — real by default, injectable for the design preview. */
    registries?: QualityRegistries;
    /** Product overviews — real by default, injectable for the design preview. */
    overviews?: Readonly<Record<string, ProductOverview>>;
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
      details: cardDetails(product, { locale, dict, prices, overviews }),
    };
  });
}

/**
 * WHAT A CARD REVEALS — every line a fact the registries already hold.
 *
 * In priority order, and the card shows what exists:
 *
 *   1. an approved SUMMARY from the product overview. None exist today; the
 *      day one is approved it appears on every card that product has,
 *      without touching a component. `publicCopy` refuses scientific-class
 *      copy, unapproved copy and forbidden vocabulary, so the reveal cannot
 *      become a claims surface.
 *   2. the COMPOSITION, verbatim — only where the source printed one, and
 *      only when there is no summary to carry the card.
 *   3. the full PRESENTATION LADDER with each pack's price. The card face can
 *      only hold "5 mg – 60 mg · from $6,500"; the reveal shows all seven.
 *   4. the PACK and the PRICE PER VIAL of the cheapest pack — arithmetic on
 *      the price list, the unit price any shop shows beside a multipack.
 *   5. the product TYPE and every public AREA it is filed under.
 *
 * Prices are formatted here, on the server, so the client never needs the
 * price map.
 */
export function cardDetails(
  product: Product,
  {
    locale,
    dict,
    prices,
    overviews = OVERVIEWS,
  }: {
    locale: Locale;
    dict: Dictionary;
    prices: ReadonlyMap<string, Money | null>;
    overviews?: Readonly<Record<string, ProductOverview>>;
  },
): CardDetails {
  const tag = localeTags[locale];
  const card = dict.products.card;
  const priced = product.variants
    .map((variant) => ({ variant, price: prices.get(variant.id) ?? null }))
    .filter((row): row is { variant: typeof row.variant; price: Money } => row.price !== null)
    .sort((a, b) => a.price.amount - b.price.amount);
  const cheapest = priced[0] ?? null;
  const unit = cheapest ? perVial(cheapest.price.amount, cheapest.variant.vials) : null;
  const packs = [
    ...new Set(product.variants.map((v) => v.vials).filter((n): n is number => n !== null)),
  ];
  const summary = publicCopy(overviews[product.slug]?.summary ?? null, locale);

  return {
    summary,
    composition: summary ? null : product.composition,
    ladder: product.variants.map((variant) => {
      const price = prices.get(variant.id) ?? null;
      return {
        label: formatStrength(variant.strength),
        price: price ? formatPrice(price, tag) : null,
      };
    }),
    pack: packs.length ? card.pack.replace("{n}", packs.join(" / ")) : null,
    perVial:
      unit !== null
        ? card.perVial.replace("{price}", formatPrice({ amount: unit, currency: "MXN" }, tag))
        : null,
    type: dict.productTypes[productType(product)] ?? null,
    areas: publicAreasFor(product.slug).map((area) => dict.discovery.areas[area.id].short),
  };
}

/** The reveal's labels, once per browser rather than once per card. `{name}` is filled by the card. */
export function cardDetailsCopy(dict: Dictionary): CardDetailsCopy {
  const card = dict.products.card;
  return {
    open: card.open,
    close: card.close,
    presentations: card.presentations,
    composition: card.composition,
  };
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
    card: cardDetailsCopy(dict),
  };
}
