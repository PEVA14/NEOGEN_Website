import { Mono } from "@/components/typography";

import styles from "./DocumentLedger.module.css";

export interface DocumentRecord {
  title: string;
  body: string;
}

interface DocumentLedgerProps {
  records: readonly DocumentRecord[];
  /** Mono label for the identifier line, e.g. "REGISTRO". */
  identifierLabel: string;
  /** Neutral verification state — never a positive state over unverified data. */
  stateLabel: string;
  stateValue: string;
}

/**
 * Quality & Documentation — documentation treated as a visual material.
 *
 * Not a four-card feature grid. Each entry is a RECORD: a framed specimen block
 * carrying a document identifier and a verification state, with the descriptive
 * text set outside the frame. The frame is what makes it read as a filed
 * document rather than a marketing tile.
 *
 * Spans are deliberately unequal (7/5, 5/7) so the ledger has grid tension and
 * never resolves into a tidy 2×2. The identifiers are structural — `NG-DOC-01`
 * is a position in this list, not a claimed archive reference — and the state is
 * the neutral pending vocabulary, never a green "verified" over data that has
 * not been verified.
 */
export function DocumentLedger({
  records,
  identifierLabel,
  stateLabel,
  stateValue,
}: DocumentLedgerProps) {
  return (
    <div className={styles.ledger}>
      {records.map((record, index) => (
        <article key={record.title} className={styles.record}>
          <div className={styles.frame}>
            <div className={styles.frameHead}>
              <Mono size="2xs" className={styles.identifierLabel}>
                {identifierLabel}
              </Mono>
              <Mono size="2xs" className={styles.identifier}>
                NG-DOC-{String(index + 1).padStart(2, "0")}
              </Mono>
            </div>

            <h3 className={styles.title}>{record.title}</h3>

            <div className={styles.state}>
              <span className={styles.stateDot} aria-hidden="true" />
              <Mono size="2xs" className={styles.stateLabel}>
                {stateLabel} — {stateValue}
              </Mono>
            </div>
          </div>

          <p className={styles.body}>{record.body}</p>
        </article>
      ))}
    </div>
  );
}
