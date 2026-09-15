import "server-only";

import { siteConfig } from "@/config/site";
import { routes } from "@/config/routes";
import {
  formatStrength,
  isPublishable,
  presentationRange,
  products,
  type Product,
} from "@/data/catalog";
import { getPrices, type Money } from "@/data/commerce";
import {
  publicAreas,
  publicAreasFor,
  productsInArea,
  type DiscoveryAreaId,
} from "@/data/discovery";
import { entryOrder } from "@/domain/discovery";
import { logTicks, presentationMatrix, priceBands, stackOnAxis } from "@/domain/storefront";
import { localizePath } from "@/i18n/routing";
import { worldIds, type WorldId } from "@/config/worlds";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

/**
 * THE HOMEPAGE'S COMMERCIAL MOMENTS — data, built once on the server.
 *
 * Four client islands render what this module derives: the catalogue ticker,
 * the presentation matrix, the price spectrum and the flagship shop. They
 * receive numbers and labels only — never a registry — so the price map stays
 * out of the browser, and every figure a customer sees can be traced to
 * `data/catalog` and `data/commerce` through `domain/storefront`.
 *
 * NOTHING HERE IS CURATED BY TASTE. Order is catalogue order or price; the
 * matrix's area is the one with the most comparable products; the shop's
 * three products are the three with a world. What changes in the registries
 * changes here.
 */

const published = () => products.filter(isPublishable);

async function priceMap(items: readonly Product[]) {
  return getPrices(items.flatMap((p) => p.variants.map((v) => v.id)));
}

function cheapest(product: Product, prices: ReadonlyMap<string, Money | null>): Money | null {
  return (
    product.variants
      .map((v) => prices.get(v.id) ?? null)
      .filter((m): m is Money => m !== null)
      .sort((a, b) => a.amount - b.amount)[0] ?? null
  );
}

/* ---- ticker -------------------------------------------------------------- */

export interface TickerItem {
  slug: string;
  name: string;
  href: string;
  areaId: DiscoveryAreaId | null;
  range: string;
  amount: number | null;
}

/** Every published product, in catalogue order, with its range and entry price. */
export async function tickerItems(locale: Locale): Promise<TickerItem[]> {
  const items = published();
  const prices = await priceMap(items);
  return items.map((product) => ({
    slug: product.slug,
    name: product.name,
    href: localizePath(routes.product(product.slug), locale),
    areaId: publicAreasFor(product.slug)[0]?.id ?? null,
    range: presentationRange(product),
    amount: cheapest(product, prices)?.amount ?? null,
  }));
}

/* ---- presentation matrix ------------------------------------------------- */

export interface MatrixData {
  areaId: DiscoveryAreaId;
  areaHref: string;
  columns: readonly number[];
  rows: readonly {
    slug: string;
    name: string;
    href: string;
    world: WorldId | null;
    from: number | null;
    cells: readonly ({ amount: number | null; vials: number | null } | null)[];
  }[];
}

/**
 * The area whose products compare best side by side — the most products sold
 * as solids in two or more strengths — as a strengths × products matrix.
 * Today that is Metabolismo, and RETA leads it (`entryOrder`: flagship first).
 */
export async function matrixData(locale: Locale): Promise<MatrixData | null> {
  const candidates = await Promise.all(
    publicAreas().map(async (area) => {
      const items = entryOrder(productsInArea(area.id).filter(isPublishable));
      const prices = await priceMap(items);
      const inputs = items.map((product) => ({
        product,
        slug: product.slug,
        cells: product.variants.flatMap((v) =>
          v.strength.kind === "solid"
            ? [{ mg: v.strength.mg, amount: prices.get(v.id)?.amount ?? null, vials: v.vials }]
            : [],
        ),
      }));
      return { area, matrix: presentationMatrix(inputs) };
    }),
  );
  const best = candidates.sort((a, b) => b.matrix.rows.length - a.matrix.rows.length)[0];
  if (!best || best.matrix.rows.length < 3) return null;

  return {
    areaId: best.area.id,
    areaHref: localizePath(routes.area(best.area.slug), locale),
    columns: best.matrix.columns,
    rows: best.matrix.rows.map((row) => ({
      slug: row.item.slug,
      name: row.item.product.name,
      href: localizePath(routes.product(row.item.slug), locale),
      world: row.item.product.world,
      from: row.from,
      cells: row.cells,
    })),
  };
}

/* ---- price spectrum ------------------------------------------------------ */

export interface SpectrumData {
  min: number;
  max: number;
  bins: number;
  height: number;
  ticks: readonly { value: number; x: number }[];
  threshold: { value: number; x: number } | null;
  points: readonly {
    slug: string;
    name: string;
    href: string;
    areaId: DiscoveryAreaId | null;
    range: string;
    amount: number;
    x: number;
    level: number;
  }[];
  bands: readonly { from: number; to: number | null; slugs: readonly string[] }[];
  areas: readonly DiscoveryAreaId[];
}

const SPECTRUM_BINS = 44;

export async function spectrumData(locale: Locale): Promise<SpectrumData | null> {
  const items = await tickerItems(locale);
  const priced = items
    .filter((item): item is TickerItem & { amount: number } => item.amount !== null)
    .map((item) => ({ ...item, amount: item.amount }));
  if (priced.length < 2) return null;

  const { placed, min, max, height } = stackOnAxis(priced, SPECTRUM_BINS);
  const xOf = (value: number) =>
    (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min));
  const threshold = siteConfig.fulfilment.freeShippingThreshold;

  return {
    min,
    max,
    bins: SPECTRUM_BINS,
    height,
    ticks: logTicks(min, max).map((value) => ({ value, x: xOf(value) })),
    threshold:
      threshold !== null && threshold > min && threshold < max
        ? { value: threshold, x: xOf(threshold) }
        : null,
    points: placed.map(({ item, x, level }) => ({
      slug: item.slug,
      name: item.name,
      href: item.href,
      areaId: item.areaId,
      range: item.range,
      amount: item.amount,
      x,
      level,
    })),
    bands: priceBands(priced, [3000, 5000, 8000, threshold ?? 10000, 20000]).map((band) => ({
      from: band.from,
      to: band.to,
      slugs: band.items.map((item) => item.slug),
    })),
    areas: publicAreas().map((area) => area.id),
  };
}

/* ---- flagship shop ------------------------------------------------------- */

export interface ShopProduct {
  slug: string;
  name: string;
  href: string;
  world: WorldId;
  areaId: DiscoveryAreaId | null;
  composition: string | null;
  areas: readonly string[];
  variants: readonly {
    id: string;
    label: string;
    amount: number | null;
    vials: number | null;
  }[];
}

/** The three products with a world, in world order, with every presentation priced. */
export async function shopProducts(locale: Locale, dict: Dictionary): Promise<ShopProduct[]> {
  const flagships = worldIds
    .map((id) => products.find((p) => p.world === id && isPublishable(p)))
    .filter((p): p is Product => Boolean(p));
  const prices = await priceMap(flagships);
  return flagships.map((product) => ({
    slug: product.slug,
    name: product.name,
    href: localizePath(routes.product(product.slug), locale),
    world: product.world as WorldId,
    areaId: publicAreasFor(product.slug)[0]?.id ?? null,
    composition: product.composition,
    areas: publicAreasFor(product.slug).map((a) => dict.discovery.areas[a.id].short),
    variants: product.variants
      .filter((v) => v.vials !== null)
      .map((v) => ({
        id: v.id,
        label: formatStrength(v.strength),
        amount: prices.get(v.id)?.amount ?? null,
        vials: v.vials,
      })),
  }));
}
