import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./PreviewBanner.module.css";

/**
 * THE DESIGN-PREVIEW BANNER — fixed to the foot of the viewport.
 *
 * Rendered only by the development-only preview route, and pinned so it is in
 * every screenshot of that page: nobody should be able to capture a sample
 * ledger or a sample citation without the words "sample data" beside it.
 */
export function PreviewBanner({
  label,
  body,
  back,
  backHref,
}: {
  label: string;
  body: string;
  back: string;
  backHref: string;
}) {
  return (
    <>
      <aside className={styles.banner} aria-label={label}>
        <Mono size="2xs" className={styles.label}>
          {label}
        </Mono>
        <p className={styles.body}>{body}</p>
        <Link href={backHref} className={styles.back}>
          {back} →
        </Link>
      </aside>
      {/* Keeps the page's last section clear of the fixed bar. */}
      <div className={styles.spacer} aria-hidden="true" />
    </>
  );
}
