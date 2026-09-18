"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { parseFilters, serializeFilters, type CatalogFilters } from "./filters";

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

export function useUrlFilters(): [CatalogFilters, (next: CatalogFilters) => void] {
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
