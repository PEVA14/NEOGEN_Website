import styles from "./CitationMarks.module.css";

/**
 * [01, 03] — citation markers that go somewhere.
 *
 * Each number is a link to that reference's entry in the record's own list,
 * so a reader can check a sentence against its source in one move. The
 * visible text stays compact; the accessible name says "Reference 1", because
 * a screen reader announcing "left bracket zero one" helps nobody.
 */
export function CitationMarks({
  citations,
  anchor,
  label,
}: {
  citations: readonly number[];
  /** Builds the fragment for a reference number — `ref-01`. */
  anchor: (n: number) => string;
  /** "Referencia {n}" */
  label: string;
}) {
  if (citations.length === 0) return null;
  return (
    <span className={styles.marks}>
      [
      {citations.map((n, i) => (
        <span key={n}>
          {i > 0 ? ", " : null}
          <a
            href={`#${anchor(n)}`}
            className={styles.mark}
            aria-label={label.replace("{n}", String(n))}
          >
            {String(n).padStart(2, "0")}
          </a>
        </span>
      ))}
      ]
    </span>
  );
}
