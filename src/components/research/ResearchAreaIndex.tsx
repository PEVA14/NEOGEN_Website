import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./ResearchAreaIndex.module.css";

import type { DiscoveryAreaId } from "@/data/discovery/types";

export interface ResearchAreaEntry {
  id: DiscoveryAreaId;
  index: string;
  title: string;
  body: string;
  href: string;
  compounds: number;
  references: number;
  examples: readonly string[];
}

export interface ResearchAreaIndexCopy {
  compounds: string;
  references: string;
  enter: string;
}

/**
 * RESEARCH AREAS — the hub's way in, as a browsing surface rather than a shop.
 *
 * Deliberately NOT the homepage's DiscoveryGrid. That one sells: tone panels,
 * entry prices. This one is for someone reading rather than buying, so it
 * drops the price, sets the compound count as an oversized figure, and shows
 * how many references the area's products cite — only when that number is
 * above zero, because a "0 references" figure beside eight areas would read as
 * a scoreboard of absence.
 */
export function ResearchAreaIndex({
  entries,
  copy,
}: {
  entries: readonly ResearchAreaEntry[];
  copy: ResearchAreaIndexCopy;
}) {
  return (
    <ol className={styles.index}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.row} data-area={entry.id}>
          <Link href={entry.href} className={styles.link}>
            <Mono size="2xs" className={styles.number} aria-hidden="true">
              {entry.index}
            </Mono>
            <span className={styles.main}>
              <span className={styles.title}>{entry.title}</span>
              <span className={styles.body}>{entry.body}</span>
              {entry.examples.length > 0 ? (
                <Mono size="2xs" className={styles.examples}>
                  {entry.examples.join(" · ")}
                </Mono>
              ) : null}
            </span>
            <span className={styles.figures}>
              <span className={styles.figure}>
                <span className={styles.figureValue}>
                  {String(entry.compounds).padStart(2, "0")}
                </span>
                <Mono size="2xs" className={styles.figureLabel}>
                  {copy.compounds}
                </Mono>
              </span>
              {entry.references > 0 ? (
                <span className={styles.figure}>
                  <span className={styles.figureValue}>
                    {String(entry.references).padStart(2, "0")}
                  </span>
                  <Mono size="2xs" className={styles.figureLabel}>
                    {copy.references}
                  </Mono>
                </span>
              ) : null}
            </span>
            <Mono size="2xs" className={styles.enter} aria-hidden="true">
              {copy.enter} →
            </Mono>
          </Link>
        </li>
      ))}
    </ol>
  );
}
