"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import styles from "./QuickRecord.module.css";

import type { QuickRecordData, QuickSource, QuickStatement } from "./quickRecordData";

export type QuickView = "overview" | "evidence" | "safety" | "sources";
export const QUICK_VIEWS: readonly QuickView[] = ["overview", "evidence", "safety", "sources"];

export interface QuickRecordCopy {
  tabsLabel: string;
  tabs: Record<QuickView, string>;
  loading: string;
  error: string;
  retry: string;
  strip: {
    claims: string;
    claim: string;
    sources: string;
    source: string;
    noRecord: string;
  };
  overview: {
    lead: string;
    studiedIn: string;
    areas: string;
    lines: string;
    contents: string;
    identity: string;
    identityNone: string;
    identityFormula: string;
    identityMass: string;
    identitySequence: string;
    identityCas: string;
    identitySource: string;
    terms: string;
    noRecord: string;
  };
  product: {
    label: string;
    note: string;
    presentations: string;
    noPrice: string;
    docs: string;
    docsNone: string;
    docsCounts: string;
    docsLink: string;
  };
  evidence: {
    mechanism: string;
    findings: string;
    areas: string;
    inRecord: string;
    moved: string;
  };
  safety: {
    status: string;
    safety: string;
    safetyNone: string;
    limits: string;
    note: string;
    noteHint: string;
  };
  sources: {
    lede: string;
    citedBy: string;
    open: string;
    noLink: string;
  };
  cite: {
    show: string;
    seeInSources: string;
  };
  labels: { mechanism: string; research: string; area: string };
  researchUse: { label: string; statement: string; readMore: string; href: string };
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? String(values[key]) : m));

const pad = (n: number) => String(n).padStart(2, "0");

/** Human names for statements, so "cited in" reads "Mecanismo 1", "Piel 2". */
function statementLabels(
  statements: readonly QuickStatement[],
  labels: QuickRecordCopy["labels"],
): Map<string, string> {
  const out = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const s of statements) {
    const key = s.section === "area" ? `area:${s.area}` : s.section;
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    out.set(
      s.id,
      s.section === "area"
        ? fill(labels.area, { area: s.area ?? "", n })
        : fill(s.section === "mechanism" ? labels.mechanism : labels.research, { n }),
    );
  }
  return out;
}

/**
 * THE QUICK RECORD — a compound's research, readable without leaving the index.
 *
 * FOUR VIEWS, FROM WHAT A RECORD ACTUALLY HOLDS:
 *
 *   Resumen      what it is, the source's own first sentence about it, where
 *                it is studied, how much the record contains — and, set apart,
 *                NEOGEN's product and the documentation of NEOGEN's material
 *   Evidencia    every sourced mechanism and research statement
 *   Seguridad    the research-use status, then statements the record tags as
 *   y límites    reporting adverse events, safety or regulatory status, and
 *                statements about the limits of the evidence — or, when there
 *                are none, a sentence that says absence is not safety
 *   Fuentes      the numbered references, each with the statements that cite it
 *
 * CLAIM → SOURCE IN PLACE. Every citation marker is a button: it opens the
 * source under the sentence (title, authors, journal, identifiers, a link to
 * read it) without a page change, and from there "Ver en Fuentes" jumps to
 * the numbered list. Every source lists the statements that cite it, and
 * each of those jumps back. The full record is one link away throughout.
 *
 * A TABLIST, because the views are alternatives. Arrow keys move between
 * tabs (and stop there, so they do not also step to the next compound).
 */
export function QuickRecord({
  data,
  status,
  view,
  onView,
  onRetry,
  copy,
  studiedIn,
}: {
  data: QuickRecordData | null;
  status: "loading" | "ready" | "error";
  view: QuickView;
  onView: (view: QuickView) => void;
  onRetry: () => void;
  copy: QuickRecordCopy;
  /** From the index row: the areas and the research lines, linked. */
  studiedIn: {
    areas: readonly { id: string; label: string }[];
    lines: readonly { id: string; label: string; href: string }[];
  };
}) {
  const base = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [openCite, setOpenCite] = useState<string | null>(null);
  /* A jump's destination, and a counter so the same view re-runs the jump. */
  const pendingFocus = useRef<string | null>(null);
  const [jump, setJump] = useState(0);

  const record = data?.record ?? null;
  const statements = record?.statements ?? [];
  const findings = statements.filter((s) => s.aspect === null);
  const safetyStatements = statements.filter((s) => s.aspect === "safety");
  const limitStatements = statements.filter((s) => s.aspect === "limits");
  const labels = statementLabels(statements, copy.labels);
  const sourcesByN = new Map((record?.sources ?? []).map((s) => [s.n, s]));

  const counts: Record<QuickView, number | null> = {
    overview: null,
    evidence: findings.length,
    safety: safetyStatements.length + limitStatements.length + (record?.notes.length ?? 0),
    sources: record?.sources.length ?? 0,
  };

  /* A jump (cite → source, source → statement) focuses its target once the
     view has rendered, and scrolls it into the panel's view. */
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = document.getElementById(target);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }, [jump, view]);

  /* On a phone the tabs scroll sideways; the selected one — set by a deep
     link or a jump, not only a tap — is scrolled into the strip. Horizontal
     only: the sheet itself never moves. */
  useEffect(() => {
    const tab = tabRefs.current[QUICK_VIEWS.indexOf(view)];
    const list = tab?.parentElement;
    if (!tab || !list) return;
    const t = tab.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    if (t.left < l.left) list.scrollLeft -= l.left - t.left + 16;
    else if (t.right > l.right) list.scrollLeft += t.right - l.right + 16;
  }, [view, record]);

  /* Switching view on purpose starts it at the top. */
  const switchTo = (next: QuickView, target?: string) => {
    setOpenCite(null);
    onView(next);
    if (target) {
      pendingFocus.current = target;
      setJump((n) => n + 1);
    } else panelRef.current?.scrollTo({ top: 0 });
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = QUICK_VIEWS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    switchTo(QUICK_VIEWS[next]);
    tabRefs.current[next]?.focus();
  };

  /* ---- a statement with its citations ---------------------------------- */
  const statementEl = (s: QuickStatement, showLabel = false) => {
    const expanded = openCite?.startsWith(`${s.id}:`) ? Number(openCite.split(":")[1]) : null;
    const source = expanded ? sourcesByN.get(expanded) : undefined;
    return (
      <li key={s.id} className={styles.statement}>
        <div id={`qr-st-${s.id}`} tabIndex={-1} className={styles.statementBody}>
          {showLabel ? <p className={styles.statementLabel}>{labels.get(s.id)}</p> : null}
          <p className={styles.statementText}>
            {s.text}{" "}
            <span className={styles.cites}>
              {s.citations.map((n) => {
                const key = `${s.id}:${n}`;
                const on = openCite === key;
                return (
                  <button
                    key={n}
                    type="button"
                    className={styles.cite}
                    aria-expanded={on}
                    aria-controls={`qr-inline-${s.id}`}
                    aria-label={fill(copy.cite.show, { n: pad(n) })}
                    data-on={on ? "true" : undefined}
                    onClick={() => setOpenCite(on ? null : key)}
                  >
                    [{pad(n)}]
                  </button>
                );
              })}
            </span>
          </p>
        </div>
        <div id={`qr-inline-${s.id}`} className={styles.inline} hidden={!source}>
          {source ? (
            <SourceCard
              source={source}
              copy={copy}
              compact
              footer={
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => switchTo("sources", `qr-src-${source.n}`)}
                >
                  {copy.cite.seeInSources} <span aria-hidden="true">→</span>
                </button>
              }
            />
          ) : null}
        </div>
      </li>
    );
  };

  const block = (title: string, items: readonly QuickStatement[], href?: string, label = false) =>
    items.length === 0 ? null : (
      <section className={styles.block}>
        <header className={styles.blockHead}>
          <h3 className={styles.blockTitle}>{title}</h3>
          {href ? (
            <Link href={href} className={styles.textLink}>
              {copy.evidence.inRecord} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </header>
        <ol className={styles.statements}>{items.map((s) => statementEl(s, label))}</ol>
      </section>
    );

  /* ---- loading / error ------------------------------------------------- */
  if (status === "loading" && !data) {
    return (
      <div className={styles.state} role="status">
        <span className={styles.skeleton} aria-hidden="true" />
        <span className={styles.skeleton} aria-hidden="true" data-short="true" />
        <span className={styles.skeleton} aria-hidden="true" />
        <span className={styles.srOnly}>{copy.loading}</span>
      </div>
    );
  }
  if (status === "error" || !data) {
    return (
      <div className={styles.state} role="alert">
        <p className={styles.muted}>{copy.error}</p>
        <button type="button" className={styles.retry} onClick={onRetry}>
          {copy.retry}
        </button>
      </div>
    );
  }

  /* ---- the four views --------------------------------------------------- */
  const mechanism = findings.filter((s) => s.section === "mechanism");
  const research = findings.filter((s) => s.section === "research");
  const byArea = findings.filter((s) => s.section === "area");
  const lead = mechanism[0] ?? research[0] ?? byArea[0] ?? null;

  const overview = (
    <>
      {record ? (
        <>
          {record.summary ? <p className={styles.summary}>{record.summary}</p> : null}
          {lead ? (
            <section className={styles.block}>
              <header className={styles.blockHead}>
                <h3 className={styles.blockTitle}>{copy.overview.lead}</h3>
              </header>
              <ol className={styles.statements}>{statementEl(lead, true)}</ol>
            </section>
          ) : null}

          <section className={styles.block}>
            <header className={styles.blockHead}>
              <h3 className={styles.blockTitle}>{copy.overview.contents}</h3>
            </header>
            <ul className={styles.contents}>
              {(["evidence", "safety", "sources"] as const).map((v) => (
                <li key={v}>
                  <button
                    type="button"
                    className={styles.contentsRow}
                    onClick={() => switchTo(v)}
                    disabled={counts[v] === 0}
                  >
                    <span>{copy.tabs[v]}</span>
                    <span className={styles.contentsCount}>
                      {counts[v] === 0 ? "—" : counts[v]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {studiedIn.areas.length + studiedIn.lines.length > 0 ? (
            <section className={styles.block}>
              <header className={styles.blockHead}>
                <h3 className={styles.blockTitle}>{copy.overview.studiedIn}</h3>
              </header>
              <dl className={styles.facts}>
                {studiedIn.areas.length > 0 ? (
                  <div>
                    <dt>{copy.overview.areas}</dt>
                    <dd>{studiedIn.areas.map((a) => a.label).join(" · ")}</dd>
                  </div>
                ) : null}
                {studiedIn.lines.length > 0 ? (
                  <div>
                    <dt>{copy.overview.lines}</dt>
                    <dd>
                      {studiedIn.lines.map((l, i) => (
                        <span key={l.id}>
                          {i > 0 ? " · " : null}
                          <Link href={l.href} className={styles.textLink}>
                            {l.label}
                          </Link>
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          {record.terms.length > 0 ? (
            <section className={styles.block}>
              <header className={styles.blockHead}>
                <h3 className={styles.blockTitle}>{copy.overview.terms}</h3>
              </header>
              <p className={styles.inlineLinks}>
                {record.terms.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 ? " · " : null}
                    <Link href={t.href} className={styles.textLink}>
                      {t.label}
                    </Link>
                  </span>
                ))}
              </p>
            </section>
          ) : null}

          <section className={styles.block}>
            <header className={styles.blockHead}>
              <h3 className={styles.blockTitle}>{copy.overview.identity}</h3>
            </header>
            {record.identity ? (
              <dl className={styles.facts}>
                {record.identity.formula ? (
                  <div>
                    <dt>{copy.overview.identityFormula}</dt>
                    <dd className={styles.mono}>{record.identity.formula}</dd>
                  </div>
                ) : null}
                {record.identity.mass ? (
                  <div>
                    <dt>{copy.overview.identityMass}</dt>
                    <dd className={styles.mono}>{record.identity.mass}</dd>
                  </div>
                ) : null}
                {record.identity.sequence ? (
                  <div>
                    <dt>{copy.overview.identitySequence}</dt>
                    <dd className={styles.mono}>{record.identity.sequence}</dd>
                  </div>
                ) : null}
                {record.identity.cas ? (
                  <div>
                    <dt>{copy.overview.identityCas}</dt>
                    <dd className={styles.mono}>{record.identity.cas}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{copy.overview.identitySource}</dt>
                  <dd>
                    {record.identity.sourceUrl ? (
                      <a
                        href={record.identity.sourceUrl}
                        className={styles.textLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {record.identity.source} ↗
                      </a>
                    ) : (
                      record.identity.source
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className={styles.muted}>{copy.overview.identityNone}</p>
            )}
          </section>
        </>
      ) : (
        <p className={styles.absence}>{copy.overview.noRecord}</p>
      )}

      {/* NEOGEN's product — commercial facts, set apart from the science. */}
      <section className={styles.productZone} aria-labelledby={`${base}-product`}>
        <header className={styles.zoneHead}>
          <h3 id={`${base}-product`} className={styles.zoneTitle}>
            {copy.product.label}
          </h3>
          <p className={styles.zoneNote}>{copy.product.note}</p>
        </header>
        <dl className={styles.facts}>
          <div>
            <dt>{copy.product.presentations}</dt>
            <dd>
              <ul className={styles.presentations}>
                {data.product.presentations.map((p) => (
                  <li key={p.label}>
                    <span>{p.label}</span>
                    <span className={styles.price}>{p.price ?? copy.product.noPrice}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>{copy.product.docs}</dt>
            <dd>
              {data.docs.product + data.docs.presentation + data.docs.lot === 0 ? (
                <span className={styles.muted}>{copy.product.docsNone}</span>
              ) : (
                <span className={styles.mono}>
                  {fill(copy.product.docsCounts, {
                    p: data.docs.product,
                    v: data.docs.presentation,
                    l: data.docs.lot,
                  })}
                </span>
              )}{" "}
              <Link href={data.docs.href} className={styles.textLink}>
                {copy.product.docsLink} <span aria-hidden="true">→</span>
              </Link>
            </dd>
          </div>
        </dl>
      </section>
    </>
  );

  const evidence = record ? (
    <>
      {block(copy.evidence.mechanism, mechanism, `${record.href}#mecanismo`)}
      {block(copy.evidence.findings, research, `${record.href}#investigacion`)}
      {block(copy.evidence.areas, byArea, `${record.href}#por-area`, true)}
      {safetyStatements.length + limitStatements.length > 0 ? (
        <button type="button" className={styles.moved} onClick={() => switchTo("safety")}>
          {fill(copy.evidence.moved, { n: safetyStatements.length + limitStatements.length })}{" "}
          <span aria-hidden="true">→</span>
        </button>
      ) : null}
    </>
  ) : null;

  const safety = (
    <>
      <section className={styles.status}>
        <p className={styles.statusLabel}>{copy.safety.status}</p>
        <p className={styles.statusTitle}>{copy.researchUse.label}</p>
        <p className={styles.statusBody}>
          {copy.researchUse.statement}{" "}
          <Link href={copy.researchUse.href} className={styles.textLink}>
            {copy.researchUse.readMore}
          </Link>
        </p>
      </section>
      {safetyStatements.length > 0 ? (
        block(copy.safety.safety, safetyStatements)
      ) : (
        <section className={styles.block}>
          <header className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{copy.safety.safety}</h3>
          </header>
          <p className={styles.absence}>{copy.safety.safetyNone}</p>
        </section>
      )}
      {block(copy.safety.limits, limitStatements)}
      {record && record.notes.length > 0 ? (
        <section className={styles.block}>
          <header className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{copy.safety.note}</h3>
          </header>
          <p className={styles.muted}>{copy.safety.noteHint}</p>
          {record.notes.map((note, i) => (
            <p key={i} className={styles.note}>
              {note}
            </p>
          ))}
        </section>
      ) : null}
    </>
  );

  const sources = record ? (
    <>
      <p className={styles.muted}>{copy.sources.lede}</p>
      <ol className={styles.sourceList}>
        {record.sources.map((source) => (
          <li key={source.n} id={`qr-src-${source.n}`} tabIndex={-1} className={styles.sourceItem}>
            <SourceCard
              source={source}
              copy={copy}
              footer={
                source.citedBy.length > 0 ? (
                  <p className={styles.citedBy}>
                    <span className={styles.citedByLabel}>{copy.sources.citedBy}</span>
                    {source.citedBy.map((id) => {
                      const st = statements.find((s) => s.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={styles.textButton}
                          onClick={() =>
                            switchTo(st?.aspect ? "safety" : "evidence", `qr-st-${id}`)
                          }
                        >
                          {labels.get(id)}
                        </button>
                      );
                    })}
                  </p>
                ) : null
              }
            />
          </li>
        ))}
      </ol>
    </>
  ) : null;

  const panels: Record<QuickView, ReactNode> = { overview, evidence, safety, sources };

  /* No record: one view, no tabs — the drawer does not offer empty rooms. */
  if (!record) {
    return (
      <div ref={panelRef} className={styles.panel}>
        {overview}
        {safety}
      </div>
    );
  }

  return (
    <>
      <div role="tablist" aria-label={copy.tabsLabel} className={styles.tabs}>
        {QUICK_VIEWS.map((v, i) => (
          <button
            key={v}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${v}`}
            aria-selected={view === v}
            aria-controls={`${base}-panel`}
            tabIndex={view === v ? 0 : -1}
            className={styles.tab}
            onClick={() => switchTo(v)}
            onKeyDown={(event) => onTabKey(event, i)}
          >
            {/* Name first in the DOM, so a tab is announced "Evidence 4";
                the index and count are drawn above it. */}
            <span className={styles.tabLabel}>{copy.tabs[v]}</span>
            <span className={styles.tabMeta}>
              <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              {counts[v] !== null ? <span className={styles.tabCount}>{counts[v]}</span> : null}
            </span>
          </button>
        ))}
      </div>
      <div
        ref={panelRef}
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${view}`}
        tabIndex={0}
        className={styles.panel}
      >
        {panels[view]}
      </div>
    </>
  );
}

/** One source, as the literature identifies it. Never a summary of it. */
function SourceCard({
  source,
  copy,
  compact = false,
  footer,
}: {
  source: QuickSource;
  copy: QuickRecordCopy;
  compact?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className={styles.source} data-compact={compact ? "true" : undefined}>
      <p className={styles.sourceMeta}>
        <span className={styles.sourceN}>[{pad(source.n)}]</span>{" "}
        {[source.type, source.year, source.publication].filter(Boolean).join(" · ")}
      </p>
      <p className={styles.sourceTitle}>{source.title}</p>
      {source.authors ? <p className={styles.sourceAuthors}>{source.authors}</p> : null}
      <p className={styles.sourceIds}>
        {source.doi ? <span>DOI {source.doi}</span> : null}
        {source.pmid ? <span>PMID {source.pmid}</span> : null}
        {source.href ? (
          <a
            href={source.href}
            className={styles.textLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.sources.open} ↗
          </a>
        ) : (
          <span>{copy.sources.noLink}</span>
        )}
      </p>
      {footer}
    </div>
  );
}
