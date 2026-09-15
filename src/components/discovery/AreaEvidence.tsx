import Link from "next/link";

import { GLYPH } from "@/components/quality/QualityRecord";
import { Mono } from "@/components/typography";

import styles from "./AreaEvidence.module.css";

import type { DocumentType } from "@/content/documents";
import type { EvidenceCoverage, EvidenceState } from "@/domain/quality";

export interface AreaEvidenceRow {
  documentId: string;
  product: string;
  productHref: string;
  /** The exact presentation the record covers, or the compound-level label. */
  scope: string;
  lot: string | null;
  type: DocumentType;
  issuer: string;
  reportId: string | null;
  date: string;
  href: string;
  external: boolean;
  /** The record's OWN states, from the resolver. Never the area's. */
  states: readonly EvidenceState[];
}

export interface AreaEvidenceCopy {
  records: string;
  compounds: string;
  presentations: string;
  caption: string;
  explorer: string;
  columns: {
    presentation: string;
    state: string;
    type: string;
    issuer: string;
    lot: string;
    date: string;
    document: string;
  };
  compound: string;
  states: Record<EvidenceState, string>;
  types: Record<DocumentType, string>;
  reportId: string;
  view: string;
  external: string;
}

/**
 * QUALITY / EVIDENCE IN AN AREA — records, never a verdict.
 *
 * WHERE NEOGEN SHOULD BE MORE PRECISE THAN A CATEGORY BADGE. A shop can print
 * "COA verified" across a category; what that sentence actually rests on is a
 * document about one strength of one compound. This section refuses the
 * shortcut in its structure:
 *
 *   - the head is three COUNTS from `evidenceCoverage` — public records, the
 *     compounds they belong to, the presentations they cover. There is no
 *     area-level state, no purity figure and no "verified" line, because the
 *     coverage type has no field that could hold one;
 *   - every row names its own compound and its own presentation or lot, and
 *     carries only the states the resolver gave THAT record. A Janoshik report
 *     on the 10 mg shows "Janoshik verified" on the 10 mg row and nowhere else.
 *
 * States here carry `data-area-evidence-state`, deliberately not the product
 * page's `data-evidence-state`, so `check:output` can count each surface
 * against the resolver separately.
 *
 * Omitted by the page when there are no records — which is today, for all
 * eight areas, and is the correct output.
 */
export function AreaEvidence({
  rows,
  coverage,
  explorerHref,
  copy,
}: {
  rows: readonly AreaEvidenceRow[];
  coverage: EvidenceCoverage;
  explorerHref: string;
  copy: AreaEvidenceCopy;
}) {
  return (
    <div className={styles.evidence}>
      <dl className={styles.figures}>
        {(
          [
            [copy.records, coverage.records],
            [copy.compounds, coverage.compounds],
            [copy.presentations, coverage.presentations],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className={styles.figure}>
            <Mono as="dt" size="2xs" className={styles.label}>
              {label}
            </Mono>
            <dd className={styles.value}>{String(value).padStart(2, "0")}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.tableWrap} tabIndex={0} role="group" aria-label={copy.caption}>
        <table className={styles.table}>
          <caption className={styles.caption}>{copy.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.compound}</th>
              <th scope="col">{copy.columns.presentation}</th>
              <th scope="col">{copy.columns.state}</th>
              <th scope="col">{copy.columns.type}</th>
              <th scope="col">{copy.columns.issuer}</th>
              <th scope="col">{copy.columns.lot}</th>
              <th scope="col">{copy.columns.date}</th>
              <th scope="col">{copy.columns.document}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.documentId}>
                <th scope="row">
                  <Link href={row.productHref} className={styles.link}>
                    {row.product}
                  </Link>
                </th>
                <td>{row.scope}</td>
                <td>
                  <ul className={styles.states}>
                    {row.states.map((state) => (
                      <li key={state} data-area-evidence-state={state}>
                        <span aria-hidden="true">{GLYPH[state]}</span> {copy.states[state]}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>{copy.types[row.type]}</td>
                <td>
                  {row.issuer}
                  {row.reportId ? (
                    <Mono size="2xs" className={styles.report}>
                      {copy.reportId} {row.reportId}
                    </Mono>
                  ) : null}
                </td>
                <td className={styles.mono}>{row.lot ?? "—"}</td>
                <td className={styles.mono}>{row.date}</td>
                <td>
                  <a
                    href={row.href}
                    className={styles.link}
                    {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    aria-label={`${copy.view} — ${copy.types[row.type]} — ${row.product} ${row.scope}${
                      row.external ? ` (${copy.external})` : ""
                    }`}
                  >
                    {copy.view}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href={explorerHref} className={styles.explorer}>
        {copy.explorer} →
      </Link>
    </div>
  );
}
