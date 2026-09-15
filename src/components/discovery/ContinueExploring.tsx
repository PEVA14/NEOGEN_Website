import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./ContinueExploring.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface ContinueDestination {
  key: string;
  /** Mono kind label — "Siguiente área". */
  kind: string;
  /** The destination itself, set large — "Recuperación". */
  name: string;
  /** One factual line — "15 compuestos". */
  meta: string;
  href: string;
  /** Tone for area destinations, so the row carries that area's material. */
  areaId?: DiscoveryAreaId;
}

/**
 * CONTINUE EXPLORING — the page ends on destinations, not on the footer.
 *
 * A technical index of large rows: a number, what kind of place it is, the
 * place set at display scale, one factual line. The whole row is the link and
 * the target. Which rows exist is decided by `continuePlan` and the page — the
 * next area not already offered above, the materials, the full catalogue and
 * the Research Hub — so no two areas end on exactly the same list.
 *
 * An area destination carries its own `data-area`, and its leading edge takes
 * that area's line colour: the last thing on the page previews the material
 * of the place it sends a reader to.
 */
export function ContinueExploring({
  destinations,
}: {
  destinations: readonly ContinueDestination[];
}) {
  return (
    <ol className={styles.index}>
      {destinations.map((destination, position) => (
        <li key={destination.key} className={styles.row} data-area={destination.areaId}>
          <Link href={destination.href} className={styles.link}>
            <Mono size="2xs" className={styles.number} aria-hidden="true">
              {String(position + 1).padStart(2, "0")}
            </Mono>
            <Mono size="2xs" className={styles.kind}>
              {destination.kind}
            </Mono>
            <span className={styles.name}>{destination.name}</span>
            <Mono size="2xs" className={styles.meta}>
              {destination.meta}
            </Mono>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
