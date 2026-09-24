"use client";

import { useCallback, useSyncExternalStore } from "react";

/* ---- the URL is the filter state ----------------------------------------- *
 *
 * A filtered list is a link that can be shared, reloaded or reached with the
 * back button, so filters live in the query string, read through
 * `useSyncExternalStore`. The server snapshot is the empty string: the server
 * renders the complete, unfiltered list (indexable, and usable before
 * hydration), and the client applies the URL's filters immediately after.
 *
 * `replaceState`, not `pushState`: typing a search is not twelve history
 * entries. Shared by the catalogue and the research compendium, which each
 * parse the string into their own filter shape.
 */
const SEARCH_EVENT = "neogen:url-search";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(SEARCH_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(SEARCH_EVENT, onChange);
  };
}

/** The current `?query` string, and a setter that replaces it in place. */
export function useUrlSearch(): [string, (search: string) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const setSearch = useCallback((next: string) => {
    const query = next === "" || next === "?" ? "" : next.startsWith("?") ? next : `?${next}`;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query}${window.location.hash}`,
    );
    window.dispatchEvent(new Event(SEARCH_EVENT));
  }, []);
  return [search, setSearch];
}
