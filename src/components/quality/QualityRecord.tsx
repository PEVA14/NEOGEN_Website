import { Body, Mono } from "@/components/typography";

import { EvidenceChain, type EvidenceChainCopy } from "./EvidenceChain";
import styles from "./QualityRecord.module.css";

import type { DocumentType } from "@/content/documents";
import type { EvidenceRecord, EvidenceState, ProductEvidence } from "@/domain/quality";

export interface QualityRecordCopy {
  panelLabel: string;
  coverageLabel: string;
  /** "{n} de {total} presentaciones con documentación pública" */
  coverage: string;
  emptyTitle: string;
  emptyBody: string;
  tableCaption: string;
  columns: {
    presentation: string;
    state: string;
    type: string;
    issuer: string;
    lot: string;
    date: string;
    document: string;
  };
  noRecord: string;
  compoundLevel: string;
  states: Record<EvidenceState, string>;
  types: Record<DocumentType, string>;
  issuerRoles: Record<"independent-laboratory" | "manufacturer" | "supplier" | "neogen", string>;
  reportId: string;
  view: string;
  external: string;
  chain: EvidenceChainCopy;
}

export interface QualityPresentation {
  variantId: string;
  label: string;
}

/* A distinct SHAPE per state, so the ledger reads in greyscale. */
const GLYPH: Record<EvidenceState, string> = {
  "documentation-available": "□",
  "coa-available": "◇",
  "lot-coa": "◆",
  "third-party-tested": "△",
  "janoshik-verified": "▲",
};

/**
 * QUALITY / DOCUMENTATION — "what evidence exists for this presentation?"
 *
 * A LEDGER, NOT A BADGE ROW. The question a careful buyer asks is not "is this
 * product verified" but "is THIS strength, from THIS lot, documented — by whom,
 * when, and can I read it". So evidence is laid out per presentation, as a
 * real table with every presentation in the ladder, including the ones with
 * nothing. A reader sees that the 10 mg carries a report and the 60 mg does
 * not, instead of inferring coverage from a product-level mark.
 *
 * EVERY STATE COMES FROM `resolveEvidence`. This component cannot invent one:
 * it receives the resolver's output and renders exactly that, and the
 * `data-evidence-state` attribute on each state cell is what
 * `check:output` counts against the resolver.
 *
 * THE EMPTY STATE IS DESIGNED, not pending. With no public document — every
 * product today — the block states that plainly, once, and shows the chain
 * evidence will follow. No "coming soon", no hollow badge, no row of
 * "unavailable" placeholders pretending to be structure.
 */
export function QualityRecord({
  presentations,
  evidence,
  copy,
  localeTag,
}: {
  presentations: readonly QualityPresentation[];
  evidence: ProductEvidence;
  copy: QualityRecordCopy;
  localeTag: string;
}) {
  const covered = evidence.presentations.filter((p) => p.records.length > 0).length;
  const labelFor = (variantId: string | null) =>
    presentations.find((p) => p.variantId === variantId)?.label ?? "—";
  const date = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" }).format(new Date(iso)) : "—";

  if (!evidence.hasEvidence) {
    return (
      <div className={styles.record} data-empty="true">
        <div className={styles.emptyPlate}>
          <Mono size="2xs" className={styles.panelLabel}>
            {copy.panelLabel}
          </Mono>
          <p className={styles.emptyTitle}>{copy.emptyTitle}</p>
          <Body tone="muted" className={styles.emptyBody}>
            {copy.emptyBody}
          </Body>
        </div>
        <EvidenceChain copy={copy.chain} resolvedTo={null} />
      </div>
    );
  }

  const issuerLabel = (record: EvidenceRecord) =>
    record.issuer.name ?? copy.issuerRoles[record.issuer.kind];

  return (
    <div className={styles.record}>
      <div className={styles.panel}>
        <Mono size="2xs" className={styles.panelLabel}>
          {copy.panelLabel}
        </Mono>
        <p className={styles.figure}>
          <span className={styles.figureValue}>{String(covered).padStart(2, "0")}</span>
          <span className={styles.figureOf}>/ {String(presentations.length).padStart(2, "0")}</span>
        </p>
        <Mono size="2xs" className={styles.coverage}>
          {copy.coverage
            .replace("{n}", String(covered))
            .replace("{total}", String(presentations.length))}
        </Mono>
      </div>

      <div className={styles.tableWrap} tabIndex={0} role="group" aria-label={copy.tableCaption}>
        <table className={styles.table}>
          <caption className={styles.caption}>{copy.tableCaption}</caption>
          <thead>
            <tr>
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
            {evidence.presentations.flatMap((presentation) => {
              const label = labelFor(presentation.variantId);
              if (presentation.records.length === 0) {
                return [
                  <tr key={presentation.variantId} data-empty="true">
                    <th scope="row">{label}</th>
                    <td colSpan={6} className={styles.noRecord}>
                      {copy.noRecord}
                    </td>
                  </tr>,
                ];
              }
              return presentation.records.map((record, i) => (
                <RecordRow
                  key={`${presentation.variantId}-${record.documentId}`}
                  record={record}
                  rowLabel={i === 0 ? label : null}
                  rowSpan={i === 0 ? presentation.records.length : 0}
                  issuer={issuerLabel(record)}
                  date={date(record.issuedOn)}
                  copy={copy}
                  presentationLabel={label}
                />
              ));
            })}
            {evidence.product.map((record, i) => (
              <RecordRow
                key={`product-${record.documentId}`}
                record={record}
                rowLabel={i === 0 ? copy.compoundLevel : null}
                rowSpan={i === 0 ? evidence.product.length : 0}
                issuer={issuerLabel(record)}
                date={date(record.issuedOn)}
                copy={copy}
                presentationLabel={copy.compoundLevel}
              />
            ))}
          </tbody>
        </table>
      </div>

      <EvidenceChain
        copy={copy.chain}
        resolvedTo={
          evidence.presentations.some((p) => p.records.some((r) => r.level === "lot"))
            ? "lot"
            : evidence.presentations.some((p) => p.records.length > 0)
              ? "variant"
              : "product"
        }
      />
    </div>
  );
}

function RecordRow({
  record,
  rowLabel,
  rowSpan,
  issuer,
  date,
  copy,
  presentationLabel,
}: {
  record: EvidenceRecord;
  rowLabel: string | null;
  rowSpan: number;
  issuer: string;
  date: string;
  copy: QualityRecordCopy;
  presentationLabel: string;
}) {
  const strongest = record.states[record.states.length - 1];
  return (
    <tr>
      {rowLabel !== null ? (
        <th scope="rowgroup" rowSpan={rowSpan}>
          {rowLabel}
        </th>
      ) : null}
      <td>
        <ul className={styles.states}>
          {record.states.map((state) => (
            <li key={state} data-evidence-state={state} className={styles.state}>
              <span className={styles.glyph} aria-hidden="true">
                {GLYPH[state]}
              </span>
              {copy.states[state]}
            </li>
          ))}
        </ul>
      </td>
      <td>{copy.types[record.type]}</td>
      <td>
        {issuer}
        {record.reportId ? (
          <Mono size="2xs" className={styles.reportId}>
            {copy.reportId} {record.reportId}
          </Mono>
        ) : null}
      </td>
      <td className={styles.mono}>{record.lot?.id ?? "—"}</td>
      <td className={styles.mono}>{date}</td>
      <td>
        <a
          className={styles.view}
          href={record.href}
          {...(record.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={`${copy.view} — ${copy.types[record.type]} — ${presentationLabel}${
            record.external ? ` (${copy.external})` : ""
          }`}
          data-strongest={strongest}
        >
          {copy.view}
          {record.file ? (
            <Mono size="2xs" className={styles.fileMeta}>
              {record.file.format} · {record.file.size}
            </Mono>
          ) : null}
        </a>
      </td>
    </tr>
  );
}
