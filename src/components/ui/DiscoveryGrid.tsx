import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./DiscoveryGrid.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface DiscoveryEntry {
  id: DiscoveryAreaId;
  index: string;
  /** The large commercial label — "Investigación metabólica". */
  title: string;
  /** The research framing, in supporting type. */
  body: string;
  href: string;
  /** How many compounds are filed here. */
  count: number;
  /** Two or three recognisable names, as a reason to enter. */
  examples: readonly string[];
  /** Formatted cheapest entry price in the area. */
  from: string | null;
}

export interface DiscoveryGridCopy {
  countLabel: string;
  from: string;
  enter: string;
}

/**
 * DISCOVERY AREAS AS PANELS, NOT A FILTER LIST.
 *
 * The homepage used to reach discovery through three hardcoded editorial cards
 * that all linked to the same undifferentiated catalogue. Eight real areas
 * exist now, so this is the section that has to make a customer want to enter
 * one — and a list of eight text rows would not.
 *
 * WHAT MAKES IT WANT ENTERING, WITHOUT INVENTING ANYTHING:
 *
 *   - the AREA'S OWN TONE as the panel ground (`styles/areas.css`), so the
 *     eight read as eight places rather than eight links;
 *   - the COUNT, because "16 compuestos" is a reason and "explore" is not;
 *   - two or three REAL COMPOUND NAMES, which is what a reader recognises;
 *   - the AREA'S ENTRY PRICE, so the commercial promise is visible before the
 *     click rather than two pages later.
 *
 * Every value comes from the registry. The large label stays clean — the word
 * "research" lives in the supporting line, not stamped across every heading.
 *
 * THE RHYTHM IS ASYMMETRIC. Spans alternate 7/5 and 5/7 down the grid so the
 * section never resolves into a tidy 2×4 of equal rectangles, which is the
 * shape the rest of the page works to avoid.
 */
export function DiscoveryGrid({
  entries,
  copy,
}: {
  entries: readonly DiscoveryEntry[];
  copy: DiscoveryGridCopy;
}) {
  return (
    <ul className={styles.grid}>
      {entries.map((entry, position) => (
        <li
          key={entry.id}
          className={styles.cell}
          /* 7/5, 5/7, repeating — see the note above. */
          data-span={position % 4 === 0 || position % 4 === 3 ? "wide" : "narrow"}
        >
          <Link href={entry.href} className={styles.panel} data-area={entry.id}>
            <span className={styles.head}>
              <Mono size="2xs" className={styles.index}>
                {entry.index}
              </Mono>
              <Mono size="2xs" className={styles.count}>
                {entry.count} {copy.countLabel}
              </Mono>
            </span>

            <span className={styles.titleWrap}>
              <span className={styles.title}>{entry.title}</span>
            </span>

            <span className={styles.body}>{entry.body}</span>

            {entry.examples.length > 0 ? (
              <Mono size="2xs" className={styles.examples}>
                {entry.examples.join(" · ")}
              </Mono>
            ) : null}

            <span className={styles.foot}>
              {entry.from ? (
                <Mono size="2xs" className={styles.from}>
                  {copy.from} {entry.from}
                </Mono>
              ) : (
                <span />
              )}
              <Mono size="2xs" className={styles.enter}>
                {copy.enter} →
              </Mono>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
