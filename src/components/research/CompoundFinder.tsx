"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { Mono } from "@/components/typography";

import styles from "./CompoundFinder.module.css";

export interface FinderEntry {
  slug: string;
  name: string;
  subtitle: string | null;
  href: string;
  areas: readonly { id: string; label: string }[];
  presentations: string;
  /** Resolver-derived label ("2 documentos públicos"), or null when none. */
  documentation: string | null;
}

export interface CompoundFinderCopy {
  searchLabel: string;
  searchPlaceholder: string;
  areaLabel: string;
  areaAll: string;
  /** "{n} compuestos" */
  results: string;
  /** "{n} compuesto" — the singular, so one result is not "01 compuestos". */
  result: string;
  empty: string;
  clear: string;
  columns: { compound: string; areas: string; presentations: string; documentation: string };
}

/**
 * THE COMPOUND FINDER — the Research Hub's index, made searchable.
 *
 * It replaces an 85-row static register that had to be read top to bottom.
 * A reader arriving to look something up now types a name or narrows to an
 * area and gets a short list; the full index is still there with the query
 * empty.
 *
 * THE DATA IT RECEIVES IS DELIBERATELY THIN: names, slugs, area labels, a
 * presentation summary and a documentation label already resolved on the
 * server. No variant ids, no prices, no documents — the finder filters a list,
 * it does not need the catalogue, and `check:output` fails the build if the
 * registry is dragged into the browser through it.
 *
 * MATCHING IN BOTH LANGUAGES' NAMES FOR A COMPOUND.
 *
 * The catalogue names compounds by their English INN — "Tirzepatide",
 * "Semaglutide" — and a Mexican reader types the Spanish one: "tirzepatida",
 * "semaglutida". Case and accent folding alone does not bridge that; the words
 * differ in their final vowel. So each word is also compared by its STEM —
 * the word with one trailing a/e/o removed, for words longer than five
 * letters, which is where INNs sit — and a query matches if either the folded
 * text or the stemmed text contains it.
 */
function fold(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function stem(value: string): string {
  return fold(value)
    .split(/[\s\-/]+/)
    .map((word) => (word.length > 5 ? word.replace(/[aeo]$/, "") : word))
    .join(" ");
}

function matches(haystack: string, query: string): boolean {
  return fold(haystack).includes(fold(query)) || stem(haystack).includes(stem(query));
}

export function CompoundFinder({
  entries,
  areas,
  copy,
}: {
  entries: readonly FinderEntry[];
  areas: readonly { id: string; label: string }[];
  copy: CompoundFinderCopy;
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const searchId = useId();
  const areaId = useId();

  const results = useMemo(() => {
    const q = query.trim();
    return entries.filter((entry) => {
      if (area !== "all" && !entry.areas.some((a) => a.id === area)) return false;
      if (!q) return true;
      return (
        matches(entry.name, q) ||
        (entry.subtitle ? matches(entry.subtitle, q) : false) ||
        fold(entry.presentations).includes(fold(q))
      );
    });
  }, [entries, query, area]);

  const filtered = query.trim() !== "" || area !== "all";

  return (
    <div className={styles.finder}>
      <div className={styles.controls}>
        <div className={styles.control} data-grow="true">
          <label htmlFor={searchId} className={styles.label}>
            <Mono size="2xs">{copy.searchLabel}</Mono>
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className={styles.input}
            autoComplete="off"
          />
        </div>
        <div className={styles.control}>
          <label htmlFor={areaId} className={styles.label}>
            <Mono size="2xs">{copy.areaLabel}</Mono>
          </label>
          <select
            id={areaId}
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className={styles.select}
          >
            <option value="all">{copy.areaAll}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {filtered ? (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setQuery("");
              setArea("all");
            }}
          >
            {copy.clear}
          </button>
        ) : null}
      </div>

      {/* Announced politely so a screen-reader user hears the result count
          change as they type, without being interrupted on every keystroke. */}
      <Mono size="2xs" className={styles.count} aria-live="polite">
        {(results.length === 1 ? copy.result : copy.results).replace(
          "{n}",
          String(results.length).padStart(2, "0"),
        )}
      </Mono>

      {results.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <ul className={styles.list}>
          {results.map((entry) => (
            <li key={entry.slug} className={styles.row}>
              <Link href={entry.href} className={styles.name}>
                {entry.name}
                {entry.subtitle ? <span className={styles.subtitle}>{entry.subtitle}</span> : null}
              </Link>
              <dl className={styles.fields}>
                <div className={styles.field}>
                  <Mono as="dt" size="2xs" className={styles.fieldKey}>
                    {copy.columns.areas}
                  </Mono>
                  <dd className={styles.fieldValue}>
                    {entry.areas.length > 0 ? entry.areas.map((a) => a.label).join(" · ") : "—"}
                  </dd>
                </div>
                <div className={styles.field}>
                  <Mono as="dt" size="2xs" className={styles.fieldKey}>
                    {copy.columns.presentations}
                  </Mono>
                  <dd className={styles.fieldValue}>{entry.presentations}</dd>
                </div>
                <div className={styles.field}>
                  <Mono as="dt" size="2xs" className={styles.fieldKey}>
                    {copy.columns.documentation}
                  </Mono>
                  <dd className={styles.fieldValue}>{entry.documentation ?? "—"}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
