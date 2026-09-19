import "server-only";

import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import { commerceStill, type ProductImage } from "@/content/media";
import { publicOverview } from "@/content/overview";
import { referencesForProduct, researchReferenceIndex } from "@/content/research";
import {
  formatStrength,
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
import { perVial } from "@/domain/storefront";
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

export interface HomeComponent {
  /** As printed in the composition: "GHK-CU". */
  name: string;
  mg: number;
  /** The product sold on its own, when the catalogue has one. */
  product: { name: string; href: string; price: string | null } | null;
}

/** "GHK-CU 50mg + TB-500 10mg" → [{ name, mg }]. Null if any part does not parse. */
function parseComposition(text: string | null): { name: string; mg: number }[] | null {
  if (!text) return null;
  const parts = text.split("+").map((part) => part.trim().match(/^(.+?)\s*([\d.]+)\s*mg$/i));
  if (parts.length < 2 || parts.some((m) => !m)) return null;
  return parts.map((m) => ({ name: m![1].trim(), mg: Number(m![2]) }));
}

/** Letters and digits only, lower case: "TB-500" and "TB500" are the same compound. */
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

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
  flagships: readonly (HomeProduct & {
    world: WorldId;
    /** Every presentation with its own price, smallest first. */
    ladder: readonly {
      label: string;
      price: string | null;
      /** Milligrams for a solid presentation, for drawing to scale; else null. */
      mg: number | null;
      vials: number | null;
      perVial: string | null;
    }[];
    /** Vials per pack when every presentation shares one, else null. */
    pack: number | null;
    /** The flagship's first public discovery area. */
    primaryArea: DiscoveryAreaId | null;
    /**
     * A blend's printed composition, parsed into its parts — each linked to
     * the product that sells it alone, when the catalogue has one. Null for a
     * single compound, or when the composition does not parse.
     */
    components: readonly HomeComponent[] | null;
    /** The entry pack's price per vial, formatted. */
    perVial: string | null;
    /** Every public discovery area the flagship is filed under. */
    areas: readonly { id: DiscoveryAreaId; href: string }[];
    /** Blends that contain this compound, with how much of it per vial. */
    usedIn: readonly { name: string; href: string; mg: number; total: number }[];
    /** Public references its sourced profile cites; 0 without a profile. */
    references: number;
    hasProfile: boolean;
  })[];
  areas: readonly HomeArea[];
  closing: readonly HomeProduct[];
  /**
   * The strengths the catalogue carries most often ("10 mg"), as searches to
   * try: a fact about the catalogue's shape, not a popularity signal.
   */
  strengths: readonly string[];
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

  const strengthCounts = new Map<string, number>();
  for (const product of published) {
    for (const variant of product.variants) {
      if (variant.strength.kind !== "solid") continue;
      const label = formatStrength(variant.strength);
      strengthCounts.set(label, (strengthCounts.get(label) ?? 0) + 1);
    }
  }
  const strengths = [...strengthCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label)
    .sort((a, b) => parseFloat(a) - parseFloat(b));

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
    flagships: flagships.map((p) => {
      const packs = new Set(p.variants.map((v) => v.vials ?? null));
      const only = packs.size === 1 ? [...packs][0] : null;
      return {
        ...toItem(p, null),
        world: p.world,
        ladder: p.variants.map((v) => {
          const price = prices.get(v.id) ?? null;
          const unit = price ? perVial(price.amount, v.vials ?? null) : null;
          return {
            label: formatStrength(v.strength),
            price: price ? formatPrice(price, tag) : null,
            mg: v.strength.kind === "solid" ? v.strength.mg : null,
            vials: v.vials ?? null,
            perVial: unit !== null ? formatPrice({ amount: unit, currency: "MXN" }, tag) : null,
          };
        }),
        areas: publicAreasFor(p.slug).map((area) => ({
          id: area.id,
          href: path(routes.area(area.slug)),
        })),
        /* Reverse of `components`: the blends whose printed composition names this compound. */
        usedIn: published.flatMap((blend) => {
          if (blend.slug === p.slug || blend.category !== "blends") return [];
          const parts = parseComposition(blend.composition);
          const part = parts?.find(
            (x) => key(p.slug) === key(x.name) || key(p.name).endsWith(key(x.name)),
          );
          if (!parts || !part) return [];
          return [
            {
              name: blend.name,
              href: path(routes.product(blend.slug)),
              mg: part.mg,
              total: parts.reduce((sum, x) => sum + x.mg, 0),
            },
          ];
        }),
        references: referencesForProduct(p.slug).length,
        hasProfile: Boolean(publicOverview(p.slug, locale)),
        pack: typeof only === "number" ? only : null,
        primaryArea: publicAreasFor(p.slug)[0]?.id ?? null,
        components:
          parseComposition(p.composition)?.map((part) => {
            const alone = published.find(
              (q) =>
                q.slug !== p.slug &&
                q.category !== "blends" &&
                (key(q.slug) === key(part.name) || key(q.name).endsWith(key(part.name))),
            );
            const price = alone ? cheapest(alone) : null;
            return {
              ...part,
              product: alone
                ? {
                    name: alone.name,
                    href: path(routes.product(alone.slug)),
                    price: price ? formatPrice(price, tag) : null,
                  }
                : null,
            };
          }) ?? null,
        perVial: (() => {
          const entry = p.variants
            .map((v) => ({ v, price: prices.get(v.id) ?? null }))
            .filter((row) => row.price !== null)
            .sort((a, b) => a.price!.amount - b.price!.amount)[0];
          const unit = entry ? perVial(entry.price!.amount, entry.v.vials ?? null) : null;
          return unit !== null ? formatPrice({ amount: unit, currency: "MXN" }, tag) : null;
        })(),
      };
    }),
    areas,
    closing,
    strengths,
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
