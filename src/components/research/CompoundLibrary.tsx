"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  ViewTransition,
  type ReactNode,
  type Ref,
} from "react";

import { ValueRoll } from "@/components/motion/ValueRoll";
import { AreaMarks } from "@/components/ui/AreaMarks";
import { AreaScope, type AreaScopeLink } from "@/components/ui/AreaSignet";

import { prefersReducedMotion } from "@/lib/reducedMotion";
import { fold, foldIndex, matchesText } from "@/lib/search";
import { useUrlSearch } from "@/lib/useUrlSearch";

import { DepthMarks, type DepthMarksCopy, type RecordDepth } from "./DepthMarks";
import { QUICK_VIEWS, QuickRecord, type QuickRecordCopy, type QuickView } from "./QuickRecord";
import { RECORD_NAVIGATION, recordNames } from "./recordTransition";
import styles from "./CompoundLibrary.module.css";

import type { QuickRecordData } from "./quickRecordData";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface LibraryEntry {
  slug: string;
  name: string;
  alias: string | null;
  composition: string | null;
  type: string;
  areas: readonly { id: DiscoveryAreaId; label: string }[];
  lines: readonly { id: string; label: string; href: string }[];
  presentations: readonly string[];
  depth: RecordDepth | null;
  /** The first sourced statement of the record, verbatim, and which section it is from. */
  lead: { section: "mechanism" | "research"; text: string } | null;
  recordHref: string | null;
  productHref: string;
  /** A resolver-derived label ("1 documento público"), or null. */
  documentation: string | null;
}

export interface LibraryCopy {
  controls: {
    search: string;
    searchPlaceholder: string;
    area: string;
    areaAll: string;
    line: string;
    lineAll: string;
    record: string;
    clear: string;
    filters: string;
    results: string;
    result: string;
    empty: string;
    letters: string;
  };
  columns: { compound: string; areas: string; lines: string; record: string };
  depth: DepthMarksCopy & { refs: string };
  preview: {
    open: string;
    dialog: string;
    close: string;
    previous: string;
    next: string;
    position: string;
    identity: string;
    type: string;
    alias: string;
    composition: string;
    presentations: string;
    areas: string;
    lines: string;
    mechanism: string;
    research: string;
    sources: string;
    source: string;
    contents: string;
    record: string;
    product: string;
    noRecord: string;
    documentation: string;
    documentationNone: string;
    claims: string;
    claim: string;
    noRecordShort: string;
    productFrom: string;
  };
  quick: QuickRecordCopy;
}

/* The drawer's view in the URL, in the site's language. */
const VIEW_PARAM: Record<QuickView, string> = {
  overview: "resumen",
  evidence: "evidencia",
  safety: "seguridad",
  sources: "fuentes",
};

function viewFromParam(value: string | null): QuickView {
  return QUICK_VIEWS.find((v) => VIEW_PARAM[v] === value) ?? "overview";
}

interface Filters {
  q: string;
  area: string;
  line: string;
  record: boolean;
}

function parse(search: string): Filters {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q") ?? "",
    area: params.get("area") ?? "",
    line: params.get("linea") ?? "",
    record: params.get("registro") === "1",
  };
}

function serialize(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.area) params.set("area", filters.area);
  if (filters.line) params.set("linea", filters.line);
  if (filters.record) params.set("registro", "1");
  const out = params.toString();
  return out ? `?${out}` : "";
}

/** The index letter a name files under: its first letter, or "#" for a digit. */
function letterOf(name: string): string {
  const first = fold(name).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

/**
 * THE COMPENDIUM — every compound, scannable, openable in place.
 *
 * DENSITY WITHOUT CLUTTER. A competitor shows 132 cards at once and asks the
 * reader to scan a wall. Here the catalogue is an INDEX: one ruled line per
 * compound, filed under its letter like a printed reference, with four
 * columns a reader actually compares — name, area, what it is studied for,
 * and how much of a record exists (`DepthMarks`). Filters narrow it; the
 * letters jump through it.
 *
 * ONE RECORD, MANY MAGNIFICATIONS (motion pass 2). A compound is one object
 * seen closer and closer: a line in the index → the same line opened in
 * place into its Quick Record → the full record. Opening a name does not
 * open a window over the list; the row itself becomes the record — its name
 * grows into the title, a frame forms round it, the rows below make room —
 * and everything else stays where it was, a little quieter. Previous / next
 * walk the CURRENT results in place. From there the full record is the same
 * frame and title carried onto their own page (`recordTransition.ts`), and
 * the browser's back returns to the index with the record still open.
 *
 * A disclosure, not a modal: the name is a button-like link with
 * `aria-expanded`; Tab continues into the record; Escape closes it and
 * returns focus to the name; arrows step when focus is in the record.
 *
 * THE INDEX REORGANISES, IT DOES NOT REPLACE ITSELF. Filtering and search are
 * layout animations (Motion): rows that still match slide to their new places,
 * rows that do not are lifted out, letters close up. Nothing implies a
 * relationship — the order is A to Z, and it is the same order filtered.
 *
 * PROGRESSIVE. Each name is a real link to the record (or the product page,
 * for a compound with no record). Without JavaScript it navigates; with it, a
 * plain click opens the quick view and a modified click still opens a tab.
 *
 * THE DATA IS THIN AND ALREADY PUBLIC: labels, counts and one sourced sentence
 * per compound, resolved on the server. No registry reaches the browser.
 */
export function CompoundLibrary({
  entries,
  areas,
  lineGroups,
  copy,
  endpoint,
  areaScopes,
}: {
  entries: readonly LibraryEntry[];
  areas: readonly { id: string; label: string }[];
  lineGroups: readonly { label: string; lines: readonly { id: string; label: string }[] }[];
  copy: LibraryCopy;
  /** Where one compound's Quick Record is fetched: "/api/compendio/es/{slug}". */
  endpoint: string;
  /**
   * Each area as the index's scope once it is filtered to it (areas identity
   * pass): its signet and name, how many compounds it holds, and the way to
   * its products.
   */
  areaScopes?: Record<string, { name: string; detail: string; links: readonly AreaScopeLink[] }>;
}) {
  const [search, setSearch] = useUrlSearch();
  const filters = useMemo(() => parse(search), [search]);
  const update = (patch: Partial<Filters>) => setSearch(serialize({ ...filters, ...patch }));

  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchId = useId();
  const areaId = useId();
  const lineId = useId();
  const recordId = useId();
  const panelId = useId();

  /*
   * The list follows the controls a beat behind (`useDeferredValue`): the
   * field always takes the keystroke at once, and the index reorganises as
   * soon as it can — never the other way round.
   */
  const shown = useDeferredValue(filters);
  const results = useMemo(() => {
    const q = shown.q.trim();
    return entries.filter((entry) => {
      if (shown.area && !entry.areas.some((a) => a.id === shown.area)) return false;
      if (shown.line && !entry.lines.some((l) => l.id === shown.line)) return false;
      if (shown.record && !entry.recordHref) return false;
      if (!q) return true;
      return (
        matchesText(entry.name, q) ||
        (entry.alias ? matchesText(entry.alias, q) : false) ||
        (entry.composition ? matchesText(entry.composition, q) : false) ||
        entry.presentations.some((p) => fold(p).includes(fold(q))) ||
        entry.lines.some((l) => matchesText(l.label, q))
      );
    });
  }, [entries, shown]);

  const groups = useMemo(() => {
    const byLetter = new Map<string, LibraryEntry[]>();
    for (const entry of results) {
      const letter = letterOf(entry.name);
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), entry]);
    }
    return [...byLetter.entries()].sort(([a], [b]) =>
      a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b),
    );
  }, [results]);

  const narrowing = [filters.area, filters.line, filters.record ? "1" : ""].filter(Boolean).length;
  const filtered = narrowing > 0 || filters.q.trim() !== "";

  /* ---- the inspected record ------------------------------------------- */
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [view, setView] = useState<QuickView>("overview");
  const openIndex = openSlug ? results.findIndex((e) => e.slug === openSlug) : -1;
  const current = openIndex >= 0 ? results[openIndex] : null;
  const reduced = useReducedMotion();

  /*
   * THE RECORD BODY IS FETCHED, NOT SHIPPED. The index carries only what its
   * rows need; a compound's statements and sources arrive when it is opened
   * (a static JSON file per compound), are kept for the session, and the
   * neighbours are fetched behind it so previous / next is instant.
   */
  const [records, setRecords] = useState<Readonly<Record<string, QuickRecordData>>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const inflight = useRef(new Map<string, Promise<QuickRecordData | null>>());
  const fetchRecord = useCallback(
    (slug: string): Promise<QuickRecordData | null> => {
      const pending = inflight.current.get(slug);
      if (pending) return pending;
      const request = fetch(endpoint.replace("{slug}", encodeURIComponent(slug)))
        .then((r) => (r.ok ? (r.json() as Promise<QuickRecordData>) : null))
        .catch(() => null)
        .then((data) => {
          if (data) setRecords((prev) => ({ ...prev, [slug]: data }));
          else {
            inflight.current.delete(slug);
            setFailed(slug);
          }
          return data;
        });
      inflight.current.set(slug, request);
      return request;
    },
    [endpoint],
  );
  useEffect(() => {
    if (openSlug) void fetchRecord(openSlug);
  }, [openSlug, fetchRecord]);
  const record = current ? (records[current.slug] ?? null) : null;
  const status: "loading" | "ready" | "error" = record
    ? "ready"
    : current && failed === current.slug
      ? "error"
      : "loading";
  /* Prefetch the neighbours once the open record is in. */
  useEffect(() => {
    if (!record || openIndex < 0 || results.length < 2) return;
    for (const d of [1, -1]) {
      const neighbour = results[(openIndex + d + results.length) % results.length];
      if (neighbour.recordHref) void fetchRecord(neighbour.slug);
    }
  }, [record, openIndex, results, fetchRecord]);

  /*
   * DEEP LINKS. The open compound and view live in the URL (`?ficha=reta&
   * vista=fuentes`) through `replaceState`, so a Quick Record can be linked,
   * a reload reopens it, and the back button from the full record returns to
   * it open — without adding history entries for every step.
   */
  const writeUrl = (slug: string | null, v: QuickView) => {
    const params = new URLSearchParams(window.location.search);
    if (slug) {
      params.set("ficha", slug);
      if (v === "overview") params.delete("vista");
      else params.set("vista", VIEW_PARAM[v]);
    } else {
      params.delete("ficha");
      params.delete("vista");
    }
    const query = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  };

  /*
   * Keeping the reader's place. Stepping to a neighbour closes one record and
   * opens another; the new row is put back exactly where the old one was on
   * screen, so the frame seems to stay put while its contents change.
   */
  const anchor = useRef<{ slug: string; top: number } | null>(null);
  const rowOf = (slug: string) => document.getElementById(`row-${slug}`);
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a || a.slug !== openSlug) return;
    anchor.current = null;
    const row = rowOf(a.slug);
    if (row) window.scrollBy(0, row.getBoundingClientRect().top - a.top);
  }, [openSlug]);

  const open = (slug: string, v: QuickView = view) => {
    window.clearTimeout(closeTimer.current);
    setClosingSlug(null);
    setOpenSlug(slug);
    setView(v);
    writeUrl(slug, v);
  };
  /* Closing folds the record shut first (CSS, 240 ms), then removes it. */
  const [closingSlug, setClosingSlug] = useState<string | null>(null);
  const closeTimer = useRef(0);
  const close = useCallback((focus = true) => {
    const fold = !prefersReducedMotion();
    setOpenSlug((slug) => {
      if (slug && focus) {
        requestAnimationFrame(() =>
          document.getElementById(`compound-${slug}`)?.focus({ preventScroll: true }),
        );
      }
      if (slug && fold) {
        setClosingSlug(slug);
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => {
          setClosingSlug(null);
          setOpenSlug((now) => (now === slug ? null : now));
        }, 240);
        return slug;
      }
      return null;
    });
    writeUrl(null, "overview");
  }, []);
  const step = (delta: number) => {
    if (openIndex < 0 || results.length === 0) return;
    const next = results[(openIndex + delta + results.length) % results.length];
    const now = current ? rowOf(current.slug) : null;
    anchor.current = { slug: next.slug, top: now?.getBoundingClientRect().top ?? 0 };
    setOpenSlug(next.slug);
    writeUrl(next.slug, view);
  };
  const changeView = (v: QuickView) => {
    setView(v);
    if (openSlug) writeUrl(openSlug, v);
  };

  /* Open from the URL on arrival — a shared link, a reload, the back button
     from the full record, or a square of the hub's archive plate or a name in
     an area's roster — and bring that row into view. */
  const arrived = useRef(false);
  const arriving = useRef<string | null>(null);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("ficha");
    if (!slug || !entries.some((e) => e.slug === slug)) return;
    arriving.current = slug;
    requestAnimationFrame(() => {
      setOpenSlug(slug);
      setView(viewFromParam(params.get("vista")));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /*
   * ...ONLY ONCE THE LIST IS THE ONE THE URL ASKS FOR (owner, 2026-10-04:
   * clicking a square "you end up seeing the footer"). An arrival with an
   * area (`?area=…&ficha=…`) first renders the whole index — the URL is read
   * after hydration and the list follows a beat behind (`useDeferredValue`)
   * — so the row was measured where it stood among 85 compounds, the page
   * scrolled there, and the filtered list then collapsed under it to the
   * footer. Now the scroll waits for the filtered list to be on screen with
   * the record open, and measures the row's layout position, not its
   * position mid-reorganisation (Motion moves rows with transforms).
   */
  useEffect(() => {
    const slug = arriving.current;
    if (!slug || shown !== filters || openSlug !== slug) return;
    if (!results.some((e) => e.slug === slug)) return;
    const frame = requestAnimationFrame(() => {
      const row = rowOf(slug);
      if (!row) return;
      arriving.current = null;
      let top = 0;
      for (let el: HTMLElement | null = row; el; el = el.offsetParent as HTMLElement | null) {
        top += el.offsetTop;
      }
      const header = parseFloat(getComputedStyle(row).scrollMarginTop) || 96;
      window.scrollTo({ top: Math.max(0, top - header) });
    });
    return () => cancelAnimationFrame(frame);
  }, [shown, filters, openSlug, results]);

  /* A filter that removes the open compound simply hides it (`current` is
     null); clearing the filter brings the same record back open. */

  const fill = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));

  /* Where the query lands in a name, for marking it — the reader sees why. */
  const q = shown.q.trim();

  /* Every letter of the alphabet, present or not: where the results fall. */
  const present = new Set(groups.map(([letter]) => letter));
  const layoutTransition = reduced ? NO_MOTION : LAYOUT;

  /* One stable toggle for every row, so a closed row never re-renders for
     another row's sake. */
  const latest = useRef({ open, close, openSlug, closingSlug });
  useEffect(() => {
    latest.current = { open, close, openSlug, closingSlug };
  });
  const toggle = useCallback((slug: string) => {
    const l = latest.current;
    if (l.openSlug === slug && l.closingSlug !== slug) l.close(false);
    else l.open(slug);
  }, []);

  /* The record opened in place: its frame, head, Quick Record and actions. */
  const inspectFor = (entry: LibraryEntry) => (
    <ViewTransition name={recordNames(entry.slug).frame} share="vt-record-frame" default="none">
      <div className={styles.inspectFrame}>
        <header className={styles.inspectHead}>
          <p className={styles.sheetEyebrow}>
            <AreaMarks areas={entry.areas.map((a) => a.id)} />
            {[entry.type, ...entry.areas.map((a) => a.label)].join(" · ")}
          </p>
          {entry.composition && !entry.alias ? (
            <p className={styles.sheetAlias}>{entry.composition}</p>
          ) : null}
          {/* The evidence strip: how much sourced science exists. */}
          <p className={styles.strip}>
            {entry.depth ? (
              <>
                <span>
                  {entry.depth.mechanism + entry.depth.research === 1
                    ? copy.preview.claim
                    : fill(copy.preview.claims, {
                        n: entry.depth.mechanism + entry.depth.research,
                      })}
                </span>
                <span>
                  {entry.depth.references === 1
                    ? copy.preview.source
                    : fill(copy.preview.sources, { n: entry.depth.references })}
                </span>
                {record?.record?.span ? (
                  <span>
                    {record.record.span[0] === record.record.span[1]
                      ? record.record.span[0]
                      : `${record.record.span[0]}–${record.record.span[1]}`}
                  </span>
                ) : null}
              </>
            ) : (
              <span>{copy.preview.noRecordShort}</span>
            )}
          </p>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => close()}
            aria-label={copy.preview.close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div
          className={styles.inspectBody}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
              return;
            }
            if (event.defaultPrevented) return;
            const target = event.target as HTMLElement;
            if (target.closest("[role=tablist], input, select, textarea")) return;
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
          }}
        >
          <QuickRecord
            key={entry.slug}
            data={record}
            status={status}
            view={view}
            onView={changeView}
            studiedIn={{ areas: entry.areas, lines: entry.lines }}
            onRetry={() => {
              setFailed(null);
              void fetchRecord(entry.slug);
            }}
            copy={copy.quick}
          />
        </div>

        <footer
          className={styles.sheetFoot}
          data-record={entry.recordHref ? "true" : "false"}
          data-stepper={results.length > 1 ? "true" : "false"}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          {entry.recordHref ? (
            <Link
              href={entry.recordHref}
              className={`${styles.primary} ${styles.footRecord}`}
              transitionTypes={[RECORD_NAVIGATION]}
            >
              {copy.preview.record}
              <span aria-hidden="true">→</span>
            </Link>
          ) : null}
          <Link
            href={entry.productHref}
            className={`${entry.recordHref ? styles.secondary : styles.primary} ${styles.footProduct}`}
          >
            <span>
              {copy.preview.product}
              {record?.product.from ? (
                <span className={styles.from}>
                  {fill(copy.preview.productFrom, { price: record.product.from })}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          {results.length > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.stepButton} ${styles.footPrev}`}
                onClick={() => step(-1)}
                aria-label={copy.preview.previous}
              >
                <span aria-hidden="true">←</span>
              </button>
              <span className={styles.position}>
                {fill(copy.preview.position, { i: openIndex + 1, n: results.length })}
              </span>
              <button
                type="button"
                className={`${styles.stepButton} ${styles.footNext}`}
                onClick={() => step(1)}
                aria-label={copy.preview.next}
              >
                <span aria-hidden="true">→</span>
              </button>
            </>
          ) : null}
        </footer>
      </div>
    </ViewTransition>
  );

  return (
    /* Filtered to an area, the index takes that area as its context colour:
       the count, the filter and the letters read in it (color pass). */
    <div className={styles.library} data-area={filters.area || undefined}>
      {/* ---- controls ---------------------------------------------------- */}
      <div className={styles.controls}>
        <div className={styles.searchField}>
          <label htmlFor={searchId} className={styles.label}>
            {copy.controls.search}
          </label>
          <input
            id={searchId}
            type="search"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            placeholder={copy.controls.searchPlaceholder}
            className={styles.input}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <button
          type="button"
          className={styles.filtersToggle}
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {copy.controls.filters}
          {narrowing > 0 ? ` (${narrowing})` : ""}
          <span aria-hidden="true" className={styles.chevron} />
        </button>

        <div id={panelId} className={styles.panel} data-open={filtersOpen ? "true" : undefined}>
          <div className={styles.field}>
            <label htmlFor={areaId} className={styles.label}>
              {copy.controls.area}
            </label>
            <select
              id={areaId}
              value={filters.area}
              onChange={(event) => update({ area: event.target.value })}
              className={styles.select}
              data-filter="area"
            >
              <option value="">{copy.controls.areaAll}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={lineId} className={styles.label}>
              {copy.controls.line}
            </label>
            <select
              id={lineId}
              value={filters.line}
              onChange={(event) => update({ line: event.target.value })}
              className={styles.select}
            >
              <option value="">{copy.controls.lineAll}</option>
              {lineGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className={styles.check}>
            <input
              id={recordId}
              type="checkbox"
              checked={filters.record}
              onChange={(event) => update({ record: event.target.checked })}
              className={styles.checkbox}
            />
            <label htmlFor={recordId}>{copy.controls.record}</label>
          </div>
          {filtered ? (
            <button type="button" className={styles.clear} onClick={() => setSearch("")}>
              {copy.controls.clear}
            </button>
          ) : null}
        </div>
      </div>

      {/* ---- the area, arriving ------------------------------------------- */}
      {filters.area && areaScopes?.[filters.area] ? (
        <AreaScope
          key={filters.area}
          className={styles.scope}
          areas={[filters.area as DiscoveryAreaId]}
          name={areaScopes[filters.area].name}
          detail={areaScopes[filters.area].detail}
          links={areaScopes[filters.area].links}
        />
      ) : null}

      {/* ---- count and letters ------------------------------------------- */}
      <div className={styles.status}>
        <p className={styles.count} aria-live="polite">
          <span className={styles.srOnly}>
            {results.length === 1
              ? copy.controls.result
              : fill(copy.controls.results, { n: results.length })}
          </span>
          {/* The figure rolls to the new count, in the direction it moved. */}
          <span aria-hidden="true">
            <ValueRoll value={String(results.length).padStart(2, "0")} />{" "}
            {(results.length === 1 ? copy.controls.result : copy.controls.results)
              .replace("{n}", "")
              .replace(/^1\s*/, "")
              .trim()}
          </span>
        </p>
        {results.length > 0 ? (
          <nav aria-label={copy.controls.letters} className={styles.letters}>
            <ul>
              {ALPHABET.map((letter) =>
                present.has(letter) ? (
                  <li key={letter}>
                    <a href={`#letra-${letter === "#" ? "0" : letter.toLowerCase()}`}>{letter}</a>
                  </li>
                ) : (
                  /* A letter with nothing filed under it now: kept in its
                     place, so the alphabet itself shows where results fall. */
                  <li key={letter} aria-hidden="true">
                    <span className={styles.absent}>{letter}</span>
                  </li>
                ),
              )}
            </ul>
          </nav>
        ) : null}
      </div>

      {/* ---- the index --------------------------------------------------- */}
      {results.length === 0 ? (
        <p className={styles.empty}>{copy.controls.empty}</p>
      ) : (
        <div className={styles.index} data-inspecting={current ? "true" : undefined}>
          <div className={styles.head} aria-hidden="true">
            <span>{copy.columns.compound}</span>
            <span>{copy.columns.areas}</span>
            <span>{copy.columns.lines}</span>
            <span>{copy.columns.record}</span>
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map(([letter, items]) => (
              <motion.section
                layout="position"
                transition={layoutTransition}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.14 } }}
                key={letter}
                className={styles.group}
                id={`letra-${letter === "#" ? "0" : letter.toLowerCase()}`}
                aria-labelledby={`letra-${letter === "#" ? "0" : letter.toLowerCase()}-h`}
              >
                <h2
                  className={styles.letter}
                  id={`letra-${letter === "#" ? "0" : letter.toLowerCase()}-h`}
                >
                  {letter}
                </h2>
                <ul className={styles.rows}>
                  <AnimatePresence initial={false} mode="popLayout">
                    {items.map((entry) => (
                      <LibraryRow
                        key={entry.slug}
                        entry={entry}
                        q={q}
                        copy={copy}
                        reduced={!!reduced}
                        onToggle={toggle}
                        inspect={current?.slug === entry.slug ? inspectFor(entry) : null}
                        closing={closingSlug === entry.slug}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

/* Layout transitions: quick, settled, never in the reader's way. */
const LAYOUT = { type: "spring" as const, stiffness: 420, damping: 42, mass: 0.9 };
const NO_MOTION = { duration: 0 };
const fillTemplate = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));

/**
 * One line of the index — memoised, so a keystroke or another row opening
 * re-renders only the rows whose own state changed. `inspect` is the record
 * opened in place, given only to the open row.
 */
const LibraryRow = memo(function LibraryRow({
  entry,
  q,
  copy,
  reduced,
  onToggle,
  inspect,
  closing,
  ref,
}: {
  entry: LibraryEntry;
  q: string;
  copy: LibraryCopy;
  reduced: boolean;
  onToggle: (slug: string) => void;
  inspect: ReactNode | null;
  /** The open record is folding shut (its last 240 ms). */
  closing: boolean;
  ref?: Ref<HTMLLIElement>;
}) {
  const isOpen = inspect !== null;
  const panelId = `inspect-${entry.slug}`;
  const transition = reduced ? NO_MOTION : LAYOUT;
  const at = q ? foldIndex(entry.name, q) : null;
  const name = at ? (
    <>
      {entry.name.slice(0, at[0])}
      <mark className={styles.match}>{entry.name.slice(at[0], at[1])}</mark>
      {entry.name.slice(at[1])}
    </>
  ) : (
    entry.name
  );
  const title = (
    <motion.span layout transition={transition} className={styles.nameText}>
      {name}
    </motion.span>
  );
  return (
    <motion.li
      ref={ref}
      layout="position"
      transition={transition}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.12 } }}
      id={`row-${entry.slug}`}
      className={styles.row}
      /* Its first area is its context colour, carried into the record it
         opens and on to the full record (one record, many magnifications). */
      data-area={entry.areas[0]?.id}
      data-open={isOpen ? "true" : undefined}
      data-symbol-host=""
    >
      <Link
        id={`compound-${entry.slug}`}
        href={entry.recordHref ?? entry.productHref}
        className={styles.name}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          onToggle(entry.slug);
        }}
      >
        {/* The name IS the record's title: it grows when the row opens, and
            travels on to the record. */}
        {isOpen ? (
          <ViewTransition
            name={recordNames(entry.slug).title}
            share="vt-record-title"
            default="none"
          >
            {title}
          </ViewTransition>
        ) : (
          title
        )}
        {entry.alias ? <span className={styles.alias}>{entry.alias}</span> : null}
      </Link>
      <span className={styles.cellAreas}>
        <AreaMarks areas={entry.areas.map((a) => a.id)} />
        <span>{entry.areas.map((a) => a.label).join(" · ") || "—"}</span>
      </span>
      <span className={styles.cellLines}>
        {entry.lines.length === 0
          ? "—"
          : `${entry.lines
              .slice(0, 2)
              .map((l) => l.label)
              .join(" · ")}${entry.lines.length > 2 ? ` +${entry.lines.length - 2}` : ""}`}
      </span>
      <span className={styles.cellRecord}>
        <DepthMarks depth={entry.depth} copy={copy.depth} />
        {entry.depth ? (
          <span className={styles.refs}>
            {fillTemplate(copy.depth.refs, { n: entry.depth.references })}
          </span>
        ) : null}
      </span>

      {/* ---- the record, opened in place ---------------------------------- */}
      {/* The panel opens and closes in CSS (`@starting-style`, grid rows), so
          the layout engine is not re-measuring the whole index every frame. */}
      {isOpen ? (
        <div
          id={panelId}
          role="region"
          aria-label={fillTemplate(copy.preview.dialog, { name: entry.name })}
          className={styles.inspect}
          data-closing={closing ? "true" : undefined}
        >
          <div className={styles.inspectInner}>{inspect}</div>
        </div>
      ) : null}
    </motion.li>
  );
});
