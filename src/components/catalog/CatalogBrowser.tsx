"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Body, Mono } from "@/components/typography";
import { ProductCard, type CardDetailsCopy } from "@/components/ui";

import {
  activeFilterCount,
  applyFilters,
  clearFilters,
  facetOptions,
  facetVisible,
  flagCounts,
  flagVisible,
  parseFilters,
  priceBounds,
  serializeFilters,
  toggleValue,
  FLAG_FACETS,
  type CatalogFilters,
  type CatalogProduct,
  type FacetOption,
  type FlagFacet,
  type ListFacet,
  type Sort,
} from "./filters";
import { RegisterMatrix, type RegisterMatrixCopy } from "./RegisterMatrix";
import styles from "./CatalogBrowser.module.css";

export type { CatalogProduct } from "./filters";

export interface CatalogCopy {
  searchLabel: string;
  searchPlaceholder: string;
  searchClear: string;
  categoryLabels: Record<string, string>;
  from: string;
  sortLabel: string;
  sortIndex: string;
  sortName: string;
  sortNameDesc: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortPresentations: string;
  filtersApplied: string;
  filterApplied: string;
  viewLabel: string;
  viewGrid: string;
  viewIndex: string;
  countLabel: string;
  empty: string;
  clear: string;
  matrix: RegisterMatrixCopy;
  facets: {
    hide: string;
    show: string;
    heading: string;
    area: string;
    alsoIn: string;
    category: string;
    type: string;
    format: string;
    vials: string;
    availability: string;
    price: string;
    priceMin: string;
    priceMax: string;
    selection: string;
    flagship: string;
    documented: string;
    photographed: string;
    formats: Record<string, string>;
    vialsValue: string;
    active: string;
    remove: string;
    clearAll: string;
    showResults: string;
    showResult: string;
  };
  areaLabels: Record<string, string>;
  typeLabels: Record<string, string>;
  availabilityLabels: Record<string, string>;
  card: CardDetailsCopy;
}

/* ---- the URL is the filter state ----------------------------------------- *
 *
 * Filters live in the query string, read through `useSyncExternalStore`, so a
 * filtered catalogue is a link that can be shared, reloaded or reached with the
 * back button. The server snapshot is the empty string: the server renders the
 * complete, unfiltered list (indexable, and usable before hydration), and the
 * client applies the URL's filters immediately after.
 *
 * `replaceState`, not `pushState`: typing a search is not twelve history
 * entries.
 */
const FILTER_EVENT = "neogen:catalog-filters";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(FILTER_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(FILTER_EVENT, onChange);
  };
}

function useUrlFilters(): [CatalogFilters, (next: CatalogFilters) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const filters = useMemo(() => parseFilters(search), [search]);
  const setFilters = useCallback((next: CatalogFilters) => {
    const url = `${window.location.pathname}${serializeFilters(next)}${window.location.hash}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(FILTER_EVENT));
  }, []);
  return [filters, setFilters];
}

function useMediaQuery(query: string): boolean {
  const subscribeQuery = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribeQuery,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const FORMAT_ORDER = ["solid", "solution", "volume", "iu", "blend"];
const AVAILABILITY_ORDER = ["in-stock", "made-to-order", "unavailable"];

/**
 * THE CATALOGUE BROWSER — faceted search over the published catalogue, and
 * over one area when an area page scopes it.
 *
 * WHAT IT FILTERS ON IS WHAT THE REGISTRY HOLDS: search (names in both
 * languages, classification, strengths), area, classification, product type,
 * format, price range, pack size, flagship — and, the
 * moment their data exists, availability, public documentation and
 * photography. A facet that cannot discriminate in the current scope is not
 * rendered: Materials, three solvents in one format, shows no format filter.
 *
 * COUNTS ARE DISJUNCTIVE (see `filters.ts`): each option shows how many results
 * it would give with the other filters applied, and an option that would give
 * none is disabled rather than hidden, so the facet keeps its shape.
 *
 * THE PANEL CAN BE PUT AWAY. On a wide screen a toolbar button hides the
 * sidebar and gives its column to the results; the active filters stay applied
 * and stay visible as chips, and the button states how many there are. The
 * choice lasts for the visit, not the URL — it changes the view, not the result.
 *
 * LAYOUT. On a wide screen the facets are a sidebar beside the results. Below
 * 64rem they collapse behind one disclosure stating how many filters are
 * active, so products start immediately on a phone. A `<details>` element: it
 * works before hydration and needs no focus trap.
 */
export function CatalogBrowser({
  products,
  copy,
  localeTag,
  areaFacet = "area",
  areaOrder,
  cardHeadingLevel = 2,
}: {
  products: readonly CatalogProduct[];
  copy: CatalogCopy;
  /** Full BCP-47 tag, for formatting the price range. */
  localeTag: string;
  /** On an area page the area facet reads "Also in" and omits the area itself. */
  areaFacet?: "area" | "alsoIn";
  /** Area ids in display order — on an area page, the OTHER areas. */
  areaOrder: readonly string[];
  cardHeadingLevel?: 2 | 3;
}) {
  const [filters, setFilters] = useUrlFilters();
  const wide = useMediaQuery("(min-width: 64rem)");
  const searchId = useId();
  const sortId = useId();
  const sheetId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [panelHidden, setPanelHidden] = useState(false);

  const results = useMemo(() => applyFilters(products, filters), [products, filters]);
  const active = activeFilterCount(filters);
  const bounds = useMemo(() => priceBounds(products), [products]);
  const money = useMemo(
    () =>
      new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }),
    [localeTag],
  );
  const categoryOrder = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);

  const listFacets: { facet: ListFacet; legend: string; order?: readonly string[] }[] = [
    { facet: "area", legend: copy.facets[areaFacet], order: areaOrder },
    { facet: "category", legend: copy.facets.category, order: categoryOrder },
    { facet: "type", legend: copy.facets.type, order: Object.keys(copy.typeLabels) },
    { facet: "format", legend: copy.facets.format, order: FORMAT_ORDER },
    { facet: "vials", legend: copy.facets.vials },
    { facet: "availability", legend: copy.facets.availability, order: AVAILABILITY_ORDER },
  ];

  const labelFor = (facet: ListFacet, value: string): string => {
    switch (facet) {
      case "area":
        return copy.areaLabels[value] ?? value;
      case "category":
        return copy.categoryLabels[value] ?? value;
      case "type":
        return copy.typeLabels[value] ?? value;
      case "format":
        return copy.facets.formats[value] ?? value;
      case "vials":
        return copy.facets.vialsValue.replace("{n}", value);
      case "availability":
        return copy.availabilityLabels[value] ?? value;
    }
  };
  const flagLabel: Record<FlagFacet, string> = {
    flagship: copy.facets.flagship,
    documented: copy.facets.documented,
    photographed: copy.facets.photographed,
  };

  const groups = listFacets
    .map((group) => ({
      ...group,
      options: facetOptions(products, filters, group.facet, group.order),
    }))
    .filter((group) => facetVisible(group.options));
  const flags = FLAG_FACETS.map((flag) => ({
    flag,
    ...flagCounts(products, filters, flag),
  })).filter((f) => flagVisible(f));

  /* The active filters, as removable chips. */
  const chips: { key: string; label: string; remove: CatalogFilters }[] = [
    ...(filters.query.trim()
      ? [{ key: "q", label: `“${filters.query.trim()}”`, remove: { ...filters, query: "" } }]
      : []),
    ...listFacets.flatMap(({ facet }) =>
      filters.lists[facet].map((value) => ({
        key: `${facet}:${value}`,
        label: labelFor(facet, value),
        remove: toggleValue(filters, facet, value),
      })),
    ),
    ...FLAG_FACETS.filter((flag) => filters.flags[flag]).map((flag) => ({
      key: flag,
      label: flagLabel[flag],
      remove: { ...filters, flags: { ...filters.flags, [flag]: false } },
    })),
    ...(filters.priceMin !== null || filters.priceMax !== null
      ? [
          {
            key: "price",
            label: `${money.format(filters.priceMin ?? bounds?.min ?? 0)} – ${money.format(
              filters.priceMax ?? bounds?.max ?? 0,
            )}`,
            remove: { ...filters, priceMin: null, priceMax: null },
          },
        ]
      : []),
  ];

  const sorts: [Sort, string][] = [
    ["index", copy.sortIndex],
    ["name", copy.sortName],
    ["name-desc", copy.sortNameDesc],
    ["price-asc", copy.sortPriceAsc],
    ["price-desc", copy.sortPriceDesc],
    ["presentations", copy.sortPresentations],
  ];

  const showLabel =
    results.length === 1
      ? copy.facets.showResult
      : copy.facets.showResults.replace("{n}", String(results.length));
  const clearAll = () => setFilters(clearFilters(filters));

  /* "/" focuses the search from anywhere on the page, unless the reader is typing. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.browser}>
      {/*
       * THE SEARCH FIELD — quiet, and precise. One hairline field with the
       * result count at its edge, a clear control once there is a query, and
       * "/" to reach it from anywhere on the page.
       */}
      <search className={styles.search}>
        <label htmlFor={searchId} className={styles.controlLabel}>
          <Mono size="2xs">{copy.searchLabel}</Mono>
        </label>
        <div className={styles.searchField}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" />
          </svg>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Escape" && filters.query) {
                event.preventDefault();
                setFilters({ ...filters, query: "" });
              }
            }}
            placeholder={copy.searchPlaceholder}
            className={styles.searchInput}
            autoComplete="off"
            spellCheck={false}
            aria-keyshortcuts="/"
          />
          {filters.query ? (
            <button
              type="button"
              className={styles.searchClear}
              aria-label={copy.searchClear}
              onClick={() => {
                setFilters({ ...filters, query: "" });
                searchRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : (
            <kbd className={styles.searchKey} aria-hidden="true">
              /
            </kbd>
          )}
          {/* The toolbar count below is the announced one; this is its echo, for the eye. */}
          <span className={styles.searchCount} aria-hidden="true">
            {String(results.length).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </span>
        </div>
      </search>

      <div className={styles.layout} data-panel={panelHidden ? "hidden" : undefined}>
        <details id={sheetId} className={styles.sheet} open={wide || undefined}>
          <summary>
            <span>{copy.facets.heading}</span>
            {active > 0 ? (
              <span>
                {active} {active === 1 ? copy.filterApplied : copy.filtersApplied}
              </span>
            ) : null}
          </summary>

          <div className={styles.panel}>
            {groups.map((group) => (
              <FacetGroup
                key={group.facet}
                legend={group.legend}
                options={group.options}
                selected={filters.lists[group.facet]}
                label={(value) => labelFor(group.facet, value)}
                onToggle={(value) => setFilters(toggleValue(filters, group.facet, value))}
              />
            ))}

            {bounds ? (
              <PriceRange
                legend={copy.facets.price}
                minLabel={copy.facets.priceMin}
                maxLabel={copy.facets.priceMax}
                bounds={bounds}
                min={filters.priceMin}
                max={filters.priceMax}
                format={(n) => money.format(n)}
                onChange={(priceMin, priceMax) => setFilters({ ...filters, priceMin, priceMax })}
              />
            ) : null}

            {flags.length > 0 ? (
              <fieldset className={styles.group}>
                <legend className={styles.legend}>
                  <Mono size="2xs">{copy.facets.selection}</Mono>
                </legend>
                <ul className={styles.optionList}>
                  {flags.map(({ flag, count }) => (
                    <li key={flag}>
                      <label className={styles.option} data-empty={count === 0 || undefined}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={filters.flags[flag]}
                          disabled={count === 0 && !filters.flags[flag]}
                          onChange={() =>
                            setFilters({
                              ...filters,
                              flags: { ...filters.flags, [flag]: !filters.flags[flag] },
                            })
                          }
                        />
                        <span className={styles.optionLabel}>{flagLabel[flag]}</span>
                        <span className={styles.optionCount}>{String(count).padStart(2, "0")}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}

            {active > 0 ? (
              <button type="button" className={styles.reset} onClick={clearAll}>
                {copy.facets.clearAll}
              </button>
            ) : null}

            {/* On a phone the panel ends in a way back to the results it narrowed. */}
            <a href="#catalog-results" className={styles.showResults}>
              {showLabel}
            </a>
          </div>
        </details>

        <div className={styles.results} id="catalog-results">
          <div className={styles.toolbar}>
            {/* Announced, so a filter change is perceivable without sight. */}
            <Mono size="2xs" className={styles.count} aria-live="polite">
              {copy.countLabel} {String(results.length).padStart(2, "0")} /{" "}
              {String(products.length).padStart(2, "0")}
            </Mono>

            <div className={styles.toolbarControls}>
              {/* Wide screens only — below 64rem the panel is already a disclosure. */}
              <button
                type="button"
                className={`${styles.chip} ${styles.panelToggle}`}
                aria-controls={sheetId}
                aria-expanded={!panelHidden}
                onClick={() => setPanelHidden((hidden) => !hidden)}
              >
                {panelHidden ? copy.facets.show : copy.facets.hide}
                {panelHidden && active > 0 ? ` (${active})` : null}
              </button>

              <div className={styles.select}>
                <label htmlFor={sortId} className={styles.controlLabel}>
                  <Mono size="2xs">{copy.sortLabel}</Mono>
                </label>
                <select
                  id={sortId}
                  value={filters.sort}
                  onChange={(event) => setFilters({ ...filters, sort: event.target.value as Sort })}
                  className={styles.selectInput}
                >
                  {sorts.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

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
                      aria-pressed={filters.view === value}
                      onClick={() => setFilters({ ...filters, view: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          {chips.length > 0 ? (
            <div className={styles.active}>
              <Mono size="2xs" className={styles.controlLabel}>
                {copy.facets.active}
              </Mono>
              <ul className={styles.chipList}>
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type="button"
                      className={styles.activeChip}
                      onClick={() => setFilters(chip.remove)}
                      aria-label={`${copy.facets.remove}: ${chip.label}`}
                    >
                      {chip.label}
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" className={styles.clearLink} onClick={clearAll}>
                    {copy.facets.clearAll}
                  </button>
                </li>
              </ul>
            </div>
          ) : null}

          {results.length === 0 ? (
            <div className={styles.empty}>
              <Body tone="muted">{copy.empty}</Body>
              <button type="button" className={styles.reset} onClick={clearAll}>
                {copy.clear}
              </button>
            </div>
          ) : filters.view === "grid" ? (
            <div className={styles.grid}>
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
                    headingLevel={cardHeadingLevel}
                    details={product.details}
                    detailsCopy={copy.card}
                  />
                </div>
              ))}
            </div>
          ) : (
            <RegisterMatrix products={results} copy={copy.matrix} localeTag={localeTag} />
          )}
        </div>
      </div>
    </div>
  );
}

function FacetGroup({
  legend,
  options,
  selected,
  label,
  onToggle,
}: {
  legend: string;
  options: readonly FacetOption[];
  selected: readonly string[];
  label: (value: string) => string;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        <Mono size="2xs">{legend}</Mono>
      </legend>
      <ul className={styles.optionList}>
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <li key={option.value}>
              <label className={styles.option} data-empty={option.count === 0 || undefined}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={checked}
                  disabled={option.count === 0 && !checked}
                  onChange={() => onToggle(option.value)}
                />
                <span className={styles.optionLabel}>{label(option.value)}</span>
                <span className={styles.optionCount}>{String(option.count).padStart(2, "0")}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/**
 * PRICE — two native range inputs over the scope's real price span.
 *
 * Native sliders, so keyboard steps, screen-reader values and touch work
 * without a library. A handle dragged back to the edge of the span is stored
 * as "no bound", so it removes the filter instead of leaving one that excludes
 * nothing.
 */
function PriceRange({
  legend,
  minLabel,
  maxLabel,
  bounds,
  min,
  max,
  format,
  onChange,
}: {
  legend: string;
  minLabel: string;
  maxLabel: string;
  bounds: { min: number; max: number };
  min: number | null;
  max: number | null;
  format: (n: number) => string;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const low = Math.max(bounds.min, Math.min(min ?? bounds.min, bounds.max));
  const high = Math.min(bounds.max, Math.max(max ?? bounds.max, bounds.min));
  const step = bounds.max - bounds.min > 5000 ? 100 : 50;
  const normalise = (value: number, edge: number) => (value === edge ? null : value);

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        <Mono size="2xs">{legend}</Mono>
      </legend>
      <p className={styles.priceValues} aria-hidden="true">
        {format(low)} – {format(high)}
      </p>
      <div className={styles.range}>
        <label htmlFor={minId} className={styles.rangeLabel}>
          <Mono size="2xs">{minLabel}</Mono>
        </label>
        <input
          id={minId}
          type="range"
          className={styles.rangeInput}
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={low}
          aria-valuetext={format(low)}
          onChange={(event) => {
            const value = Math.min(Number(event.target.value), high);
            onChange(normalise(value, bounds.min), normalise(high, bounds.max));
          }}
        />
      </div>
      <div className={styles.range}>
        <label htmlFor={maxId} className={styles.rangeLabel}>
          <Mono size="2xs">{maxLabel}</Mono>
        </label>
        <input
          id={maxId}
          type="range"
          className={styles.rangeInput}
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={high}
          aria-valuetext={format(high)}
          onChange={(event) => {
            const value = Math.max(Number(event.target.value), low);
            onChange(normalise(low, bounds.min), normalise(value, bounds.max));
          }}
        />
      </div>
    </fieldset>
  );
}
