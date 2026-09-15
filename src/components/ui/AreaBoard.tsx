import Link from "next/link";

import styles from "./AreaBoard.module.css";

import type { CSSProperties } from "react";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface AreaBoardEntry {
  id: DiscoveryAreaId;
  href: string;
  /** "Metabolismo". */
  short: string;
  count: number;
}

/**
 * THE AREA INDEX — the catalogue's entrance, kept small.
 *
 * One slim row of eight compartments: a swatch in the area's own tone, the
 * name, the compound count, and a hairline gauge of the area's size against
 * the largest. The detail is in the material, not the scale — the swatches and
 * gauges carry the colour, the type stays at reading size.
 *
 * The gauge is `count / max`, a fact from the registry, not a popularity or a
 * rating. Hover washes the compartment in its area tone and brings the arrow
 * in; nothing else moves.
 *
 * Eight across on a wide screen, four on a tablet, two on a phone.
 */
export function AreaBoard({
  entries,
  label,
  countLabel,
}: {
  entries: readonly AreaBoardEntry[];
  /** Accessible name for the navigation landmark. */
  label: string;
  /** "compuestos". */
  countLabel: string;
}) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((entry) => entry.count));

  return (
    <nav aria-label={label} className={styles.board}>
      <ul className={styles.grid}>
        {entries.map((entry) => (
          <li key={entry.id} data-area={entry.id} className={styles.cell}>
            <Link
              href={entry.href}
              className={styles.tile}
              style={{ "--share": entry.count / max } as CSSProperties}
            >
              <span className={styles.top}>
                <span className={styles.swatch} aria-hidden="true" />
                <span className={styles.name}>{entry.short}</span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </span>
              <span className={styles.meta}>
                <span className={styles.count}>{String(entry.count).padStart(2, "0")}</span>{" "}
                {countLabel}
              </span>
              <span className={styles.gauge} aria-hidden="true">
                <span className={styles.fill} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
