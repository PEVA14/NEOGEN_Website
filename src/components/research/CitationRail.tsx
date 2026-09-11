import { Mono } from "@/components/typography";
import { referenceHref } from "@/content/references";

import styles from "./CitationRail.module.css";

import type { Reference, SourceType } from "@/content/references";

export interface CitationRailCopy {
  label: string;
  sourceTypes: Record<SourceType, string>;
  doi: string;
  pmid: string;
  open: string;
  external: string;
  etAl: string;
}

/**
 * THE CITATION RAIL — references as a numbered column, not a bibliography dump.
 *
 * Each entry shows what a reader needs to judge a source before opening it:
 * who, when, what kind of source, where it was published, and the identifier
 * that finds it. No summary and no "key finding" — NEOGEN does not paraphrase
 * literature on a reader's behalf, and a one-line gloss is where an
 * unsupported claim gets written in a paper's name.
 *
 * Renders NOTHING when there are no references. The caller decides what the
 * page says instead; an empty rail would be a column labelled "sources" with
 * no sources in it.
 */
export function CitationRail({
  references,
  copy,
  startAt = 1,
}: {
  references: readonly Reference[];
  copy: CitationRailCopy;
  startAt?: number;
}) {
  if (references.length === 0) return null;

  return (
    <ol className={styles.rail} aria-label={copy.label} start={startAt}>
      {references.map((ref, i) => {
        const href = referenceHref(ref);
        const authors =
          ref.authors.length > 3
            ? `${ref.authors.slice(0, 3).join(", ")} ${copy.etAl}`
            : ref.authors.join(", ");
        return (
          <li key={ref.id} className={styles.entry}>
            <Mono size="2xs" className={styles.index} aria-hidden="true">
              [{String(startAt + i).padStart(2, "0")}]
            </Mono>
            <div className={styles.body}>
              <Mono size="2xs" className={styles.meta}>
                {copy.sourceTypes[ref.sourceType]}
                {ref.year ? ` · ${ref.year}` : ""}
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
                    className={styles.open}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${copy.open} — ${ref.title} (${copy.external})`}
                  >
                    {copy.open} ↗
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
