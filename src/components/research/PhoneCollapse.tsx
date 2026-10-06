"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./PhoneCollapse.module.css";

const NARROW = "(max-width: 47.999rem)";

/**
 * A WIDE INSTRUMENT, FOLDED ON A PHONE (Research architecture pass). Open in
 * the server HTML, so a reader without script — and every wide screen — gets
 * it whole; on a phone it folds behind one line ("Ver el mapa") once the
 * page is running, so the instrument does not stand between the reader and
 * the rest of the page. A native `<details>`: keyboard and screen readers
 * get a real disclosure. Turning a phone to a wide screen opens it again.
 */
export function PhoneCollapse({ summary, children }: { summary: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const query = window.matchMedia(NARROW);
    node.open = !query.matches;
    const onChange = () => {
      if (!query.matches) node.open = true;
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return (
    <details ref={ref} className={styles.collapse} open>
      <summary className={styles.summary}>
        {summary}
        <span className={styles.caret} aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}
