"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { TermLens } from "@/components/motion/TermLens";
import { useIndicator } from "@/components/motion/useIndicator";
import { ValueRoll } from "@/components/motion/ValueRoll";
import { AreaMarks } from "@/components/ui/AreaMarks";
import { fold, foldIndex, matchesText } from "@/lib/search";

import styles from "./GlossaryExplorer.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface GlossaryEntry {
  id: string;
  category: string;
  term: string;
  abbreviation: string | null;
  definition: string;
  seeAlso: readonly { id: string; label: string }[];
  /** Records whose own published text uses the term. */
  usedIn: readonly { name: string; href: string; areas?: readonly DiscoveryAreaId[] }[];
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
  goTo: string;
  backTerm: string;
  backRecord: string;
  dismiss: string;
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
  const reduced = useReducedMotion();
  const router = useRouter();
  const chipsRef = useRef<HTMLDivElement>(null);
  const chipMark = useRef<HTMLSpanElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const viewMark = useRef<HTMLSpanElement>(null);
  useIndicator(chipsRef, chipMark, '[aria-pressed="true"]', category);
  useIndicator(viewRef, viewMark, '[aria-pressed="true"]', view);

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

  /*
   * THE WAY BACK. Following a "see also" (or a definition card's link) to
   * another term leaves a chip that returns to the term you were reading; a
   * reader who came from a compound record (its inline definition's "Abrir en
   * el glosario") gets one that returns to that record. The glossary is a
   * place you consult, not a place you get lost in.
   */
  const [trail, setTrail] = useState<{ id: string; label: string } | null>(null);
  const [fromRecord, setFromRecord] = useState<{
    href: string;
    name: string;
    areas?: readonly DiscoveryAreaId[];
  } | null>(null);
  useEffect(() => {
    /* Where the reader came from: the record's own note of it (a client
       navigation from its inline definition), else the referrer (a full
       page load). */
    let fromPath: string | null = null;
    try {
      const note = JSON.parse(sessionStorage.getItem("neogen:from") ?? "null") as {
        href: string;
        at: number;
      } | null;
      sessionStorage.removeItem("neogen:from");
      if (note && Date.now() - note.at < 15000) fromPath = note.href;
    } catch {
      fromPath = null;
    }
    if (!fromPath) {
      try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        if (ref && ref.origin === window.location.origin) fromPath = ref.pathname;
      } catch {
        fromPath = null;
      }
    }
    if (!fromPath) return;
    const record = entries.flatMap((e) => e.usedIn).find((r) => r.href === fromPath);
    if (!record) return;
    /* The record's colour comes along (color pass): the word arrived at
       registers in it, and the way back is marked with it. */
    const area = record.areas?.[0];
    const target = window.location.hash
      ? document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
      : null;
    requestAnimationFrame(() => {
      if (target) {
        if (area) target.setAttribute("data-area", area);
        target.setAttribute("data-arrived", "");
      }
      setFromRecord(record);
    });
  }, [entries]);

  /* Go to a term on this page: reveal it if a filter hides it, bring it into
     view, and let it register (an ink rule drawn across it). */
  const goTo = useCallback(
    (id: string, from: { id: string; label: string } | null) => {
      if (!results.some((e) => e.id === id)) {
        flushSync(() => {
          setQuery("");
          setCategory("all");
        });
      }
      const el = document.getElementById(id);
      if (!el) return;
      if (from) setTrail(from);
      window.history.replaceState(window.history.state, "", `#${id}`);
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      el.removeAttribute("data-arrived");
      void el.offsetWidth;
      el.setAttribute("data-arrived", "");
      el.focus({ preventScroll: true });
    },
    [results, reduced],
  );
  const termOf = (el: HTMLElement | null) => {
    const article = el?.closest<HTMLElement>("article[id]");
    if (!article) return null;
    const entry = entries.find((e) => e.id === article.id);
    return entry ? { id: entry.id, label: entry.term } : null;
  };

  const q = query.trim();
  const marked = (text: string) => {
    const at = q ? foldIndex(text, q) : null;
    if (!at) return text;
    return (
      <>
        {text.slice(0, at[0])}
        <mark className={styles.match}>{text.slice(at[0], at[1])}</mark>
        {text.slice(at[1])}
      </>
    );
  };
  const present = new Set(sections.map((sec) => sec.heading));
  const layout = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 42, mass: 0.9 };

  return (
    <TermLens
      className={styles.explorer}
      onFollow={(href, from) => goTo(href.replace(/^.*#/, ""), termOf(from))}
    >
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

        <div className={styles.chips} role="group" aria-label={copy.view.category} ref={chipsRef}>
          <span ref={chipMark} className={styles.mark} aria-hidden="true" />
          {[{ id: "all", label: copy.categoryAll }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.chip}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.view} role="group" aria-label={copy.view.label} ref={viewRef}>
          <span ref={viewMark} className={styles.mark} aria-hidden="true" />
          {(["category", "alphabet"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={styles.viewButton}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              <span>{copy.view[v]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.status}>
        <p className={styles.count} aria-live="polite">
          <span className={styles.srOnly}>
            {results.length === 1
              ? copy.result
              : copy.results.replace("{n}", String(results.length))}
          </span>
          <span aria-hidden="true">
            <ValueRoll value={String(results.length).padStart(2, "0")} />{" "}
            {(results.length === 1 ? copy.result : copy.results)
              .replace("{n}", "")
              .replace(/^1\s*/, "")
              .trim()}
          </span>
        </p>
        {view === "alphabet" && results.length > 0 ? (
          <nav aria-label={copy.letters} className={styles.letters}>
            <ul>
              {ALPHABET.map((letter) =>
                present.has(letter) ? (
                  <li key={letter}>
                    <a href={`#letra-${letter.toLowerCase()}`}>{letter}</a>
                  </li>
                ) : (
                  <li key={letter} aria-hidden="true">
                    <span className={styles.absent}>{letter}</span>
                  </li>
                ),
              )}
            </ul>
          </nav>
        ) : null}
      </div>

      {results.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {sections.map((section) => (
            <motion.section
              layout="position"
              transition={layout}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.14 } }}
              key={`${view}-${section.key}`}
              id={view === "alphabet" ? section.key : `tema-${section.key}`}
              className={styles.section}
              aria-labelledby={`${section.key}-h`}
            >
              <h2 id={`${section.key}-h`} className={styles.heading} data-view={view}>
                {section.heading}
              </h2>
              <div className={styles.terms}>
                <AnimatePresence initial={false} mode="popLayout">
                  {section.items.map((entry) => (
                    <motion.article
                      layout="position"
                      transition={layout}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.12 } }}
                      key={entry.id}
                      id={entry.id}
                      tabIndex={-1}
                      className={styles.term}
                    >
                      <h3 className={styles.termName}>
                        {marked(entry.term)}
                        {entry.abbreviation ? (
                          <abbr className={styles.abbr} title={entry.term}>
                            {entry.abbreviation}
                          </abbr>
                        ) : null}
                      </h3>
                      <p className={styles.definition}>{marked(entry.definition)}</p>

                      {entry.usedIn.length > 0 || entry.seeAlso.length > 0 ? (
                        <dl className={styles.links}>
                          {entry.usedIn.length > 0 ? (
                            <div>
                              <dt>{copy.usedIn}</dt>
                              <dd>
                                {entry.usedIn.slice(0, USED_IN_SHOWN).map((r, i) => (
                                  <span key={r.href}>
                                    {i > 0 ? ", " : null}
                                    {r.areas && r.areas.length > 0 ? (
                                      <>
                                        <AreaMarks areas={r.areas} />{" "}
                                      </>
                                    ) : null}
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
                                {entry.seeAlso.map((sa, i) => (
                                  <span key={sa.id}>
                                    {i > 0 ? ", " : null}
                                    {/* Opens the related definition in place
                                        (TermLens); the card's own link, or a
                                        modified click, goes to the term. */}
                                    <a
                                      href={`#${sa.id}`}
                                      className={styles.inline}
                                      data-term={sa.id}
                                    >
                                      {sa.label}
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
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      )}

      {/* The definitions a "see also" lifts in place (TermLens). */}
      <div hidden>
        {entries.map((entry) => (
          <div key={entry.id} data-def={entry.id}>
            <p data-def-kind="">{categories.find((c) => c.id === entry.category)?.label ?? ""}</p>
            <p data-def-term="">
              {entry.term}
              {entry.abbreviation ? ` · ${entry.abbreviation}` : ""}
            </p>
            <p data-def-text="">{entry.definition}</p>
            <a href={`#${entry.id}`} data-def-link="">
              {copy.goTo} <span aria-hidden="true">→</span>
            </a>
          </div>
        ))}
      </div>

      {/* The way back: to the term you came from, or the record. */}
      <AnimatePresence>
        {trail || fromRecord ? (
          <motion.div
            key={trail ? `t-${trail.id}` : "record"}
            className={styles.trail}
            data-area={!trail ? fromRecord?.areas?.[0] : undefined}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
          >
            <button
              type="button"
              className={styles.trailBack}
              onClick={() => {
                if (trail) {
                  const back = trail;
                  setTrail(null);
                  goTo(back.id, null);
                } else if (fromRecord) {
                  if (window.history.length > 1) router.back();
                  else router.push(fromRecord.href);
                }
              }}
            >
              <span aria-hidden="true">←</span>{" "}
              {trail
                ? copy.backTerm.replace("{term}", trail.label)
                : copy.backRecord.replace("{name}", fromRecord?.name ?? "")}
            </button>
            <button
              type="button"
              className={styles.trailClose}
              aria-label={copy.dismiss}
              onClick={() => (trail ? setTrail(null) : setFromRecord(null))}
            >
              <span aria-hidden="true">×</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </TermLens>
  );
}

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
