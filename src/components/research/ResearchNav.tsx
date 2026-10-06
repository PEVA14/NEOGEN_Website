"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { anchorSnapshot, parseAnchor, subscribeAnchor } from "./anchorStore";
import styles from "./ResearchNav.module.css";

export interface ResearchNavItem {
  key: string;
  href: string;
  title: string;
  body: string;
}

export interface ResearchNavCopy {
  label: string;
  menu: string;
  home: string;
  compounds: string;
  start: string;
  deeper: string;
  search: string;
  searchPlaceholder: string;
  submit: string;
  back: string;
}

/**
 * RESEARCH'S OWN NAVIGATION (architecture pass, 2026-10-05: "simple on the
 * surface, deep on demand").
 *
 * One quiet row under the site header on every Research page, so a reader
 * who arrives anywhere — a record from a search engine, a line, the
 * references — knows where they are and where they can go without having
 * seen the overview:
 *
 *   Inicio · Compuestos · Empezar aquí · Profundizar ▾      ← Volver a X   [buscar]
 *
 * On a phone it folds to "Investigación / <section> ▾" and a search button.
 * It is LOCAL orientation, not a second header: mono labels at the size the
 * record's index uses, a hairline below, not sticky. The current section is
 * marked by weight and an underline (`aria-current`), never by colour.
 *
 * "← Volver a X" is the compound being investigated (`anchorStore`), shown
 * on the deep pages a record leads to. It is an enhancement: without it the
 * row and the page's breadcrumb still say where the reader is.
 *
 * The menus are `<details>`: they open without script and with the keyboard;
 * script only closes them on a click elsewhere, on Escape and on navigation.
 */
export function ResearchNav({
  copy,
  home,
  compounds,
  start,
  deeper,
  deepPaths,
  returnPaths,
  searchAction,
}: {
  copy: ResearchNavCopy;
  home: string;
  compounds: string;
  start: string;
  /** The deeper layer's destinations, in order. */
  deeper: readonly ResearchNavItem[];
  /** Paths that belong to "Profundizar" (for its current state). */
  deepPaths: readonly string[];
  /** Paths where the way back to the compound is offered. */
  returnPaths: readonly string[];
  /** Where the search goes: the compounds index, filtered. */
  searchAction: string;
}) {
  const pathname = usePathname() ?? "";
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  const section: "home" | "compounds" | "start" | "deeper" | null =
    pathname === home
      ? "home"
      : under(compounds)
        ? "compounds"
        : under(start)
          ? "start"
          : deepPaths.some(under)
            ? "deeper"
            : null;
  const sectionLabel =
    section === "compounds"
      ? copy.compounds
      : section === "start"
        ? copy.start
        : section === "deeper"
          ? copy.deeper
          : copy.home;

  const raw = useSyncExternalStore(subscribeAnchor, anchorSnapshot, () => null);
  const anchor = parseAnchor(raw);
  /* The anchor was written in the language the record was read in; the way
     back follows the language the reader is in now (a language switch keeps
     the tab, and the record exists at the same path in both). */
  const backHref = anchor
    ? anchor.href.replace(/^\/[^/]+/, `/${pathname.split("/")[1] ?? ""}`)
    : null;
  const showBack = backHref !== null && backHref !== pathname && returnPaths.some(under);

  /* Menus close on navigation, on a click outside them and on Escape. */
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  }, [pathname]);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const onClick = (event: MouseEvent) => {
      node.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((d) => {
        if (!d.contains(event.target as Node)) d.open = false;
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const open = node.querySelector<HTMLDetailsElement>("details[open]");
      if (!open) return;
      open.open = false;
      open.querySelector("summary")?.focus();
    };
    document.addEventListener("click", onClick);
    node.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      node.removeEventListener("keydown", onKey);
    };
  }, []);

  const current = (key: typeof section) =>
    section === key ? (key === "home" ? ("page" as const) : ("true" as const)) : undefined;

  const deeperList = (
    <ul className={styles.items}>
      {deeper.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className={styles.item}
            aria-current={
              pathname === item.href.split("#")[0] && !item.href.includes("#") ? "page" : undefined
            }
          >
            <span className={styles.itemTitle}>{item.title}</span>
            <span className={styles.itemBody}>{item.body}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  const searchForm = (id: string) => (
    <form action={searchAction} method="get" role="search" className={styles.search}>
      <label htmlFor={id} className={styles.srOnly}>
        {copy.search}
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder={copy.searchPlaceholder}
        className={styles.searchInput}
        autoComplete="off"
      />
      <button type="submit" className={styles.searchSubmit}>
        {copy.submit}
      </button>
    </form>
  );

  return (
    <nav ref={root} aria-label={copy.menu} className={styles.nav}>
      <div className={styles.row}>
        {/* Wide: the four places, side by side. */}
        <ul className={styles.links}>
          <li>
            <Link href={home} className={styles.link} aria-current={current("home")}>
              {copy.home}
            </Link>
          </li>
          <li>
            <Link href={compounds} className={styles.link} aria-current={current("compounds")}>
              {copy.compounds}
            </Link>
          </li>
          <li>
            <Link href={start} className={styles.link} aria-current={current("start")}>
              {copy.start}
            </Link>
          </li>
          <li>
            <details className={styles.menu}>
              <summary className={styles.link} aria-current={current("deeper")}>
                {copy.deeper}
                <span className={styles.caret} aria-hidden="true" />
              </summary>
              <div className={styles.panel}>{deeperList}</div>
            </details>
          </li>
        </ul>

        {/* Narrow: one switcher, naming where the reader is. */}
        <details className={`${styles.menu} ${styles.compact}`}>
          <summary className={styles.link} aria-label={`${copy.menu}: ${sectionLabel}`}>
            <span>{copy.label}</span>
            <span className={styles.compactCurrent} aria-hidden="true">
              / {sectionLabel}
            </span>
            <span className={styles.caret} aria-hidden="true" />
          </summary>
          <div className={styles.panel}>
            <ul className={styles.items}>
              {(
                [
                  ["home", home, copy.home],
                  ["compounds", compounds, copy.compounds],
                  ["start", start, copy.start],
                ] as const
              ).map(([key, href, label]) => (
                <li key={key}>
                  <Link href={href} className={styles.item} aria-current={current(key)}>
                    <span className={styles.itemTitle}>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.panelLabel}>{copy.deeper}</p>
            {deeperList}
          </div>
        </details>

        {showBack && anchor && backHref ? (
          <Link href={backHref} className={styles.back}>
            <span aria-hidden="true">←</span> {copy.back.replace("{name}", anchor.name)}
          </Link>
        ) : null}

        {/* On the overview the search is the page's own first element; a
            second one here would only repeat it. */}
        {section === "home" ? null : (
          <>
            <div className={styles.searchWide}>{searchForm("research-nav-search")}</div>
            <details className={`${styles.menu} ${styles.searchNarrow}`}>
              <summary className={styles.searchToggle} aria-label={copy.search}>
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M12.5 12.5 17 17" />
                </svg>
              </summary>
              <div className={`${styles.panel} ${styles.searchPanel}`}>
                {searchForm("research-nav-search-narrow")}
              </div>
            </details>
          </>
        )}
      </div>
    </nav>
  );
}
