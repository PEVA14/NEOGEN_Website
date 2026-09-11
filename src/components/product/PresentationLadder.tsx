import { Mono } from "@/components/typography";

import styles from "./PresentationLadder.module.css";

export interface LadderStep {
  /** The number set large — "10". */
  value: string;
  /** The unit set small beside it — "mg", "ml", "IU", or "mg + mg" for blends. */
  unit: string;
  /** Vials per pack, where the catalogue states it. */
  vials: number | null;
}

/**
 * THE PRESENTATION LADDER — the product's own facts, set as figures.
 *
 * Every value here is class B: stated by the catalogue, true of the product,
 * checkable. Nothing is interpreted. What changes is the TREATMENT: instead of
 * "5 mg · 10 mg · 15 mg" buried in a table cell, the ladder is set as a row of
 * oversized numerals on a hairline, so the range a compound comes in is the
 * first thing the specifications section says.
 *
 * No bars, no proportional lengths. Mixed units (mg, IU, ml) cannot share a
 * scale, and a bar chart of strengths would suggest a comparison the
 * catalogue does not make.
 */
export function PresentationLadder({
  steps,
  label,
  packLabel,
}: {
  steps: readonly LadderStep[];
  label: string;
  /** "× {n} viales" */
  packLabel: string;
}) {
  return (
    <ol className={styles.ladder} aria-label={label}>
      {steps.map((step, index) => (
        <li key={`${step.value}-${step.unit}-${index}`} className={styles.step}>
          <Mono size="2xs" className={styles.index} aria-hidden="true">
            P-{String(index + 1).padStart(2, "0")}
          </Mono>
          <span className={styles.figure}>
            <span className={styles.value}>{step.value}</span>
            <span className={styles.unit}>{step.unit}</span>
          </span>
          {step.vials !== null ? (
            <Mono size="2xs" className={styles.pack}>
              {packLabel.replace("{n}", String(step.vials))}
            </Mono>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
