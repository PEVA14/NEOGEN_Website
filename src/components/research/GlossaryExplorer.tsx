"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { flushSync } from "react-dom";

import { fold, matchesText } from "@/lib/search";

import styles from "./GlossaryExplorer.module.css";

export interface GlossaryEntry {
  id: string;
  category: string;
  term: string;
  abbreviation: string | null;
  definition: string;
  seeAlso: readonly { id: string; label: string }[];
  /** Records whose own published text uses the term. */
  usedIn: readonly { name: string; href: string }[];
  note: { href: string; label: string } | null;
  destination: { href: string; label: string } | null;
}

export interface GlossaryCopy {
  search: string;
  searchPlaceholder: string;
  categoryAll: string;
  view: { label: string; category: string; alphabet: string };
  results: string;
  result: string;
  empty: string;
  seeAlso: string;
  usedIn: string;
  more: string;
  readMore: string;
  letters: string;
}

/** How many record names a term lists before "and N more". */
const USED_IN_SHOWN = 4;

function letterOf(term: string): string {
  const first = fold(term).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

/**
 * THE GLOSSARY — searchable, groupable, and linked in both directions.
 *
 * Two ways to read it, because there are two readers. By TOPIC for the one
 * learning the field — structure before mechanism before evidence, the order
 * the words build on each other. A–Z for the one who met a word in a record
 * and wants it now. Search cuts across both, and matches the abbreviation and
 * the definition as well as the term, so "HPLC" and "cromatografía" both land.
 *
 * Every term is an anchored `<article>`: `/glosario#vida-media` is a link
 * any page can make, and `:target` marks it on arrival. Each lists the records
 * whose own text uses it — the backlink that makes the glossary a way INTO the
 * compendium, not a dead end beside it.
 *
 * Server-rendered in full (category view, nothing filtered), so every
 * definition is in the HTML for readers without JavaScript and for search
 * engines.
 */
export function GlossaryExplorer({
  entries,
  categories,
  copy,
}: {
  entries: readonly GlossaryEntry[];
  categories: readonly { id: string; label: string }[];
  copy: GlossaryCopy;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [view, setView] = useState<"category" | "alphabet">("category");
  const searchId = useId();

  const results = useMemo(() => {
    const q = query.trim();
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!q) return true;
      return (
        matchesText(entry.term, q) ||
        (entry.abbreviation ? matchesText(entry.abbreviation, q) : false) ||
        fold(entry.definition).includes(fold(q))
      );
    });
  }, [entries, query, category]);

  /*
   * A "see also" link to a term the current filter hides would jump nowhere.
   * Clearing the filter synchronously, before the browser follows the hash,
   * puts the target back in the document in time for the jump.
   */
  const reveal = (id: string) => {
    if (results.some((e) => e.id === id)) return;
    flushSync(() => {
      setQuery("");
      setCategory("all");
    });
  };

  const sections = useMemo(() => {
    if (view === "category") {
      return categories
        .map((c) => ({
          key: c.id,
          heading: c.label,
          items: results.filter((e) => e.category === c.id),
        }))
        .filter((s) => s.items.length > 0);
    }
    const byLetter = new Map<string, GlossaryEntry[]>();
    for (const entry of [...results].sort((a, b) => a.term.localeCompare(b.term, "es"))) {
      const letter = letterOf(entry.term);
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), entry]);
    }
    return [...byLetter.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, items]) => ({ key: `letra-${letter.toLowerCase()}`, heading: letter, items }));
  }, [view, results, categories]);

  return (
    <div className={styles.explorer}>
      <div className={styles.controls}>
        <div className={styles.searchField}>
          <label htmlFor={searchId} className={styles.label}>
            {copy.search}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className={styles.input}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className={styles.chips} role="group" aria-label={copy.view.category}>
          {[{ id: "all", label: copy.categoryAll }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.chip}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className={styles.view} role="group" aria-label={copy.view.label}>
          {(["category", "alphabet"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={styles.viewButton}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {copy.view[v]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.status}>
        <p className={styles.count} aria-live="polite">
          {results.length === 1 ? copy.result : copy.results.replace("{n}", String(results.length))}
        </p>
        {view === "alphabet" && sections.length > 1 ? (
          <nav aria-label={copy.letters} className={styles.letters}>
            <ul>
              {sections.map((s) => (
                <li key={s.key}>
                  <a href={`#${s.key}`}>{s.heading}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      {results.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        sections.map((section) => (
          <section
            key={section.key}
            id={view === "alphabet" ? section.key : `tema-${section.key}`}
            className={styles.section}
            aria-labelledby={`${section.key}-h`}
          >
            <h2 id={`${section.key}-h`} className={styles.heading} data-view={view}>
              {section.heading}
            </h2>
            <div className={styles.terms}>
              {section.items.map((entry) => (
                <article key={entry.id} id={entry.id} className={styles.term}>
                  <h3 className={styles.termName}>
                    {entry.term}
                    {entry.abbreviation ? (
                      <abbr className={styles.abbr} title={entry.term}>
                        {entry.abbreviation}
                      </abbr>
                    ) : null}
                  </h3>
                  <p className={styles.definition}>{entry.definition}</p>

                  {entry.usedIn.length > 0 || entry.seeAlso.length > 0 ? (
                    <dl className={styles.links}>
                      {entry.usedIn.length > 0 ? (
                        <div>
                          <dt>{copy.usedIn}</dt>
                          <dd>
                            {entry.usedIn.slice(0, USED_IN_SHOWN).map((r, i) => (
                              <span key={r.href}>
                                {i > 0 ? ", " : null}
                                <Link href={r.href} className={styles.inline}>
                                  {r.name}
                                </Link>
                              </span>
                            ))}
                            {entry.usedIn.length > USED_IN_SHOWN ? (
                              <span className={styles.more}>
                                {" "}
                                {copy.more.replace(
                                  "{n}",
                                  String(entry.usedIn.length - USED_IN_SHOWN),
                                )}
                              </span>
                            ) : null}
                          </dd>
                        </div>
                      ) : null}
                      {entry.seeAlso.length > 0 ? (
                        <div>
                          <dt>{copy.seeAlso}</dt>
                          <dd>
                            {entry.seeAlso.map((s, i) => (
                              <span key={s.id}>
                                {i > 0 ? ", " : null}
                                <a
                                  href={`#${s.id}`}
                                  className={styles.inline}
                                  onClick={() => reveal(s.id)}
                                >
                                  {s.label}
                                </a>
                              </span>
                            ))}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}

                  {entry.note || entry.destination ? (
                    <div className={styles.routes}>
                      {entry.note ? (
                        <Link href={entry.note.href} className={styles.route}>
                          {entry.note.label} <span aria-hidden="true">→</span>
                        </Link>
                      ) : null}
                      {entry.destination ? (
                        <Link href={entry.destination.href} className={styles.route}>
                          {entry.destination.label} <span aria-hidden="true">→</span>
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
