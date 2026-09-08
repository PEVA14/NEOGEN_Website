import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./CatalogIndex.module.css";

export interface CatalogEntry {
  index: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

/**
 * The catalogue index — Quiet Mode.
 *
 * DELIBERATELY NOT CARDS. Three equal pale rectangles read as a SaaS feature
 * grid, which is the single most generic shape this page could take. A printed
 * catalogue does not present its sections as tiles; it lists them, at scale,
 * with an index and a rule.
 *
 * So each category is a full-width entry: an oversized mono index hanging in
 * the margin, the category name set as display type large enough to be the
 * section's real voice, the description held at a narrow measure to the right,
 * and a rule between. The whole row is the link — the arrow is a marker, not a
 * button.
 *
 * The result is asymmetric, dense at the left and open at the right, and reads
 * as entering a catalogue rather than choosing between three features.
 */
export function CatalogIndex({ entries }: { entries: readonly CatalogEntry[] }) {
  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.index} className={styles.item}>
          <Link href={entry.href} className={styles.link}>
            <Mono size="2xs" className={styles.index} aria-hidden="true">
              {entry.index}
            </Mono>

            <span className={styles.title}>{entry.title}</span>

            <span className={styles.body}>{entry.body}</span>

            <span className={styles.action}>
              <Mono size="2xs" className={styles.actionLabel}>
                {entry.linkLabel}
              </Mono>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
