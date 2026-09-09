import { Mono } from "@/components/typography";

import styles from "./BagSummary.module.css";

export interface BagSummaryCopy {
  title: string;
  subtotal: string;
  shipping: string;
  taxes: string;
  total: string;
  note: string;
}

/**
 * The order summary.
 *
 * Built as a definition list, because that is what it is: a set of labelled
 * amounts, not a table and not a stack of divs. A screen reader gets the
 * label/value pairing for free.
 *
 * EVERY AMOUNT IS A PLACEHOLDER, AND THE TOTAL IS NOT COMPUTED.
 * ------------------------------------------------------------
 * There is no verified price, no shipping rate and no tax treatment — the last
 * of those is not a data gap but a regulatory one. Showing "MX$0.00" would be a
 * fabricated amount, and summing three unknowns into a total would be a
 * fabricated calculation dressed as arithmetic. So each row states the neutral
 * placeholder, and one line says why.
 *
 * Rendered whether or not the bag has lines: the summary is the structure of an
 * order, and checkout consumes this same component.
 */
export function BagSummary({ copy, placeholder }: { copy: BagSummaryCopy; placeholder: string }) {
  const rows = [
    { key: copy.subtotal, value: placeholder },
    { key: copy.shipping, value: placeholder },
    { key: copy.taxes, value: placeholder },
  ];

  return (
    <section className={styles.summary} aria-labelledby="bag-summary-title">
      <Mono size="2xs" className={styles.title} id="bag-summary-title">
        {copy.title}
      </Mono>

      <dl className={styles.rows}>
        {rows.map((row) => (
          <div key={row.key} className={styles.row}>
            <Mono as="dt" size="2xs" className={styles.key}>
              {row.key}
            </Mono>
            <Mono as="dd" size="2xs" className={styles.value}>
              {row.value}
            </Mono>
          </div>
        ))}

        {/* The total is set apart by a rule and by scale — it is the figure the
            whole block exists to deliver, even while it is a placeholder. */}
        <div className={`${styles.row} ${styles.totalRow}`}>
          <Mono as="dt" size="2xs" className={styles.key}>
            {copy.total}
          </Mono>
          <dd className={styles.totalValue}>{placeholder}</dd>
        </div>
      </dl>

      <Mono size="2xs" className={styles.note}>
        {copy.note}
      </Mono>
    </section>
  );
}
