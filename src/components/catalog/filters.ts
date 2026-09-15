import { matchesText } from "@/lib/search";

import type { CardDetails } from "@/components/ui/ProductCard";
import type { RegisterPresentation } from "@/domain/storefront";
import type { WorldId } from "@/config/worlds";

/**
 * THE CATALOGUE FILTER ENGINE — pure, URL-backed, tested.
 *
 * Every filter operates on a field the product record actually holds. A facet
 * whose field has no data yet (stock, public documentation, photography) is
 * part of the engine but renders nothing until at least two of its options
 * exist in scope — see `facetVisible`. So the day a COA is approved or a
 * photograph registered, its filter appears; until then there is no control
 * that invites a click and does nothing.
 *
 * FACETS ARE DISJUNCTIVE. Options inside one facet are OR ("Metabolismo or
 * Piel"); facets combine with AND. A facet's counts are computed with every
 * OTHER facet applied but not itself, which is what lets a reader see how many
 * results each option would add rather than watching every other option drop
 * to zero the moment one is ticked.
 *
 * `check:catalog` drives all of this with fixtures and with the real catalogue.
 */

export type StrengthKind = "solid" | "solution" | "volume" | "iu" | "blend";
export type AvailabilityValue = "in-stock" | "made-to-order" | "unavailable";

/** What the browser needs to know about one product. Thin and serialisable. */
export interface CatalogProduct {
  id: string;
  index: string;
  slug: string;
  name: string;
  subtitle: string | null;
  category: string;
  categoryLabel: string;
  productType: string;
  /** Public discovery areas this product is filed under. */
  areas: readonly string[];
  /** Primary area, for the specimen plate's tone. */
  areaId: string | null;
  world: WorldId | null;
  worldLabel?: string;
  href: string;
  /** Formatted cheapest price, or null. */
  price: string | null;
  /** Cheapest amount in MXN, for sorting and the price range. Null where unpriced. */
  priceAmount: number | null;
  /** "5 mg · 10 mg · 15 mg" — searched, and shown in the register view. */
  strengths: string;
  /** "5 mg – 60 mg" — on the card. */
  range: string;
  presentations: number;
  /** Every presentation with its strength, pack price and vials — the register's cells. */
  presentationList: readonly RegisterPresentation[];
  /** Distinct strength kinds across the presentations. */
  formats: readonly StrengthKind[];
  /** Distinct vials-per-pack counts the catalogue states. */
  vials: readonly number[];
  /** Distinct availability states across presentations. Empty while unknown. */
  availability: readonly AvailabilityValue[];
  /** True when the evidence resolver accepted at least one public record. */
  documented: boolean;
  /** True when a real photograph is registered in the media layer. */
  photographed: boolean;
  ctaLabel: string;
  /** What the card reveals on hover, focus or tap. See `server/catalog#cardDetails`. */
  details?: CardDetails;
}

export const LIST_FACETS = ["area", "category", "type", "format", "vials", "availability"] as const;
export type ListFacet = (typeof LIST_FACETS)[number];

export const FLAG_FACETS = ["flagship", "documented", "photographed"] as const;
export type FlagFacet = (typeof FLAG_FACETS)[number];

export type Sort = "index" | "name" | "name-desc" | "price-asc" | "price-desc" | "presentations";
export const SORTS: readonly Sort[] = [
  "index",
  "name",
  "name-desc",
  "price-asc",
  "price-desc",
  "presentations",
];
export type View = "grid" | "index";

export interface CatalogFilters {
  query: string;
  lists: Readonly<Record<ListFacet, readonly string[]>>;
  flags: Readonly<Record<FlagFacet, boolean>>;
  priceMin: number | null;
  priceMax: number | null;
  sort: Sort;
  view: View;
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  lists: {
    area: [],
    category: [],
    type: [],
    format: [],
    vials: [],
    availability: [],
  },
  flags: { flagship: false, documented: false, photographed: false },
  priceMin: null,
  priceMax: null,
  sort: "index",
  view: "grid",
};

/* ---- values a product holds, per facet ----------------------------------- */

export function valuesFor(product: CatalogProduct, facet: ListFacet): readonly string[] {
  switch (facet) {
    case "area":
      return product.areas;
    case "category":
      return [product.category];
    case "type":
      return [product.productType];
    case "format":
      return product.formats;
    case "vials":
      return product.vials.map(String);
    case "availability":
      return product.availability;
  }
}

function flagFor(product: CatalogProduct, flag: FlagFacet): boolean {
  switch (flag) {
    case "flagship":
      return product.world !== null;
    case "documented":
      return product.documented;
    case "photographed":
      return product.photographed;
  }
}

/* ---- matching ------------------------------------------------------------ */

type Exclude = ListFacet | FlagFacet | "price" | null;

export function matches(
  product: CatalogProduct,
  filters: CatalogFilters,
  except: Exclude = null,
): boolean {
  const q = filters.query.trim();
  if (
    q &&
    !matchesText(
      `${product.name} ${product.subtitle ?? ""} ${product.categoryLabel} ${product.strengths}`,
      q,
    )
  ) {
    return false;
  }
  for (const facet of LIST_FACETS) {
    if (facet === except) continue;
    const selected = filters.lists[facet];
    if (selected.length === 0) continue;
    const held = valuesFor(product, facet);
    if (!selected.some((value) => held.includes(value))) return false;
  }
  for (const flag of FLAG_FACETS) {
    if (flag === except || !filters.flags[flag]) continue;
    if (!flagFor(product, flag)) return false;
  }
  if (except !== "price" && (filters.priceMin !== null || filters.priceMax !== null)) {
    /* An unpriced product cannot satisfy a price bound — it is not free. */
    if (product.priceAmount === null) return false;
    if (filters.priceMin !== null && product.priceAmount < filters.priceMin) return false;
    if (filters.priceMax !== null && product.priceAmount > filters.priceMax) return false;
  }
  return true;
}

export function sortProducts(products: readonly CatalogProduct[], sort: Sort): CatalogProduct[] {
  const list = [...products];
  switch (sort) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "name-desc":
      return list.sort((a, b) => b.name.localeCompare(a.name, "es"));
    /* Unpriced products sort LAST in both directions, never as zero. */
    case "price-asc":
      return list.sort((a, b) => (a.priceAmount ?? Infinity) - (b.priceAmount ?? Infinity));
    case "price-desc":
      return list.sort((a, b) => (b.priceAmount ?? -Infinity) - (a.priceAmount ?? -Infinity));
    case "presentations":
      return list.sort(
        (a, b) => b.presentations - a.presentations || a.index.localeCompare(b.index),
      );
    default:
      return list.sort((a, b) => a.index.localeCompare(b.index));
  }
}

export function applyFilters(
  products: readonly CatalogProduct[],
  filters: CatalogFilters,
): CatalogProduct[] {
  return sortProducts(
    products.filter((p) => matches(p, filters)),
    filters.sort,
  );
}

/* ---- facet options and counts -------------------------------------------- */

export interface FacetOption {
  value: string;
  /** Results this option would show, given every OTHER active filter. */
  count: number;
  /** Products holding this value in the whole scope, ignoring filters. */
  total: number;
}

/**
 * Options for one list facet, in a stable order, with disjunctive counts.
 * `order` fixes the sequence for facets that have one (areas, formats);
 * otherwise options sort by value.
 */
export function facetOptions(
  products: readonly CatalogProduct[],
  filters: CatalogFilters,
  facet: ListFacet,
  order?: readonly string[],
): FacetOption[] {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const product of products) {
    const values = new Set(valuesFor(product, facet));
    const live = matches(product, filters, facet);
    for (const value of values) {
      totals.set(value, (totals.get(value) ?? 0) + 1);
      if (live) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const values = [...totals.keys()];
  const rank = (v: string) => (order ? order.indexOf(v) : -1);
  values.sort((a, b) => (order ? rank(a) - rank(b) : a.localeCompare(b, "es", { numeric: true })));
  return values
    .filter((value) => !order || order.includes(value))
    .map((value) => ({ value, count: counts.get(value) ?? 0, total: totals.get(value) ?? 0 }));
}

export function flagCounts(
  products: readonly CatalogProduct[],
  filters: CatalogFilters,
  flag: FlagFacet,
): { count: number; total: number; scope: number } {
  let count = 0;
  let total = 0;
  for (const product of products) {
    if (!flagFor(product, flag)) continue;
    total += 1;
    if (matches(product, filters, flag)) count += 1;
  }
  return { count, total, scope: products.length };
}

/**
 * A facet renders only when it can discriminate: at least two options held by
 * products in scope. A flag renders only when some but not all products hold
 * it. This is the rule that keeps stock, documentation and photography filters
 * out of the page until their data exists.
 */
export function facetVisible(options: readonly FacetOption[]): boolean {
  return options.filter((o) => o.total > 0).length >= 2;
}

export function flagVisible(counts: { total: number; scope: number }): boolean {
  return counts.total > 0 && counts.total < counts.scope;
}

export function priceBounds(
  products: readonly CatalogProduct[],
): { min: number; max: number } | null {
  const amounts = products.map((p) => p.priceAmount).filter((a): a is number => a !== null);
  if (amounts.length < 2) return null;
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return min === max ? null : { min, max };
}

/* ---- URL ------------------------------------------------------------------ */

const LIST_PARAM: Record<ListFacet, string> = {
  area: "area",
  category: "clase",
  type: "tipo",
  format: "formato",
  vials: "viales",
  availability: "disponibilidad",
};

const FLAG_PARAM: Record<FlagFacet, string> = {
  flagship: "insignia",
  documented: "documentado",
  photographed: "fotografia",
};

/**
 * Filters from a query string. Unknown or malformed values are dropped, never
 * thrown on: a hand-edited or stale URL degrades to fewer filters, not an error.
 */
export function parseFilters(search: string): CatalogFilters {
  const params = new URLSearchParams(search);
  const list = (facet: ListFacet) =>
    (params.get(LIST_PARAM[facet]) ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  const number = (key: string) => {
    const raw = params.get(key);
    if (raw === null || raw.trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  };
  const sort = params.get("orden") as Sort | null;
  const view = params.get("vista");
  return {
    query: (params.get("q") ?? "").slice(0, 80),
    lists: Object.fromEntries(
      LIST_FACETS.map((f) => [f, list(f)]),
    ) as unknown as CatalogFilters["lists"],
    flags: Object.fromEntries(
      FLAG_FACETS.map((f) => [f, params.get(FLAG_PARAM[f]) === "1"]),
    ) as unknown as CatalogFilters["flags"],
    priceMin: number("min"),
    priceMax: number("max"),
    sort: sort && SORTS.includes(sort) ? sort : "index",
    view: view === "registro" ? "index" : "grid",
  };
}

/** A query string for these filters, omitting everything at its default. */
export function serializeFilters(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  for (const facet of LIST_FACETS) {
    if (filters.lists[facet].length) params.set(LIST_PARAM[facet], filters.lists[facet].join(","));
  }
  for (const flag of FLAG_FACETS) if (filters.flags[flag]) params.set(FLAG_PARAM[flag], "1");
  if (filters.priceMin !== null) params.set("min", String(filters.priceMin));
  if (filters.priceMax !== null) params.set("max", String(filters.priceMax));
  if (filters.sort !== "index") params.set("orden", filters.sort);
  if (filters.view === "index") params.set("vista", "registro");
  const out = params.toString();
  return out ? `?${out}` : "";
}

/** How many filters are narrowing the result — sort and view do not count. */
export function activeFilterCount(filters: CatalogFilters): number {
  return (
    (filters.query.trim() ? 1 : 0) +
    LIST_FACETS.reduce((n, f) => n + filters.lists[f].length, 0) +
    FLAG_FACETS.filter((f) => filters.flags[f]).length +
    (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0)
  );
}

export function toggleValue(
  filters: CatalogFilters,
  facet: ListFacet,
  value: string,
): CatalogFilters {
  const current = filters.lists[facet];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...filters, lists: { ...filters.lists, [facet]: next } };
}

/** Clears narrowing filters but keeps the reader's chosen sort and view. */
export function clearFilters(filters: CatalogFilters): CatalogFilters {
  return { ...EMPTY_FILTERS, sort: filters.sort, view: filters.view };
}
