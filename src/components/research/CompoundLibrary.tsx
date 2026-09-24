"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { fold, matchesText } from "@/lib/search";
import { useUrlSearch } from "@/lib/useUrlSearch";

import { DepthMarks, type DepthMarksCopy, type RecordDepth } from "./DepthMarks";
import styles from "./CompoundLibrary.module.css";

export interface LibraryEntry {
  slug: string;
  name: string;
  alias: string | null;
  composition: string | null;
  type: string;
  areas: readonly { id: string; label: string }[];
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
  };
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
 * THE QUICK VIEW. Opening a name shows its record in a sheet — the identity,
 * the first sourced statement verbatim, what the full record contains — with
 * previous/next through the CURRENT results, so a reader can walk a filtered
 * list without losing their place. It is a native `<dialog>`: focus is trapped
 * and restored, Escape closes it, and the page behind is inert. On a phone the
 * same element is a bottom sheet.
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
}: {
  entries: readonly LibraryEntry[];
  areas: readonly { id: string; label: string }[];
  lineGroups: readonly { label: string; lines: readonly { id: string; label: string }[] }[];
  copy: LibraryCopy;
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

  const results = useMemo(() => {
    const q = filters.q.trim();
    return entries.filter((entry) => {
      if (filters.area && !entry.areas.some((a) => a.id === filters.area)) return false;
      if (filters.line && !entry.lines.some((l) => l.id === filters.line)) return false;
      if (filters.record && !entry.recordHref) return false;
      if (!q) return true;
      return (
        matchesText(entry.name, q) ||
        (entry.alias ? matchesText(entry.alias, q) : false) ||
        (entry.composition ? matchesText(entry.composition, q) : false) ||
        entry.presentations.some((p) => fold(p).includes(fold(q))) ||
        entry.lines.some((l) => matchesText(l.label, q))
      );
    });
  }, [entries, filters]);

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

  /* ---- quick view ------------------------------------------------------ */
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const openIndex = openSlug ? results.findIndex((e) => e.slug === openSlug) : -1;
  const current = openIndex >= 0 ? results[openIndex] : null;

  const open = (slug: string) => {
    setOpenSlug(slug);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  };
  const close = () => dialogRef.current?.close();
  const step = useCallback(
    (delta: number) => {
      if (openIndex < 0 || results.length === 0) return;
      const next = results[(openIndex + delta + results.length) % results.length];
      setOpenSlug(next.slug);
    },
    [openIndex, results],
  );

  /* Return focus to the name that opened the sheet — or, after stepping, to
     the name now showing, so closing leaves the reader where they are. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      const slug = dialog.dataset.slug;
      setOpenSlug(null);
      if (slug) document.getElementById(`compound-${slug}`)?.focus();
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  /* A filter change can remove the open compound from the results. */
  useEffect(() => {
    if (openSlug && openIndex === -1) dialogRef.current?.close();
  }, [openSlug, openIndex]);

  const fill = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));

  return (
    <div className={styles.library}>
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

      {/* ---- count and letters ------------------------------------------- */}
      <div className={styles.status}>
        <p className={styles.count} aria-live="polite">
          {results.length === 1
            ? copy.controls.result
            : fill(copy.controls.results, { n: results.length })}
        </p>
        {groups.length > 1 ? (
          <nav aria-label={copy.controls.letters} className={styles.letters}>
            <ul>
              {groups.map(([letter]) => (
                <li key={letter}>
                  <a href={`#letra-${letter === "#" ? "0" : letter.toLowerCase()}`}>{letter}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      {/* ---- the index --------------------------------------------------- */}
      {results.length === 0 ? (
        <p className={styles.empty}>{copy.controls.empty}</p>
      ) : (
        <div className={styles.index}>
          <div className={styles.head} aria-hidden="true">
            <span>{copy.columns.compound}</span>
            <span>{copy.columns.areas}</span>
            <span>{copy.columns.lines}</span>
            <span>{copy.columns.record}</span>
          </div>
          {groups.map(([letter, items]) => (
            <section
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
                {items.map((entry) => (
                  <li key={entry.slug} className={styles.row}>
                    <Link
                      id={`compound-${entry.slug}`}
                      href={entry.recordHref ?? entry.productHref}
                      className={styles.name}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        if (
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey ||
                          event.button !== 0
                        ) {
                          return;
                        }
                        event.preventDefault();
                        open(entry.slug);
                      }}
                    >
                      <span className={styles.nameText}>{entry.name}</span>
                      {entry.alias ? <span className={styles.alias}>{entry.alias}</span> : null}
                    </Link>
                    <span className={styles.cellAreas}>
                      {entry.areas.map((a) => a.label).join(" · ") || "—"}
                    </span>
                    <span className={styles.cellLines}>
                      {entry.lines.length === 0
                        ? "—"
                        : `${entry.lines
                            .slice(0, 2)
                            .map((l) => l.label)
                            .join(
                              " · ",
                            )}${entry.lines.length > 2 ? ` +${entry.lines.length - 2}` : ""}`}
                    </span>
                    <span className={styles.cellRecord}>
                      <DepthMarks depth={entry.depth} copy={copy.depth} />
                      {entry.depth ? (
                        <span className={styles.refs}>
                          {fill(copy.depth.refs, { n: entry.depth.references })}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ---- quick view -------------------------------------------------- */}
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={current ? fill(copy.preview.dialog, { name: current.name }) : undefined}
        data-slug={current?.slug}
        onClick={(event) => {
          /* A click on the backdrop lands on the dialog element itself. */
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") step(1);
          if (event.key === "ArrowLeft") step(-1);
        }}
      >
        {current ? (
          <div className={styles.sheet}>
            <header className={styles.sheetHead}>
              <p className={styles.sheetEyebrow}>
                {current.areas.map((a) => a.label).join(" · ") || current.type}
              </p>
              <h2 className={styles.sheetTitle}>{current.name}</h2>
              {current.alias ? <p className={styles.sheetAlias}>{current.alias}</p> : null}
              <button
                type="button"
                className={styles.closeButton}
                onClick={close}
                autoFocus
                aria-label={copy.preview.close}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className={styles.sheetBody}>
              {current.lead ? (
                <figure className={styles.lead}>
                  <figcaption className={styles.sheetLabel}>
                    {current.lead.section === "mechanism"
                      ? copy.preview.mechanism
                      : copy.preview.research}
                  </figcaption>
                  <blockquote className={styles.leadText}>{current.lead.text}</blockquote>
                  {current.depth ? (
                    <p className={styles.leadSources}>
                      {current.depth.references === 1
                        ? copy.preview.source
                        : fill(copy.preview.sources, { n: current.depth.references })}
                    </p>
                  ) : null}
                </figure>
              ) : null}

              {current.depth ? (
                <div className={styles.block}>
                  <p className={styles.sheetLabel}>{copy.preview.contents}</p>
                  <dl className={styles.contents}>
                    {(["mechanism", "research", "notes", "references"] as const).map((key) => {
                      const n = current.depth?.[key] ?? 0;
                      return (
                        <div key={key} data-empty={n === 0 ? "true" : undefined}>
                          <dt>{copy.depth[key]}</dt>
                          <dd>{n === 0 ? "—" : n}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ) : (
                <p className={styles.noRecord}>{copy.preview.noRecord}</p>
              )}

              <div className={styles.block}>
                <p className={styles.sheetLabel}>{copy.preview.identity}</p>
                <dl className={styles.facts}>
                  <div>
                    <dt>{copy.preview.type}</dt>
                    <dd>{current.type}</dd>
                  </div>
                  {current.composition ? (
                    <div>
                      <dt>{copy.preview.composition}</dt>
                      <dd>{current.composition}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{copy.preview.presentations}</dt>
                    <dd>{current.presentations.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>{copy.preview.documentation}</dt>
                    <dd>{current.documentation ?? copy.preview.documentationNone}</dd>
                  </div>
                </dl>
              </div>

              {current.lines.length > 0 ? (
                <div className={styles.block}>
                  <p className={styles.sheetLabel}>{copy.preview.lines}</p>
                  <ul className={styles.lineLinks}>
                    {current.lines.map((l) => (
                      <li key={l.id}>
                        <Link href={l.href} className={styles.lineLink}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <footer className={styles.sheetFoot}>
              <div className={styles.actions}>
                {current.recordHref ? (
                  <Link href={current.recordHref} className={styles.primary}>
                    {copy.preview.record}
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
                <Link
                  href={current.productHref}
                  className={current.recordHref ? styles.secondary : styles.primary}
                >
                  {copy.preview.product}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              {results.length > 1 ? (
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepButton}
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
                    className={styles.stepButton}
                    onClick={() => step(1)}
                    aria-label={copy.preview.next}
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : null}
            </footer>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
