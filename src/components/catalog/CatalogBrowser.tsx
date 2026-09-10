"use client";

import { useMemo, useState } from "react";

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
  /** Dose summary — "5 mg · 10 mg · 15 mg". */
  strengths: string;
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
  sortLabel: string;
  sortIndex: string;
  sortName: string;
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

type View = "grid" | "index";
type Sort = "index" | "name";

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
      .sort((a, b) =>
        sort === "name" ? a.name.localeCompare(b.name) : a.index.localeCompare(b.index),
      );
  }, [products, query, category, area, sort]);

  const filtered = query.trim() !== "" || category !== "all" || area !== "all";

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

        <fieldset className={styles.group}>
          <legend className={styles.controlLabel}>
            <Mono size="2xs">{copy.filterLabel}</Mono>
          </legend>
          <div className={styles.options}>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={category === "all"}
              onClick={() => setCategory("all")}
            >
              {copy.filterAll}
            </button>
            {/* Categories, not products. With 86 products a per-product chip
                row would be the catalogue twice over. */}
            {categories.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.chip}
                aria-pressed={category === id}
                onClick={() => setCategory(id)}
              >
                {copy.categoryLabels[id] ?? id}
              </button>
            ))}
          </div>
        </fieldset>

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
                eyebrow={product.categoryLabel}
                name={product.name}
                subtitle={product.subtitle}
                href={product.href}
                price={product.price}
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
