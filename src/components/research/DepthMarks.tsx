import styles from "./DepthMarks.module.css";

export interface RecordDepth {
  mechanism: number;
  research: number;
  notes: number;
  references: number;
}

export interface DepthMarksCopy {
  label: string;
  mechanism: string;
  research: string;
  notes: string;
  references: string;
  none: string;
}

/**
 * HOW MUCH A RECORD HOLDS, BEFORE YOU OPEN IT.
 *
 * Four marks — mechanism, published research, technical notes, references —
 * each filled when that section of the record exists. It answers the scanning
 * reader's real question ("is there anything behind this name?") in the width
 * of a word, and it is COUNTED from the record, so it can never flatter one.
 *
 * Not a score. Four filled marks do not mean better evidence, only more
 * sections; the counts are in the accessible name and in the quick view.
 * Shape carries the state (filled / hollow), so it reads without colour.
 */
export function DepthMarks({ depth, copy }: { depth: RecordDepth | null; copy: DepthMarksCopy }) {
  if (!depth) {
    return (
      <span className={styles.none} role="img" aria-label={copy.none}>
        —
      </span>
    );
  }
  const marks = [
    ["mechanism", depth.mechanism],
    ["research", depth.research],
    ["notes", depth.notes],
    ["references", depth.references],
  ] as const;
  const name = `${copy.label}: ${marks
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `${copy[key]} ${n}`)
    .join(", ")}`;

  return (
    <span className={styles.marks} role="img" aria-label={name}>
      {marks.map(([key, n]) => (
        <span key={key} className={styles.mark} data-filled={n > 0 ? "true" : undefined} />
      ))}
    </span>
  );
}
