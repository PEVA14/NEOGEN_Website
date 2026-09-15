import "server-only";

import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import {
  formatStrength,
  isPublishable,
  presentationRange,
  products,
  type Product,
} from "@/data/catalog";
import { getPrices, type Money } from "@/data/commerce";
import { publicAreasFor, type DiscoveryAreaId } from "@/data/discovery";
import { localizePath } from "@/i18n/routing";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

/**
 * PARKED STOREFRONT MOMENTS — data for the catalogue ticker and the flagship
 * shop, built on the server so the islands receive numbers and labels only.
 * Neither is rendered today (see `components/storefront`). The presentation
 * matrix moved into the catalogue's register view; the price spectrum was
 * removed.
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
