import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./RelatedAreas.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface RelatedAreaEntry {
  id: DiscoveryAreaId;
  href: string;
  short: string;
  framing: string;
  /** How many of THIS area's compounds are also filed there. */
  shared: number;
  /** The shared compounds themselves, linked. */
  compounds: readonly { slug: string; name: string; href: string }[];
}

export interface RelatedAreasCopy {
  shared: string;
  ofTotal: string;
  sharedCompounds: string;
  enter: string;
}

/**
 * RELATED AREAS — the continuation a catalogue actually supports.
 *
 * Every relation here is a fact of the approved assignments: two areas are
 * related because named compounds are filed under both, and the panel names
 * them. So the section is not "you may also like" — it is "these compounds
 * also live over there", with a way to each compound and a way into the area.
 *
 * THE STRONGEST RELATION TAKES THE DARK REGISTER. The first entry (most shared
 * compounds, ranked by `relatedAreas`) sits on its own area's deep material and
 * wider; the rest stay on their washes. With one relation the panel runs the
 * full width, with two they split 7/5, so the section's shape follows how
 * connected the area really is.
 *
 * The overlap is set as a figure over this area's total ("02 / 16") — a count,
 * not a score. No bar: a bar would read as a strength-of-relation meter that
 * the data does not define.
 */
export function RelatedAreas({
  entries,
  total,
  copy,
}: {
  entries: readonly RelatedAreaEntry[];
  /** This area's own compound count, for the "of N" line. */
  total: number;
  copy: RelatedAreasCopy;
}) {
  return (
    <ul className={styles.list} data-count={Math.min(entries.length, 3)}>
      {entries.map((entry, position) => (
        <li
          key={entry.id}
          className={styles.panel}
          data-area={entry.id}
          data-register={position === 0 ? "deep" : "light"}
        >
          <div className={styles.head}>
            <Mono size="2xs" className={styles.framing}>
              {entry.framing}
            </Mono>
            <h3 className={styles.name}>
              <Link href={entry.href} className={styles.nameLink}>
                {entry.short}
              </Link>
            </h3>
          </div>

          <p className={styles.figure}>
            <span className={styles.figureValue}>{String(entry.shared).padStart(2, "0")}</span>
            <span className={styles.figureOf}>/ {String(total).padStart(2, "0")}</span>
            <Mono size="2xs" className={styles.figureLabel}>
              {copy.shared.replace("{n}", String(entry.shared))} ·{" "}
              {copy.ofTotal.replace("{total}", String(total))}
            </Mono>
          </p>

          <div className={styles.compounds}>
            <Mono size="2xs" className={styles.compoundsLabel}>
              {copy.sharedCompounds}
            </Mono>
            <ul className={styles.compoundList}>
              {entry.compounds.map((compound) => (
                <li key={compound.slug}>
                  <Link href={compound.href} className={styles.compound}>
                    {compound.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href={entry.href}
            className={styles.enter}
            aria-label={`${copy.enter} — ${entry.short}`}
          >
            {copy.enter} →
          </Link>
        </li>
      ))}
    </ul>
  );
}
