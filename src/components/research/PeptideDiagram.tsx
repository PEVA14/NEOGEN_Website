import styles from "./PeptideDiagram.module.css";

export interface PeptideDiagramCopy {
  label: string;
  aminoAcid: string;
  bond: string;
  nTerm: string;
  cTerm: string;
  sequence: string;
  scale: { label: string; aminoAcid: string; peptide: string; protein: string };
  /** The three names — amino acid, peptide, protein — in that order. */
  names: readonly string[];
}

/** Units in the drawn chain. Seven reads as "a chain", not as a count. */
const UNITS = 7;
/** Dots in the peptide scale glyph — "tens", drawn, not a claimed length. */
const PEPTIDE_DOTS = 18;

/**
 * FROM AMINO ACID TO PROTEIN — a diagram of the definition, nothing more.
 *
 * DRAWN IN HTML AND CSS, NOT AS ONE SVG, on purpose: an SVG scaled to a
 * phone's width shrinks its labels with it, and a diagram whose words you
 * cannot read has failed at the one job it has. Here the shapes are boxes and
 * the labels are text, so the labels stay at reading size on any screen, and
 * the chain simply shows fewer units on a narrow one.
 *
 * It is a SCHEMATIC: the units carry no amino-acid names and no sequence,
 * because a real sequence would be a statement about a real molecule. The
 * figure is `role="img"` with a full text alternative; the numbered legend is
 * the same information for sighted readers.
 */
export function PeptideDiagram({ copy }: { copy: PeptideDiagramCopy }) {
  const alt = `${copy.label}: ${copy.nTerm} → ${copy.aminoAcid} — ${copy.bond} — … → ${copy.cTerm}. ${copy.sequence}.`;
  return (
    <figure className={styles.figure}>
      <div className={styles.chainWrap}>
        <div className={styles.chain} role="img" aria-label={alt}>
          <span className={styles.end}>N</span>
          {Array.from({ length: UNITS }, (_, i) => (
            <span key={i} className={styles.link} data-index={i}>
              {i > 0 ? (
                <span className={styles.bond} data-marked={i === 2 ? "true" : undefined}>
                  {i === 2 ? (
                    <span className={styles.marker} aria-hidden="true">
                      2
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span className={styles.unit} data-marked={i === 1 ? "true" : undefined}>
                {i === 1 ? (
                  <span className={styles.marker} aria-hidden="true">
                    1
                  </span>
                ) : null}
              </span>
            </span>
          ))}
          <span className={styles.end}>C</span>
        </div>
        <div className={styles.span} aria-hidden="true">
          <span className={styles.spanRule} />
        </div>
      </div>

      <figcaption className={styles.caption}>
        <ol className={styles.legend}>
          <li>
            <span className={styles.key} aria-hidden="true">
              1
            </span>
            {copy.aminoAcid}
          </li>
          <li>
            <span className={styles.key} aria-hidden="true">
              2
            </span>
            {copy.bond}
          </li>
          <li>
            <span className={styles.key} aria-hidden="true">
              N
            </span>
            {copy.nTerm}
          </li>
          <li>
            <span className={styles.key} aria-hidden="true">
              C
            </span>
            {copy.cTerm}
          </li>
        </ol>
        <p className={styles.sequence}>{copy.sequence}</p>
      </figcaption>

      {/* Three scales: one unit, a chain of tens, a folded chain of hundreds. */}
      <div className={styles.scales}>
        <p className={styles.scalesLabel}>{copy.scale.label}</p>
        <ol className={styles.scaleList}>
          <li className={styles.scale}>
            <span className={styles.glyph} aria-hidden="true">
              <span className={styles.dot} />
            </span>
            <span className={styles.scaleText}>{copy.names[0]}</span>
            <span className={styles.scaleMeta}>{copy.scale.aminoAcid}</span>
          </li>
          <li className={styles.scale}>
            <span className={styles.glyph} aria-hidden="true">
              <span className={styles.dots}>
                {Array.from({ length: PEPTIDE_DOTS }, (_, i) => (
                  <span key={i} className={styles.dot} data-size="sm" />
                ))}
              </span>
            </span>
            <span className={styles.scaleText}>{copy.names[1]}</span>
            <span className={styles.scaleMeta}>{copy.scale.peptide}</span>
          </li>
          <li className={styles.scale}>
            <span className={styles.glyph} aria-hidden="true">
              <svg viewBox="0 0 120 80" className={styles.fold} focusable="false">
                <path d="M8 60 C 8 20, 40 10, 52 30 S 30 70, 60 66 S 100 40, 84 22 S 50 8, 70 44 S 112 70, 112 52 S 96 12, 30 44 S 20 74, 44 74" />
              </svg>
            </span>
            <span className={styles.scaleText}>{copy.names[2]}</span>
            <span className={styles.scaleMeta}>{copy.scale.protein}</span>
          </li>
        </ol>
      </div>
    </figure>
  );
}
