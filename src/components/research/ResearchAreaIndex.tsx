import Link from "next/link";

import { Mono } from "@/components/typography";
import { AreaIcon } from "@/components/ui/AreaIcon";

import styles from "./ResearchAreaIndex.module.css";

import type { CSSProperties } from "react";

import type { DiscoveryAreaId } from "@/data/discovery/types";

export interface ResearchAreaEntry {
  id: DiscoveryAreaId;
  index: string;
  /** The commercial name, set as the row's title — "Metabolismo". */
  short: string;
  /** The research framing, in mono beneath it. */
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
 * entry prices. This one is for someone reading rather than buying: a grid of
 * tiles, each in its area's own material (the wash appears on hover, the hue
 * only in the symbol and the gauge), with the compound count set large and
 * the references the area's products cite beside it — only when that number
 * is above zero, because a "0 references" figure would read as a scoreboard of
 * absence. The gauge is the area's size against the largest area: a registry
 * fact, not a rating.
 *
 * Four across on a wide screen, two on a tablet, one on a phone.
 */
export function ResearchAreaIndex({
  entries,
  copy,
}: {
  entries: readonly ResearchAreaEntry[];
  copy: ResearchAreaIndexCopy;
}) {
  const max = Math.max(1, ...entries.map((e) => e.compounds));
  return (
    <ol className={styles.grid}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.cell} data-area={entry.id}>
          <Link
            href={entry.href}
            className={styles.tile}
            style={{ "--share": entry.compounds / max } as CSSProperties}
          >
            <span className={styles.top}>
              <AreaIcon id={entry.id} className={styles.icon} />
              <Mono size="2xs" className={styles.number} aria-hidden="true">
                {entry.index}
              </Mono>
            </span>
            {/* The commercial name leads, the research framing sits under it
                in mono — the same two-name treatment the discovery panels and
                the area mastheads use. */}
            <span className={styles.title}>{entry.short}</span>
            <Mono size="2xs" className={styles.framing}>
              {entry.title}
            </Mono>
            <span className={styles.body}>{entry.body}</span>
            {entry.examples.length > 0 ? (
              <Mono size="2xs" className={styles.examples}>
                {entry.examples.join(" · ")}
              </Mono>
            ) : null}
            <span className={styles.figures}>
              <span className={styles.figure}>
                <span className={styles.figureValue}>{entry.compounds}</span>
                <Mono size="2xs" className={styles.figureLabel}>
                  {copy.compounds}
                </Mono>
              </span>
              {entry.references > 0 ? (
                <span className={styles.figure}>
                  <span className={styles.figureValue}>{entry.references}</span>
                  <Mono size="2xs" className={styles.figureLabel}>
                    {copy.references}
                  </Mono>
                </span>
              ) : null}
            </span>
            <span className={styles.gauge} aria-hidden="true">
              <span className={styles.gaugeFill} />
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
