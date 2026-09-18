import Link from "next/link";

import styles from "./ShelfAreas.module.css";

/**
 * SHOP BY AREA — every discovery area as one tappable entry with its count.
 *
 * A row on a wide screen, a horizontal strip on a phone (swiped, never
 * wrapped into a wall of chips). Square, hairline, no fill: the catalogue
 * under it is what gets loud.
 */
export function ShelfAreas({
  label,
  areas,
}: {
  label: string;
  areas: readonly { id: string; name: string; count: number; href: string }[];
}) {
  return (
    <nav className={styles.areas} aria-label={label}>
      <span className={styles.label}>{label}</span>
      <ul className={styles.list}>
        {areas.map((area) => (
          <li key={area.id}>
            <Link href={area.href} className={styles.area} data-area={area.id}>
              <span className={styles.swatch} aria-hidden="true" />
              {area.name}
              <span className={styles.count}>{String(area.count).padStart(2, "0")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
