import "server-only";

import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import { commerceStill, type ProductImage } from "@/content/media";
import { publicOverview } from "@/content/overview";
import { researchReferenceIndex } from "@/content/research";
import {
  isPublishable,
  presentationRange,
  products,
  publishedProducts,
  type Product,
} from "@/data/catalog";
import { formatPrice, getPrices, type Money } from "@/data/commerce";
import {
  productsInArea,
  publicAreas,
  publicAreasFor,
  type DiscoveryAreaId,
} from "@/data/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

/**
 * THE HOMEPAGE'S DATA — what the store can honestly show on its front page.
 *
 * Everything is counted or selected from a registry by a stated rule. Nothing
 * here is curated by hand, so a product that becomes unpublishable, changes
 * its name or loses its price leaves no stale tile behind.
 *
 * SELECTION RULES, stated once:
 *
 *   entry        an area's cheapest priced product: the way into that area.
 *   area shelf   the next four products of an area by entry price, so the
 *                explorer shows depth rather than repeating the entry tile.
 *   closing      one product per area per round, by entry price, skipping
 *                everything already shown above: the catalogue's breadth.
 *
 * The flagships are excluded from the area shelves and the closing selection.
 * They are loud elsewhere on the page, and a shelf is where the rest of the
 * collection gets its turn.
 *
 * No Atlas data is read here: Atlas is V2 and the homepage does not link it.
 */

export interface HomeProduct {
  slug: string;
  name: string;
  subtitle: string | null;
  href: string;
  world: WorldId | null;
  areaId: DiscoveryAreaId | null;
  range: string;
  presentations: number;
  /** Formatted entry price ("$3,900"), or null when unpriced. */
  price: string | null;
  /** A photograph or a studio render of the product's model, when one exists. */
  image: ProductImage | null;
}

export interface HomeArea {
  id: DiscoveryAreaId;
  slug: string;
  href: string;
  count: number;
  entry: HomeProduct | null;
  shelf: readonly HomeProduct[];
}

export interface HomeData {
  counts: {
    products: number;
    presentations: number;
    areas: number;
    profiles: number;
    references: number;
  };
  /** The catalogue's lowest entry price, formatted. */
  lowestPrice: string | null;
  /**
   * The product the catalogue is shown by: the first non-flagship product in
   * catalogue order with a real image (a photograph or a studio still of its
   * model), else the first area's entry product, drawn.
   */
  catalogFace: HomeProduct | null;
  flagships: readonly (HomeProduct & { world: WorldId })[];
  areas: readonly HomeArea[];
  closing: readonly HomeProduct[];
  /** The three most recent cited references, as a bibliography preview. */
  recentReferences: readonly { title: string; publication: string | null; year: number | null }[];
  links: {
    catalog: string;
    research: string;
    references: string | null;
    /** Null until a public document exists: the explorer 404s before that. */
    explorer: string | null;
  };
}

const SHELF_SIZE = 4;
const CLOSING_SIZE = 10;

export async function homeData(locale: Locale): Promise<HomeData> {
  const tag = localeTags[locale];
  const path = (to: string) => localizePath(to, locale);
  const published = publishedProducts;
  const prices = await getPrices(published.flatMap((p) => p.variants.map((v) => v.id)));

  const cheapest = (product: Product): Money | null =>
    product.variants
      .map((v) => prices.get(v.id) ?? null)
      .filter((m): m is Money => m !== null)
      .sort((a, b) => a.amount - b.amount)[0] ?? null;

  const toItem = (product: Product, areaId: DiscoveryAreaId | null): HomeProduct => {
    const price = cheapest(product);
    return {
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle ?? null,
      href: path(routes.product(product.slug)),
      world: product.world,
      areaId,
      range: presentationRange(product),
      presentations: product.variants.length,
      price: price ? formatPrice(price, tag) : null,
      image: commerceStill(product.slug),
    };
  };

  /* An area's products that can be sold today, cheapest first. */
  const ranked = (areaId: DiscoveryAreaId) =>
    productsInArea(areaId)
      .filter(isPublishable)
      .map((product) => ({ product, price: cheapest(product) }))
      .filter((row): row is { product: Product; price: Money } => row.price !== null)
      .sort((a, b) => a.price.amount - b.price.amount)
      .map((row) => row.product);

  const flagships = worldIds
    .map((id) => products.find((p) => p.world === id && isPublishable(p)))
    .filter((p): p is Product & { world: WorldId } => Boolean(p && p.world));

  const shown = new Set<string>(flagships.map((p) => p.slug));

  const areas: HomeArea[] = publicAreas().map((area) => {
    const all = ranked(area.id);
    const entry = all[0] ?? null;
    if (entry) shown.add(entry.slug);
    const shelf = all
      .filter((p) => p.slug !== entry?.slug && !p.world)
      .slice(0, SHELF_SIZE)
      .map((p) => toItem(p, area.id));
    return {
      id: area.id,
      slug: area.slug,
      href: path(routes.area(area.slug)),
      count: productsInArea(area.id).filter(isPublishable).length,
      entry: entry ? toItem(entry, area.id) : null,
      shelf,
    };
  });
  for (const area of areas) for (const item of area.shelf) shown.add(item.slug);

  /* Round-robin across the areas, so the closing shelf reads as breadth. */
  const queues = publicAreas().map((area) => ({
    areaId: area.id,
    queue: ranked(area.id).filter((p) => !p.world),
  }));
  const closing: HomeProduct[] = [];
  const taken = new Set<string>();
  for (let round = 0; closing.length < CLOSING_SIZE && round < 12; round++) {
    for (const { areaId, queue } of queues) {
      if (closing.length >= CLOSING_SIZE) break;
      const next = queue.find((p) => !shown.has(p.slug) && !taken.has(p.slug));
      if (!next) continue;
      taken.add(next.slug);
      closing.push(toItem(next, areaId));
    }
  }

  const lowest = published
    .map(cheapest)
    .filter((m): m is Money => m !== null)
    .sort((a, b) => a.amount - b.amount)[0];

  const withImage = published.find((p) => !p.world && commerceStill(p.slug) !== null);
  const catalogFace = withImage
    ? toItem(withImage, publicAreasFor(withImage.slug)[0]?.id ?? null)
    : (areas[0]?.entry ?? null);

  const referenceIndex = researchReferenceIndex();
  const references = referenceIndex.length;

  return {
    counts: {
      products: published.length,
      presentations: published.reduce((n, p) => n + p.variants.length, 0),
      areas: areas.length,
      profiles: published.filter((p) => publicOverview(p.slug, locale)).length,
      references,
    },
    lowestPrice: lowest ? formatPrice(lowest, tag) : null,
    catalogFace,
    flagships: flagships.map((p) => ({
      ...toItem(p, null),
      world: p.world,
    })),
    areas,
    closing,
    recentReferences: referenceIndex.slice(0, 3).map(({ reference }) => ({
      title: reference.title,
      publication: reference.publication,
      year: reference.year,
    })),
    links: {
      catalog: path(routes.products),
      research: path(routes.research),
      references: references > 0 ? path(routes.researchReferences) : null,
      explorer: publicEvidenceIndex(published).length > 0 ? path(routes.qualityExplorer) : null,
    },
  };
}
