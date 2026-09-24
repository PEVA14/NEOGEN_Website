import Link from "next/link";

import styles from "./RouteList.module.css";

export interface RouteEntry {
  href: string;
  title: string;
  body?: string;
  /** A derived count or fact in mono — "85", "74 ref." */
  meta?: string;
}

/**
 * DESTINATIONS, AS RULED ROWS.
 *
 * How the knowledge system says "go here next" — on the hub, at the end of
 * Start Here, at the foot of the handling reference. Rows rather than cards:
 * a title that is the link, one sentence that says what is there, and a count
 * where one exists. It reads as a table of contents because that is what it
 * is, and it never becomes a wall of boxes.
 */
export function RouteList({
  routes,
  label,
}: {
  routes: readonly RouteEntry[];
  /** Accessible name, when the list is a navigation landmark of its own. */
  label?: string;
}) {
  const list = (
    <ul className={styles.list}>
      {routes.map((route) => (
        <li key={route.href} className={styles.row}>
          <Link href={route.href} className={styles.link}>
            <span className={styles.title}>{route.title}</span>
            {route.body ? <span className={styles.body}>{route.body}</span> : null}
            {route.meta ? <span className={styles.meta}>{route.meta}</span> : null}
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return label ? <nav aria-label={label}>{list}</nav> : list;
}
