"use client";

import Link from "next/link";
import { useState, type RefObject } from "react";

import { Container } from "@/components/primitives";

import { AtlasMap } from "./AtlasMap";
import { AtlasMark } from "./AtlasMark";
import styles from "./AtlasResult.module.css";

import type { AtlasCopy } from "./types";
import type { AtlasResultCompound, AtlasResultView } from "@/domain/atlas/result";

/**
 * THE RESULT DOSSIER — the reader's map, written and counted.
 *
 * Two kinds of content, kept visibly distinct throughout:
 *
 *   WRITTEN   the title, summary, each area and compound rationale, each path
 *             note and each reading note. Set as prose, with a thin rule, and
 *             the header's mode label says who wrote it — a model, or (when no
 *             model ran) the registry-only composer. It is never presented as
 *             AI when it was not.
 *   COUNTED   every name, presentation range, entry price, documentation state,
 *             budget sum and link — joined on the server from the registry.
 *
 * The page is honest about absence: documentation that does not exist yet is
 * said not to exist, and a budget with no cap is said to exclude nothing.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

export function AtlasResult({
  result,
  copy,
  headingRef,
  onEdit,
  onRestart,
}: {
  result: AtlasResultView;
  copy: AtlasCopy;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const r = copy.result;
  const [active, setActive] = useState<string | null>(null);
  const empty = result.compounds.length === 0;
  const bridges = result.compounds.filter((c) => c.bridges).length;

  const blocks = [
    ...(empty ? [] : ["map", "areas", "compounds"]),
    ...(result.materials.length > 0 ? ["materials"] : []),
    ...(empty ? [] : ["budget", "path"]),
    "documentation",
    ...(result.notes.length > 0 ? ["notes"] : []),
  ];
  const index = (id: string) => pad(blocks.indexOf(id) + 1);

  return (
    <div className={styles.result}>
      <section className={styles.dossier} data-surface="dark" aria-labelledby="atlas-result-title">
        <div className={styles.cartography} aria-hidden="true" />
        <Container width="full">
          <div className={styles.dossierInner}>
            <div className={styles.dossierTop}>
              <p className={styles.eyebrow}>
                <AtlasMark className={styles.eyebrowMark} />
                {r.eyebrow}
              </p>
              <p className={styles.mode} data-mode={result.mode}>
                {r.modes[result.mode]}
              </p>
            </div>

            <h2 ref={headingRef} tabIndex={-1} id="atlas-result-title" className={styles.title}>
              {empty ? r.empty.title : result.title}
            </h2>
            <p className={styles.summary}>{empty ? r.empty.body : result.summary}</p>

            {empty ? null : (
              <dl className={styles.stats}>
                <div className={styles.stat}>
                  <dt>{r.stats.areas}</dt>
                  <dd>{pad(result.areas.length)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>{r.stats.compounds}</dt>
                  <dd>{pad(result.compounds.length)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>{r.stats.pool}</dt>
                  <dd>{pad(result.poolSize)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>{r.stats.bridges}</dt>
                  <dd>{pad(bridges)}</dd>
                </div>
              </dl>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.ghost} onClick={onEdit}>
                {copy.controls.edit}
              </button>
              <button type="button" className={styles.ghost} onClick={onRestart}>
                {copy.controls.restart}
              </button>
            </div>
          </div>
        </Container>
      </section>

      <div className={styles.body}>
        <Container width="full">
          {result.contextScreened ? (
            <p className={styles.notice} role="note">
              {r.screenedNotice}
            </p>
          ) : null}
          {result.healthNotice ? (
            <p className={styles.notice} role="note">
              {r.healthNotice}
            </p>
          ) : null}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-map-title">
              <BlockHead
                index={index("map")}
                id="atlas-map-title"
                title={r.map.title}
                lede={r.map.lede}
              />
              <AtlasMap
                areas={result.areas}
                compounds={result.compounds}
                label={r.map.label}
                columnLabel={r.compounds.title}
                legend={{
                  core: r.compounds.roles.core,
                  complement: r.compounds.roles.complement,
                  bridges: r.compounds.bridges,
                }}
                active={active}
                onActive={setActive}
              />
            </section>
          )}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-areas-title">
              <BlockHead index={index("areas")} id="atlas-areas-title" title={r.areas.title} />
              <ul className={styles.areaCards}>
                {result.areas.map((area) => (
                  <li key={area.id} className={styles.areaCard} data-area={area.id}>
                    <p className={styles.areaRank}>
                      {pad(area.rank + 1)} · {copy.areas.ranks[area.rank]}
                    </p>
                    <h4 className={styles.areaName}>{area.label}</h4>
                    <p className={styles.areaFraming}>{area.framing}</p>
                    {area.rationale ? <p className={styles.written}>{area.rationale}</p> : null}
                    <p className={styles.areaMeta}>
                      <span>{fill(r.areas.count, { n: area.compounds })}</span>
                      {area.entryPrice ? (
                        <span>
                          {r.areas.from} {area.entryPrice}
                        </span>
                      ) : null}
                    </p>
                    <Link href={area.href} className={styles.textLink}>
                      {r.areas.open} <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-compounds-title">
              <BlockHead
                index={index("compounds")}
                id="atlas-compounds-title"
                title={r.compounds.title}
                lede={r.compounds.lede}
              />
              <ul className={styles.compoundGrid}>
                {result.compounds.map((compound) => (
                  <li key={compound.slug} className={styles.compoundItem} data-role={compound.role}>
                    <CompoundCard
                      compound={compound}
                      copy={copy}
                      active={active === compound.slug}
                      onActive={setActive}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.materials.length > 0 ? (
            <section className={styles.block} aria-labelledby="atlas-materials-title">
              <BlockHead
                index={index("materials")}
                id="atlas-materials-title"
                title={r.materials.title}
                lede={r.materials.lede}
              />
              <ul className={styles.compoundGrid}>
                {result.materials.map((material) => (
                  <li key={material.slug} className={styles.compoundItem} data-role="material">
                    <CompoundCard
                      compound={material}
                      copy={copy}
                      active={false}
                      onActive={() => {}}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-budget-title">
              <BlockHead index={index("budget")} id="atlas-budget-title" title={r.budget.title} />
              {result.budget.capAmount === null ? (
                <p className={styles.lead}>{r.budget.open}</p>
              ) : null}
              <div className={styles.meters}>
                <Meter
                  label={r.budget.core}
                  count={result.budget.coreCount}
                  formatted={result.budget.coreEntry}
                  amount={result.budget.coreEntryAmount}
                  cap={result.budget.capAmount}
                  fits={result.budget.fitsCore}
                  copy={r.budget}
                />
                <Meter
                  label={r.budget.all}
                  count={result.budget.allCount}
                  formatted={result.budget.allEntry}
                  amount={result.budget.allEntryAmount}
                  cap={result.budget.capAmount}
                  fits={result.budget.fitsAll}
                  copy={r.budget}
                />
              </div>
              {result.budget.cap ? (
                <p className={styles.capLine}>
                  <span>{r.budget.cap}</span>
                  <strong>{result.budget.cap}</strong>
                </p>
              ) : null}
              <p className={styles.method}>{r.budget.method}</p>
            </section>
          )}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-path-title">
              <BlockHead index={index("path")} id="atlas-path-title" title={r.path.title} />
              <ol className={styles.path}>
                {result.path.map((step, i) => (
                  <li key={step.id} className={styles.step}>
                    <span className={styles.stepIndex} aria-hidden="true">
                      {pad(i + 1)}
                    </span>
                    <div className={styles.stepBody}>
                      <Link href={step.href} className={styles.stepLink}>
                        {step.label} <span aria-hidden="true">→</span>
                      </Link>
                      {step.note ? <p className={styles.stepNote}>{step.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className={styles.block} aria-labelledby="atlas-docs-title">
            <BlockHead
              index={index("documentation")}
              id="atlas-docs-title"
              title={r.documentation.title}
            />
            <p className={styles.lead}>
              {result.documentation.publicRecords > 0
                ? fill(r.documentation.some, { n: result.documentation.publicRecords })
                : r.documentation.none}
            </p>
            {result.references.length > 0 ? (
              <div className={styles.references}>
                <p className={styles.miniLabel}>{r.documentation.references}</p>
                <ul>
                  {result.references.map((reference) => (
                    <li key={reference.id}>
                      {reference.href ? (
                        <a
                          href={reference.href}
                          className={styles.textLink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {reference.title}
                        </a>
                      ) : (
                        reference.title
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className={styles.docLinks}>
              <Link href={result.documentation.modelHref} className={styles.textLink}>
                {r.documentation.model} <span aria-hidden="true">→</span>
              </Link>
              {result.documentation.explorerHref ? (
                <Link href={result.documentation.explorerHref} className={styles.textLink}>
                  {r.documentation.explorer} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
          </section>

          {result.notes.length > 0 ? (
            <section className={styles.block} aria-labelledby="atlas-notes-title">
              <BlockHead index={index("notes")} id="atlas-notes-title" title={r.notes.title} />
              <ul className={styles.notes}>
                {result.notes.map((note) => (
                  <li key={note} className={styles.written}>
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={styles.recap} aria-labelledby="atlas-inputs-title">
            <div>
              <h3 id="atlas-inputs-title" className={styles.miniLabel}>
                {r.inputs.title}
              </h3>
              <dl className={styles.recapList}>
                <div>
                  <dt>{r.inputs.depth}</dt>
                  <dd>{copy.profile.depth.options[result.inputs.depth].label}</dd>
                </div>
                <div>
                  <dt>{r.inputs.focus}</dt>
                  <dd>
                    {result.inputs.focus.length > 0
                      ? result.inputs.focus
                          .map((f) => copy.profile.focus.options[f].label)
                          .join(" · ")
                      : r.inputs.noFocus}
                  </dd>
                </div>
                <div>
                  <dt>{r.inputs.forms}</dt>
                  <dd>
                    {result.inputs.forms.length > 0
                      ? result.inputs.forms.map((f) => copy.profile.forms.options[f]).join(" · ")
                      : r.inputs.anyForm}
                  </dd>
                </div>
                <div>
                  <dt>{r.inputs.materials}</dt>
                  <dd>{result.inputs.includeMaterials ? r.inputs.yes : r.inputs.no}</dd>
                </div>
                <div>
                  <dt>{r.budget.title}</dt>
                  <dd>{copy.budget.options[result.budget.budget].label}</dd>
                </div>
              </dl>
            </div>
            <p className={styles.disclaimer}>{r.disclaimer}</p>
          </section>
        </Container>
      </div>
    </div>
  );
}

function BlockHead({
  index,
  id,
  title,
  lede,
}: {
  index: string;
  id: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className={styles.blockHead}>
      <p className={styles.blockIndex}>{index}</p>
      <h3 id={id} className={styles.blockTitle}>
        {title}
      </h3>
      {lede ? <p className={styles.blockLede}>{lede}</p> : null}
    </header>
  );
}

function CompoundCard({
  compound,
  copy,
  active,
  onActive,
}: {
  compound: AtlasResultCompound;
  copy: AtlasCopy;
  active: boolean;
  onActive: (slug: string | null) => void;
}) {
  const r = copy.result.compounds;
  return (
    <article
      className={styles.compound}
      data-role={compound.role}
      data-area={compound.areas[0]?.id}
      data-active={active ? "" : undefined}
      onMouseEnter={() => onActive(compound.slug)}
      onMouseLeave={() => onActive(null)}
    >
      <header className={styles.compoundHead}>
        <span className={styles.role}>{r.roles[compound.role]}</span>
        {compound.worldLabel ? (
          <span className={styles.world} data-world={compound.world ?? undefined}>
            {r.flagship} · {compound.worldLabel}
          </span>
        ) : null}
      </header>

      <h4 className={styles.compoundName}>{compound.name}</h4>
      <p className={styles.classification}>{compound.classification}</p>

      {compound.rationale ? <p className={styles.written}>{compound.rationale}</p> : null}

      <ul className={styles.chips} aria-label={r.filed}>
        {compound.areas.map((area) => (
          <li key={area.id} className={styles.chip} data-area={area.id}>
            {area.label}
          </li>
        ))}
        {compound.bridges ? <li className={styles.chipBridge}>{r.bridges}</li> : null}
      </ul>

      <dl className={styles.facts}>
        <div>
          <dt>{r.presentations}</dt>
          <dd>
            {compound.presentationRange}
            <span className={styles.muted}> · {pad(compound.presentations)}</span>
          </dd>
        </div>
        <div>
          <dt>{r.entry}</dt>
          <dd>{compound.entryPrice ?? copy.result.budget.unknown}</dd>
        </div>
        <div>
          <dt>{copy.result.documentation.title}</dt>
          <dd data-state={compound.documented ? "yes" : "no"}>
            {compound.documented ? r.documented : r.undocumented}
          </dd>
        </div>
        {compound.withinBudget !== null ? (
          <div>
            <dt>{copy.result.budget.title}</dt>
            <dd data-state={compound.withinBudget ? "yes" : "over"}>
              {compound.withinBudget ? r.budgetFits : r.budgetOver}
            </dd>
          </div>
        ) : null}
      </dl>

      <Link
        href={compound.href}
        className={styles.cta}
        aria-label={`${r.open} — ${compound.name}`}
        onFocus={() => onActive(compound.slug)}
        onBlur={() => onActive(null)}
      >
        {r.open} <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

function Meter({
  label,
  count,
  formatted,
  amount,
  cap,
  fits,
  copy,
}: {
  label: string;
  count: number;
  formatted: string | null;
  amount: number | null;
  cap: number | null;
  fits: boolean | null;
  copy: AtlasCopy["result"]["budget"];
}) {
  const ratio = cap && amount !== null ? amount / cap : null;
  return (
    <div className={styles.meter} data-over={fits === false ? "" : undefined}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>
          {label} <span className={styles.muted}>· {pad(count)}</span>
        </span>
        <span className={styles.meterValue}>{formatted ?? copy.unknown}</span>
      </div>
      {ratio !== null ? (
        <>
          <div className={styles.meterTrack} aria-hidden="true">
            <span
              className={styles.meterFill}
              style={{ inlineSize: `${Math.min(ratio, 1) * 100}%` }}
            />
          </div>
          <p className={styles.meterState}>{fits ? copy.fits : copy.over}</p>
        </>
      ) : null}
    </div>
  );
}
