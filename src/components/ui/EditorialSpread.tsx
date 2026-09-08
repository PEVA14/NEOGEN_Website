import { Mono } from "@/components/typography";

import styles from "./EditorialSpread.module.css";

export interface SpreadPrinciple {
  title: string;
  body: string;
}

interface EditorialSpreadProps {
  /** Oversized index numeral, set as a graphic element. */
  index: string;
  label: string;
  title: string;
  titleId: string;
  lede: string;
  principles: readonly SpreadPrinciple[];
}

/**
 * 01 — the editorial spread that establishes NEOGEN's Quiet voice.
 *
 * The move here is a two-column spread rather than a header stacked on three
 * equal columns. The left rail holds an OVERSIZED index numeral as a graphic
 * mark, the title set large beneath it; the right column carries the lede and
 * then the principles as hanging-indent entries separated by rules.
 *
 * That asymmetry — a heavy, near-empty left rail against a dense right column —
 * is what gives a text-only section composition. Nothing is decorated; the
 * interest comes from proportion and from how much space the numeral is allowed
 * to waste.
 *
 * This is the section every other Quiet section is measured against, so it is
 * deliberately the most restrained of them.
 */
export function EditorialSpread({
  index,
  label,
  title,
  titleId,
  lede,
  principles,
}: EditorialSpreadProps) {
  return (
    <div className={styles.spread}>
      <div className={styles.rail}>
        <span className={styles.numeral} aria-hidden="true">
          {index}
        </span>
        <Mono size="2xs" className={styles.label}>
          / {label}
        </Mono>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      </div>

      <div className={styles.column}>
        <p className={styles.lede}>{lede}</p>

        <dl className={styles.principles}>
          {principles.map((principle, position) => (
            <div key={principle.title} className={styles.principle}>
              <Mono size="2xs" className={styles.principleIndex} aria-hidden="true">
                {String(position + 1).padStart(2, "0")}
              </Mono>
              <dt className={styles.principleTitle}>{principle.title}</dt>
              <dd className={styles.principleBody}>{principle.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
