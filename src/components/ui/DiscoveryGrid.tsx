import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./DiscoveryGrid.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface DiscoveryEntry {
  id: DiscoveryAreaId;
  index: string;
  /** The commercial label, set large — "Metabolismo". */
  short: string;
  /** The research framing, in supporting type — "Investigación metabólica". */
  title: string;
  /** The descriptor line. */
  body: string;
  href: string;
  /** How many compounds are filed here. */
  count: number;
  /** Recognisable names, as a reason to enter. */
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
 * DISCOVERY AREAS AS PLACES, NOT A FILTER LIST.
 *
 * PHASE 12. The previous grid was right about its data and wrong about its
 * result: eight panels with one internal layout, separated by a tone mixed at
 * 8% over paper. Alternating the column spans was not enough — the eye reads
 * eight rectangles of the same weight and concludes the eight areas are
 * interchangeable, which is the opposite of what a department should say.
 *
 * THREE THINGS NOW VARY, AND ALL THREE ARE FACTS:
 *
 *   1. REGISTER. The two areas holding the most compounds render INVERTED, on
 *      their own dark material (`--area-deep`). Density is a real property of
 *      the catalogue, and the biggest departments should look like the biggest
 *      departments. It is not a decorative choice about which panels look good
 *      dark, and it re-decides itself as the catalogue changes.
 *   2. SCALE. Those panels set the commercial name at display size and the
 *      compound count as an oversized figure.
 *   3. COMPOSITION. The spans run 8/4, 4/8, 7/5, 5/7 — two different splits,
 *      so no two rows share a shape.
 *
 * THE NAME IS COMMERCIAL, THE FRAMING IS BESIDE IT. "Metabolismo" set large
 * with "Investigación metabólica" in mono underneath. Eight headings that all
 * began with the same word read as eight versions of one thing.
 *
 * Every value comes from the registry: the count, the names, the entry price.
 */

/* 8/4, 4/8, 7/5, 5/7 — see note 3. */
const SPANS = ["a", "b", "b", "a", "c", "d", "d", "c"] as const;

export function DiscoveryGrid({
  entries,
  copy,
}: {
  entries: readonly DiscoveryEntry[];
  copy: DiscoveryGridCopy;
}) {
  /*
   * The two densest areas, by compound count. Computed rather than configured,
   * so nobody has to remember to move the treatment when the catalogue grows.
   */
  const lead = new Set(
    [...entries]
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((entry) => entry.id),
  );

  return (
    <ul className={styles.grid}>
      {entries.map((entry, position) => {
        const isLead = lead.has(entry.id);
        return (
          <li key={entry.id} className={styles.cell} data-span={SPANS[position % SPANS.length]}>
            <Link
              href={entry.href}
              className={styles.panel}
              data-area={entry.id}
              data-register={isLead ? "deep" : "light"}
            >
              <span className={styles.head}>
                <Mono size="2xs" className={styles.index}>
                  {entry.index}
                </Mono>
                <Mono size="2xs" className={styles.count}>
                  {String(entry.count).padStart(2, "0")} {copy.countLabel}
                </Mono>
              </span>

              <span className={styles.titleWrap}>
                <span className={styles.title}>{entry.short}</span>
                <Mono size="2xs" className={styles.framing}>
                  {entry.title}
                </Mono>
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
        );
      })}
    </ul>
  );
}
