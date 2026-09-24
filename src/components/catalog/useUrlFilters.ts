"use client";

import { useCallback, useMemo } from "react";

import { useUrlSearch } from "@/lib/useUrlSearch";

import { parseFilters, serializeFilters, type CatalogFilters } from "./filters";

/*
 * The catalogue's filters, read from and written to the query string. The
 * URL mechanics — server snapshot, `replaceState`, back-button sync — live in
 * `useUrlSearch`, shared with the research compendium.
 */
export function useUrlFilters(): [CatalogFilters, (next: CatalogFilters) => void] {
  const [search, setSearch] = useUrlSearch();
  const filters = useMemo(() => parseFilters(search), [search]);
  const setFilters = useCallback(
    (next: CatalogFilters) => setSearch(serializeFilters(next)),
    [setSearch],
  );
  return [filters, setFilters];
}
