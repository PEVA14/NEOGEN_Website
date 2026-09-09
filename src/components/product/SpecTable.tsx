import { Mono } from "@/components/typography";

import styles from "./SpecTable.module.css";

export interface SpecRow {
  key: string;
  value: string;
}

/**
 * Product specifications — the striped two-column architecture from the
 * reference set, treated as part of the visual identity rather than as a data
 * dump.
 *
 * EVERY VALUE IS A PLACEHOLDER. The reference fills these rows with
 * "Retatrutide Lyophilized Tri-Agonist" and "Triple Receptor peptide" — those
 * are pharmacological claims even with a `[PLACEHOLDER]` suffix attached, so
 * the FIELDS are reproduced and the VALUES are not (CLAUDE.md regulatory
 * guardrail).
 *
 * The placeholder is set in the same weight and scale a real value will take,
 * so the table reads as implementation-ready rather than as missing content.
 */
export function SpecTable({ rows }: { rows: readonly SpecRow[] }) {
  return (
    <dl className={styles.table}>
      {rows.map((row) => (
        <div key={row.key} className={styles.row}>
          <Mono as="dt" size="2xs" className={styles.key}>
            {row.key}
          </Mono>
          <dd className={styles.value}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
