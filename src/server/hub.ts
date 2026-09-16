import "server-only";

import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import { isPublishable, products, publishedProducts, type Product } from "@/data/catalog";
import { formatPrice, getPrices, type Money } from "@/data/commerce";
import { productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

import type { DiscoveryAreaId } from "@/data/discovery";
import type { Dictionary } from "@/i18n/types";

/**
 * THE HUB'S DATA — what the homepage gateway can honestly offer.
 *
 * Every figure is counted from a registry and every destination is a route
 * that renders today. The two that do not always render are handled here
 * rather than in the component:
 *
 *   - the documentation explorer 404s in production until a public document
 *     resolves, so its link is `null` until `publicEvidenceIndex` is non-empty
 *     — the same gate the Research Hub itself uses;
 *   - an area only appears once it has approved products (`publicAreas`).
 *
 * Nothing here is curated: areas come in registry order, the worlds are the
 * three products that have one, and the catalogue's four preview plates are
 * the cheapest compound in each of the first four areas — the same
 * entry-point rule the discovery panels use.
 */

export type HubId = "catalog" | "areas" | "worlds" | "research" | "quality";

export interface HubItem {
  label: string;
  /** A price, a count — never a claim. */
  meta: string | null;
  href: string | null;
  slug: string | null;
  areaId: DiscoveryAreaId | null;
  world: WorldId | null;
}

export interface HubData {
  counts: {
    products: number;
    presentations: number;
    areas: number;
    worlds: number;
  };
  /** Four compounds, one per area, cheapest first — the catalogue's preview. */
  catalogItems: HubItem[];
  areaItems: HubItem[];
  worldItems: HubItem[];
  links: {
    catalog: string;
    areas: string;
    research: string;
    researchIndex: string;
    researchQuality: string;
    /** Null until a public document exists. */
    explorer: string | null;
  };
}

export async function hubData(locale: Locale, dict: Dictionary): Promise<HubData> {
  const tag = localeTags[locale];
  const path = (to: string) => localizePath(to, locale);
  const areas = publicAreas();
  const published = publishedProducts;
  const prices = await getPrices(published.flatMap((p) => p.variants.map((v) => v.id)));

  const cheapest = (product: Product): Money | null =>
    product.variants
      .map((v) => prices.get(v.id) ?? null)
      .filter((m): m is Money => m !== null)
      .sort((a, b) => a.amount - b.amount)[0] ?? null;

  const entryOf = (area: (typeof areas)[number]): HubItem | null => {
    const ranked = productsInArea(area.id)
      .filter(isPublishable)
      .map((product) => ({ product, price: cheapest(product) }))
      .filter((row) => row.price !== null)
      .sort((a, b) => (a.price as Money).amount - (b.price as Money).amount);
    const top = ranked[0];
    if (!top) return null;
    return {
      label: top.product.name,
      meta: formatPrice(top.price as Money, tag),
      href: path(routes.product(top.product.slug)),
      slug: top.product.slug,
      areaId: area.id,
      world: top.product.world,
    };
  };

  const flagships = worldIds
    .map((id) => products.find((p) => p.world === id && isPublishable(p)))
    .filter((p): p is Product => Boolean(p));

  return {
    counts: {
      products: published.length,
      presentations: published.reduce((n, p) => n + p.variants.length, 0),
      areas: areas.length,
      worlds: flagships.length,
    },
    catalogItems: areas
      .map(entryOf)
      .filter((item): item is HubItem => item !== null)
      .slice(0, 4),
    areaItems: areas.map((area) => ({
      label: dict.discovery.areas[area.id].short,
      meta: String(productsInArea(area.id).filter(isPublishable).length).padStart(2, "0"),
      href: path(routes.area(area.slug)),
      slug: null,
      areaId: area.id,
      world: null,
    })),
    worldItems: flagships.map((product) => {
      const price = cheapest(product);
      return {
        label: product.name,
        meta: price ? formatPrice(price, tag) : null,
        href: path(routes.product(product.slug)),
        slug: product.slug,
        areaId: publicAreasFor(product.slug)[0]?.id ?? null,
        world: product.world,
      };
    }),
    links: {
      catalog: path(routes.products),
      areas: path(routes.products),
      research: path(routes.research),
      researchIndex: `${path(routes.research)}#indice`,
      researchQuality: `${path(routes.research)}#calidad`,
      explorer: publicEvidenceIndex(published).length > 0 ? path(routes.qualityExplorer) : null,
    },
  };
}
