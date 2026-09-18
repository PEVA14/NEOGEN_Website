import Link from "next/link";

import { Mono } from "@/components/typography";
import { referenceHref } from "@/content/references";

import styles from "./ReferenceIndex.module.css";

import type { Reference, SourceType } from "@/content/references";

export interface ReferenceIndexEntry {
  reference: Reference;
  /** The compounds whose public profile cites it. */
  products: readonly { slug: string; name: string; href: string }[];
}

export interface ReferenceIndexCopy {
  sourceTypes: Record<SourceType, string>;
  doi: string;
  pmid: string;
  open: string;
  external: string;
  etAl: string;
  citedBy: string;
  /** Announced on the list, e.g. "74 references". */
  listLabel: string;
}

/**
 * THE REFERENCE INDEX — the whole registry, read from both ends.
 *
 * The citation rail on a product page answers "what does this page rest on".
 * This answers the other direction: for every source, which compounds cite it.
 * Both read the same records, so a corrected DOI is corrected in both places
 * and a source cited by two compounds says so once, here, with both links.
 *
 * Grouped by year, newest first, because a reader scanning a bibliography
 * looks for recency before anything else. Renders nothing when the registry
 * has no public record — the page above decides what to say instead.
 */
export function ReferenceIndex({
  entries,
  copy,
}: {
  entries: readonly ReferenceIndexEntry[];
  copy: ReferenceIndexCopy;
}) {
  if (entries.length === 0) return null;

  /*
   * Years and their running start positions, computed before rendering: the
   * numbering is continuous across groups, and nothing mutates mid-render.
   */
  const years = [...new Set(entries.map((e) => e.reference.year))].sort(
    (a, b) => (b ?? 0) - (a ?? 0),
  );
  const groups = years.reduce<{ year: number | null; startAt: number; rows: typeof entries }[]>(
    (acc, year) => {
      const rows = entries.filter((e) => e.reference.year === year);
      const previous = acc[acc.length - 1];
      const startAt = previous ? previous.startAt + previous.rows.length : 1;
      return [...acc, { year, startAt, rows }];
    },
    [],
  );

  return (
    <div className={styles.index}>
      {groups.map(({ year, startAt, rows }) => {
        return (
          <section key={year ?? "undated"} className={styles.year}>
            <Mono size="2xs" className={styles.yearLabel}>
              {year ?? "—"}
              <span className={styles.yearCount}>{String(rows.length).padStart(2, "0")}</span>
            </Mono>
            <ol className={styles.rows} aria-label={copy.listLabel} start={startAt}>
              {rows.map((entry, i) => {
                const ref = entry.reference;
                const href = referenceHref(ref);
                const authors =
                  ref.authors.length > 3
                    ? `${ref.authors.slice(0, 3).join(", ")} ${copy.etAl}`
                    : ref.authors.join(", ");
                return (
                  <li key={ref.id} className={styles.row}>
                    <Mono size="2xs" className={styles.position} aria-hidden="true">
                      [{String(startAt + i).padStart(2, "0")}]
                    </Mono>
                    <div className={styles.body}>
                      <Mono size="2xs" className={styles.meta}>
                        {copy.sourceTypes[ref.sourceType]}
                        {ref.publication ? ` · ${ref.publication}` : ""}
                      </Mono>
                      <p className={styles.title}>{ref.title}</p>
                      <p className={styles.authors}>{authors}</p>
                      <div className={styles.ids}>
                        {ref.doi ? (
                          <Mono size="2xs" className={styles.id}>
                            {copy.doi} {ref.doi}
                          </Mono>
                        ) : null}
                        {ref.pmid ? (
                          <Mono size="2xs" className={styles.id}>
                            {copy.pmid} {ref.pmid}
                          </Mono>
                        ) : null}
                        {href ? (
                          <a
                            href={href}
                            className={styles.open}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {copy.open}{" "}
                            <span aria-hidden="true" className={styles.externalMark}>
                              ↗
                            </span>
                            <span className="sr-only"> {copy.external}</span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                    {/* The other end: every compound whose profile cites this. */}
                    <div className={styles.cited}>
                      <Mono size="2xs" className={styles.citedLabel}>
                        {copy.citedBy}
                      </Mono>
                      <ul className={styles.compounds}>
                        {entry.products.map((product) => (
                          <li key={product.slug}>
                            <Link href={product.href} className={styles.compound}>
                              {product.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
