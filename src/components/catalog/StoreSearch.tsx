"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/reducedMotion";

import { useUrlFilters } from "./useUrlFilters";
import styles from "./Storefront.module.css";

/**
 * THE STORE SEARCH — the catalogue's one search field, at the top of the store.
 *
 * It writes to the same URL state the catalogue browser reads (`?q=`), so the
 * results below answer as the visitor types. It is also a plain GET form:
 * before hydration, or without JavaScript, submitting it reloads the page with
 * `?q=` and the browser filters on arrival.
 *
 * "/" reaches it from anywhere on the page; Enter takes the visitor to the
 * results. While a query is typed the masthead steps aside (`SearchAware`),
 * and the first character brings the field up when the results would start
 * out of sight (`revealResults`).
 */
export function StoreSearch({
  label,
  placeholder,
  submit,
  resultsId,
}: {
  label: string;
  placeholder: string;
  submit: string;
  /** The results region to scroll to on Enter. */
  resultsId: string;
}) {
  const [filters, setFilters] = useUrlFilters();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

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
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <search>
      <form
        ref={form}
        className={styles.search}
        action=""
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          document
            .getElementById(resultsId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <label htmlFor={id} className={styles.srOnly}>
          {label}
        </label>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" />
        </svg>
        <input
          ref={input}
          id={id}
          name="q"
          type="search"
          value={filters.query}
          onChange={(event) => {
            const query = event.target.value;
            setFilters({ ...filters, query });
            if (!filters.query.trim() && query.trim()) revealResults(form.current, resultsId);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && filters.query) {
              event.preventDefault();
              setFilters({ ...filters, query: "" });
            }
          }}
          placeholder={placeholder}
          className={styles.searchInput}
          autoComplete="off"
          spellCheck={false}
          aria-keyshortcuts="/"
        />
        <button type="submit" className={styles.searchSubmit}>
          {submit}
        </button>
      </form>
    </search>
  );
}

/**
 * The merchandising sections step aside while a search is typed, so the
 * results sit directly under the field that asked for them. Everything else —
 * facets, sort, the view — leaves them in place: a facet click must never move
 * the panel it was made in.
 */
export function HideWhileSearching({ children }: { children: ReactNode }) {
  const [filters] = useUrlFilters();
  return <div hidden={filters.query.trim().length > 0 || undefined}>{children}</div>;
}

/**
 * The masthead, aware of the search (UX pass, 2026-10-07: "a user can type
 * while the matching products are not visible"). While a query is typed it
 * marks itself `data-searching`, and its stylesheet steps the merchandising
 * down — the signature strip and "see the whole catalogue" go; on a wide
 * screen the conditions of sale move beside the field — so the masthead is
 * the title and the field, and the results start right under them.
 */
export function SearchAware({ className, children }: { className?: string; children: ReactNode }) {
  const [filters] = useUrlFilters();
  return (
    <div className={className} data-searching={filters.query.trim() ? "" : undefined}>
      {children}
    </div>
  );
}

/**
 * The first character of a search brings the field to the top of the window
 * when the results would otherwise start below it — on a phone, with its
 * keyboard up, they always would. Only on that first character, and only if
 * needed: typing on never moves the page again.
 */
function revealResults(form: HTMLFormElement | null, resultsId: string) {
  requestAnimationFrame(() => {
    const results = document.getElementById(resultsId);
    if (!form || !results) return;
    const visible = window.visualViewport?.height ?? window.innerHeight;
    if (results.getBoundingClientRect().top < visible * 0.7) return;
    const header = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const top = window.scrollY + form.getBoundingClientRect().top - header - 12;
    window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  });
}
