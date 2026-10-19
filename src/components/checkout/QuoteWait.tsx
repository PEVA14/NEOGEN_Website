import { Body, Mono } from "@/components/typography";

import styles from "./QuoteWait.module.css";

/**
 * WHILE THE SHIPPING QUOTE IS FETCHED — the delivery step's Suspense
 * fallback. A quote can take ~10 s (up to ~20 s), so the step itself renders
 * at once and only this region waits. Quiet by design: a status line the
 * screen reader announces, a hairline that moves (and holds still under
 * reduced motion), and the shape of the options it will become. No provider,
 * no mechanism — only what is being done for the customer.
 */
export function QuoteWait({ title, note }: { title: string; note: string }) {
  return (
    <div className={styles.wait} role="status" aria-live="polite">
      <span className={styles.track} aria-hidden="true">
        <span className={styles.bar} />
      </span>
      <Mono size="2xs" className={styles.title}>
        {title}
      </Mono>
      <Body tone="muted" size="sm">
        {note}
      </Body>
    </div>
  );
}

/** The address the quote is for, kept in view while it is fetched and after. */
export function ShipTo({
  label,
  recipient,
  address,
  change,
}: {
  label: string;
  recipient: string;
  address: string;
  change: { href: string; label: string };
}) {
  return (
    <div className={styles.shipTo}>
      <Mono size="2xs" className={styles.label}>
        {label}
      </Mono>
      <Body size="sm">{recipient}</Body>
      <Body size="sm" tone="muted">
        {address}
      </Body>
      <a href={change.href} className={styles.change}>
        {change.label}
      </a>
    </div>
  );
}
