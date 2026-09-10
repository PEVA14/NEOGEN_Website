"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { Body, Mono } from "@/components/typography";
import { CompoundIndexHead, CompoundRow, ProductCard } from "@/components/ui";
import type { WorldId } from "@/config/worlds";

import styles from "./CatalogBrowser.module.css";

export interface CatalogProduct {
  id: string;
  index: string;
  /** Identity key — drives the media lookup as well as the link. */
  slug: string;
  name: string;
  /** Alternative designation, where the catalogue states one. */
  subtitle: string | null;
  category: string;
  categoryLabel: string;
  /**
   * Discovery areas this product may publicly be shown under. Empty while its
   * assignments are still drafts, which is every product today.
   */
  areas: readonly string[];
  /** Only the three flagships carry a world. */
  world: WorldId | null;
  worldLabel?: string;
  href: string;
  /** Formatted retail price, or null where none is set. */
  price: string | null;
  /** Cheapest amount in MXN, for sorting. Null where unpriced. */
  priceAmount: number | null;
  /** Dose summary for search and the register — "5 mg · 10 mg · 15 mg". */
  strengths: string;
  /** Collapsed ladder for the card — "5 mg – 60 mg". */
  range: string;
  /** Presentation count, for the specimen plate's datum lines. */
  presentations: number;
  /** Primary discovery area id, for the plate's tone. */
  areaId: string | null;
  ctaLabel: string;
}

export interface CatalogCopy {
  searchLabel: string;
  searchPlaceholder: string;
  filterLabel: string;
  filterAll: string;
  categoryLabels: Record<string, string>;
  /** Discovery-area filter. Absent from the UI while no area has products. */
  areaLabel: string;
  areaLabels: Record<string, string>;
  /** Ordered area ids that currently have approved products. */
  areaOrder: readonly string[];
  from: string;
  sortLabel: string;
  sortIndex: string;
  sortName: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  typeLabel: string;
  filtersLabel: string;
  filtersApplied: string;
  viewLabel: string;
  viewGrid: string;
  viewIndex: string;
  countLabel: string;
  empty: string;
  clear: string;
  columns: readonly string[];
  documentationPending: string;
  placeholder: string;
}

/**
 * A media query as an external store.
 *
 * `matchMedia` is exactly that — something outside React that changes — so
 * this needs no effect and no `setState` during mount. The server snapshot is
 * `false`, which is the correct starting assumption: it renders the mobile
 * composition, and a narrow viewport therefore never reflows.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

type View = "grid" | "index";
type Sort = "index" | "name" | "price-asc" | "price-desc";

/**
 * THE CATALOGUE.
 *
 * WHAT IT FILTERS ON, AND WHY THAT IS THE WHOLE LIST.
 * ---------------------------------------------------
 * Search, the category filter and the discovery-area filter all operate on data
 * that genuinely exists. The area row is the newest and the most conditional:
 * it is in the DOM only when at least one area has an APPROVED product, so
 * while the whole proposed mapping is still a draft the catalogue looks exactly
 * as it did.
 *
 * A filter control that cannot filter is worse than an absent one: it invites a
 * click, does nothing, and teaches the reader the interface is decorative.
 *
 * TWO VIEWS, BECAUSE A CATALOGUE IS BOTH THINGS.
 * ----------------------------------------------
 * GRID is the product-launch reading — media first, one card per compound.
 * INDEX is the technical reading — a register with column heads, the same shape
 * the research material uses. The index is what makes a three-item list read as
 * a laboratory's inventory rather than as a shop with not much in it.
 *
 * All state is local and ephemeral. Nothing is persisted and nothing is in the
 * URL: there is no shareable result set worth serialising for three compounds,
 * and a query string here would be architecture ahead of need.
 */
export function CatalogBrowser({
  products,
  copy,
}: {
  products: readonly CatalogProduct[];
  copy: CatalogCopy;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("index");

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();

    return products
      .filter((product) => {
        if (category !== "all" && product.category !== category) return false;
        if (area !== "all" && !product.areas.includes(area)) return false;
        if (!needle) return true;
        // Matches what a reader can actually see on a card: the name, the
        // category and the doses.
        return `${product.name} ${product.categoryLabel} ${product.strengths}`
          .toLocaleLowerCase()
          .includes(needle);
      })
      .sort((a, b) => {
        switch (sort) {
          case "name":
            return a.name.localeCompare(b.name);
          /*
           * Unpriced products sort LAST in both directions rather than being
           * treated as zero — two of them exist, and burying them at the top
           * of a cheapest-first list would be the wrong answer to both
           * questions.
           */
          case "price-asc":
            return (a.priceAmount ?? Infinity) - (b.priceAmount ?? Infinity);
          case "price-desc":
            return (b.priceAmount ?? -Infinity) - (a.priceAmount ?? -Infinity);
          default:
            return a.index.localeCompare(b.index);
        }
      });
  }, [products, query, category, area, sort]);

  const filtered = query.trim() !== "" || category !== "all" || area !== "all";
  const activeCount = [query.trim() !== "", category !== "all", area !== "all"].filter(
    Boolean,
  ).length;

  /*
   * Whether there is room for the rail. Read once on mount and on resize —
   * `useSyncExternalStore` over `matchMedia` rather than an effect, so the
   * server renders the disclosure CLOSED and a phone never flashes the whole
   * rail open before collapsing it.
   */
  const wide = useMediaQuery("(min-width: 48rem)");

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  const reset = () => {
    setQuery("");
    setCategory("all");
    setArea("all");
  };

  return (
    <div className={styles.browser}>
      {/*
       * The control rail. One band between two hairlines — an instrument panel,
       * not a floating toolbar. Nothing here is boxed; structure comes from
       * rules and alignment, as everywhere else in the system.
       */}
      {/*
       * The control rail, behind a disclosure on phones. `open` is set from
       * the same media query the CSS uses so the two cannot disagree; above
       * 48rem the summary is hidden and the rail is simply always present.
       */}
      <details className={styles.sheet} open={wide}>
        <summary>
          <span>{copy.filtersLabel}</span>
          {activeCount > 0 ? (
            <span>
              {activeCount} {copy.filtersApplied}
            </span>
          ) : null}
        </summary>

        <div className={styles.rail}>
          <div className={styles.search}>
            <Mono size="2xs" className={styles.controlLabel} id="catalog-search-label">
              {copy.searchLabel}
            </Mono>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-labelledby="catalog-search-label"
              className={styles.searchInput}
            />
          </div>

          {/*
           * FACTUAL TYPE — a select, not a chip row.
           *
           * Five category chips plus nine area chips plus sort plus view came to
           * nineteen controls above the products, which is a rail that competes
           * with the catalogue instead of serving it. The supplier category is
           * the SECONDARY axis now — discovery area is what a customer shops
           * along — so it collapses into one control and gives the row back.
           */}
          <div className={styles.select}>
            <Mono size="2xs" className={styles.controlLabel} id="catalog-type-label">
              {copy.typeLabel}
            </Mono>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-labelledby="catalog-type-label"
              className={styles.selectInput}
            >
              <option value="all">{copy.filterAll}</option>
              {categories.map((id) => (
                <option key={id} value={id}>
                  {copy.categoryLabels[id] ?? id}
                </option>
              ))}
            </select>
          </div>

          {/*
           * DISCOVERY AREA — rendered only when at least one area has approved
           * products. A filter that cannot filter is worse than an absent one,
           * and every assignment is a draft today, so this row is currently not
           * in the DOM at all rather than present and empty.
           */}
          {copy.areaOrder.length > 0 ? (
            <fieldset className={styles.group}>
              <legend className={styles.controlLabel}>
                <Mono size="2xs">{copy.areaLabel}</Mono>
              </legend>
              <div className={styles.options}>
                <button
                  type="button"
                  className={styles.chip}
                  aria-pressed={area === "all"}
                  onClick={() => setArea("all")}
                >
                  {copy.filterAll}
                </button>
                {copy.areaOrder.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={styles.chip}
                    aria-pressed={area === id}
                    onClick={() => setArea(id)}
                  >
                    {copy.areaLabels[id] ?? id}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className={styles.trailing}>
            <fieldset className={styles.group}>
              <legend className={styles.controlLabel}>
                <Mono size="2xs">{copy.sortLabel}</Mono>
              </legend>
              <div className={styles.options}>
                {(
                  [
                    ["index", copy.sortIndex],
                    ["name", copy.sortName],
                    ["price-asc", copy.sortPriceAsc],
                    ["price-desc", copy.sortPriceDesc],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.chip}
                    aria-pressed={sort === value}
                    onClick={() => setSort(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend className={styles.controlLabel}>
                <Mono size="2xs">{copy.viewLabel}</Mono>
              </legend>
              <div className={styles.options}>
                {(
                  [
                    ["grid", copy.viewGrid],
                    ["index", copy.viewIndex],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={styles.chip}
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      </details>

      <div className={styles.status}>
        {/* Announced, so a filter change is perceivable without sight. */}
        <Mono size="2xs" className={styles.count} aria-live="polite">
          {copy.countLabel} {String(results.length).padStart(2, "0")} /{" "}
          {String(products.length).padStart(2, "0")}
        </Mono>
      </div>

      {results.length === 0 ? (
        <div className={styles.empty}>
          <Body tone="muted">{copy.empty}</Body>
          <button type="button" className={styles.reset} onClick={reset}>
            {copy.clear}
          </button>
        </div>
      ) : view === "grid" ? (
        /*
         * Staggered, not a centred row of three. The card architecture is
         * identical for every flagship, so the COMPOSITION carries the art
         * direction — a descending step gives the row a reading direction and
         * stops it resolving into three equal rectangles.
         *
         * The stagger drops while filtering: with one or two results a step
         * reads as a layout accident rather than as rhythm.
         */
        <div
          className={styles.grid}
          data-stagger={!filtered && results.length === products.length ? "true" : undefined}
        >
          {results.map((product) => (
            <div key={product.id} className={styles.cell}>
              <ProductCard
                slug={product.slug}
                world={product.world}
                worldLabel={product.worldLabel}
                areaId={product.areaId as never}
                eyebrow={product.categoryLabel}
                name={product.name}
                subtitle={product.subtitle}
                href={product.href}
                price={product.price}
                priceFrom={copy.from}
                presentationRange={product.range}
                presentations={product.presentations}
                index={product.index}
                ctaLabel={product.ctaLabel}
                /* The catalogue's h1 is the page title and these are the
                   content directly under it — h3 would skip a level. */
                headingLevel={2}
              />
            </div>
          ))}
        </div>
      ) : (
        <ul className={styles.index}>
          <CompoundIndexHead columns={[...copy.columns]} />
          {results.map((product) => (
            <CompoundRow
              key={product.id}
              index={product.index}
              world={product.world}
              worldLabel={product.worldLabel ?? product.categoryLabel}
              name={product.name}
              href={product.href}
              /* Real values now: category, the doses actually offered, and the
                 price where one is set. No placeholder columns. */
              fields={[
                { key: copy.columns[0], value: product.categoryLabel },
                { key: copy.columns[1], value: product.strengths },
                { key: copy.columns[2], value: product.price ?? copy.documentationPending },
              ]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
