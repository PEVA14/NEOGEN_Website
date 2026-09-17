"use client";

import Link from "next/link";
import { useState, type RefObject } from "react";

import { Container } from "@/components/primitives";
import { useBag } from "@/domain/bag";

import { AtlasMap } from "./AtlasMap";
import { AtlasMark } from "./AtlasMark";
import styles from "./AtlasResult.module.css";

import type { AtlasCopy } from "./types";
import type { AtlasResultProduct, AtlasResultSum, AtlasResultView } from "@/domain/atlas/result";

/**
 * THE RESULT — the visitor's selection, written and counted.
 *
 * It renders `AtlasResultView` and decides nothing: which products lead, which
 * presentation is suggested, what fits the budget and how each answer was used
 * all arrive already decided on the server.
 *
 *   WRITTEN   headline, summary, "about you", every why, topic note, next-step
 *             note and tip. Set as prose, and the header says who wrote it — a
 *             model, or the registry-only composer. Never presented as AI when
 *             it was not.
 *   COUNTED   every name, presentation, price, documentation state, budget sum
 *             and link — joined on the server from the registry.
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
  const [detail, setDetail] = useState(result.style === "detailed");
  const empty = result.start.length === 0;
  const mapped = [...result.start, ...result.more];

  const blocks = [
    ...(empty ? [] : ["about", "start"]),
    ...(result.more.length > 0 ? ["more"] : []),
    ...(result.supplies.length > 0 ? ["supplies"] : []),
    ...(empty ? [] : ["budget"]),
    ...(empty || !detail ? [] : ["map", "topics"]),
    ...(empty ? [] : ["next"]),
    ...(result.tips.length > 0 ? ["tips"] : []),
    "documentation",
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
                {result.firstName ? fill(r.for, { name: result.firstName }) : r.eyebrow}
                {result.returning ? <span className={styles.muted}> · {r.welcomeBack}</span> : null}
              </p>
              <p className={styles.mode} data-mode={result.mode}>
                {r.modes[result.mode]}
              </p>
            </div>

            <h2 ref={headingRef} tabIndex={-1} id="atlas-result-title" className={styles.title}>
              {empty ? r.empty.title : result.headline}
            </h2>
            <p className={styles.summary}>{empty ? r.empty.body : result.summary}</p>

            {empty ? null : (
              <dl className={styles.stats}>
                <div className={styles.stat}>
                  <dt>{r.stats.start}</dt>
                  <dd>{pad(result.start.length)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>{r.stats.more}</dt>
                  <dd>{pad(result.more.length)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>{r.stats.topics}</dt>
                  <dd>{pad(result.topics.length)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>{r.stats.pool}</dt>
                  <dd>{pad(result.poolSize)}</dd>
                </div>
              </dl>
            )}

            <div className={styles.actions}>
              {empty ? null : (
                <AddAll products={result.start} result={result} copy={copy} tone="dark" />
              )}
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
          {result.notices.noteDiscarded ? (
            <p className={styles.notice} role="note">
              {r.screenedNotice}
            </p>
          ) : null}
          {result.notices.healthMentioned ? (
            <p className={styles.notice} role="note">
              {r.healthNotice}
            </p>
          ) : null}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-about-title">
              <BlockHead index={index("about")} id="atlas-about-title" title={r.about.title} />
              <p className={styles.aboutText}>{result.aboutYou}</p>
              {/* Whichever questions the questionnaire marks `recap`. */}
              <ul className={styles.answerChips}>
                {result.recap.map((entry) => (
                  <li key={entry.question} className={styles.answerChip}>
                    <span className={styles.muted}>{entry.label}</span> {entry.answer}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-start-title">
              <BlockHead
                index={index("start")}
                id="atlas-start-title"
                title={r.start.title}
                lede={r.start.lede}
              />
              <ul className={styles.compoundGrid} data-lead="">
                {result.start.map((product) => (
                  <li key={product.slug} className={styles.compoundItem}>
                    <ProductCard
                      product={product}
                      result={result}
                      copy={copy}
                      active={active === product.slug}
                      onActive={setActive}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.more.length > 0 ? (
            <section className={styles.block} aria-labelledby="atlas-more-title">
              <BlockHead
                index={index("more")}
                id="atlas-more-title"
                title={r.more.title}
                lede={r.more.lede}
              />
              <ul className={styles.compoundGrid}>
                {result.more.map((product) => (
                  <li key={product.slug} className={styles.compoundItem}>
                    <ProductCard
                      product={product}
                      result={result}
                      copy={copy}
                      active={active === product.slug}
                      onActive={setActive}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.supplies.length > 0 ? (
            <section className={styles.block} aria-labelledby="atlas-supplies-title">
              <BlockHead
                index={index("supplies")}
                id="atlas-supplies-title"
                title={r.supplies.title}
                lede={r.supplies.lede}
              />
              <ul className={styles.compoundGrid}>
                {result.supplies.map((product) => (
                  <li key={product.slug} className={styles.compoundItem}>
                    <ProductCard
                      product={product}
                      result={result}
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
                  label={r.budget.start}
                  sum={result.budget.start}
                  cap={result.budget.capAmount}
                  copy={r.budget}
                />
                <Meter
                  label={r.budget.all}
                  sum={result.budget.all}
                  cap={result.budget.capAmount}
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
              <div className={styles.budgetActions}>
                <AddAll products={result.start} result={result} copy={copy} tone="light" />
              </div>
            </section>
          )}

          {empty ? null : (
            <div className={styles.detailToggle}>
              <button
                type="button"
                className={styles.ghost}
                aria-expanded={detail}
                onClick={() => setDetail((d) => !d)}
              >
                {detail ? r.detail.hide : r.detail.show}
              </button>
            </div>
          )}

          {!empty && detail ? (
            <section className={styles.block} aria-labelledby="atlas-map-title">
              <BlockHead
                index={index("map")}
                id="atlas-map-title"
                title={r.map.title}
                lede={r.map.lede}
              />
              <AtlasMap
                areas={result.topics}
                compounds={mapped}
                label={r.map.label}
                columnLabel={r.map.column}
                legend={r.map.legend}
                active={active}
                onActive={setActive}
              />
            </section>
          ) : null}

          {!empty && detail ? (
            <section className={styles.block} aria-labelledby="atlas-topics-title">
              <BlockHead index={index("topics")} id="atlas-topics-title" title={r.topics.title} />
              <ul className={styles.areaCards}>
                {result.topics.map((topic) => (
                  <li key={topic.id} className={styles.areaCard} data-area={topic.id}>
                    <p className={styles.areaRank}>{copy.field.ranks[topic.rank]}</p>
                    <h4 className={styles.areaName}>{topic.label}</h4>
                    <p className={styles.areaFraming}>{topic.framing}</p>
                    {topic.note ? <p className={styles.written}>{topic.note}</p> : null}
                    <p className={styles.areaMeta}>
                      <span>{fill(r.topics.count, { n: topic.compounds })}</span>
                      {topic.entryPrice ? (
                        <span>
                          {r.topics.from} {topic.entryPrice}
                        </span>
                      ) : null}
                    </p>
                    <Link href={topic.href} className={styles.textLink}>
                      {r.topics.open} <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {empty ? null : (
            <section className={styles.block} aria-labelledby="atlas-next-title">
              <BlockHead index={index("next")} id="atlas-next-title" title={r.next.title} />
              <ol className={styles.path}>
                {result.nextSteps.map((step, i) => (
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

          {result.tips.length > 0 ? (
            <section className={styles.block} aria-labelledby="atlas-tips-title">
              <BlockHead index={index("tips")} id="atlas-tips-title" title={r.tips.title} />
              <ul className={styles.notes}>
                {result.tips.map((tip) => (
                  <li key={tip} className={styles.written}>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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

          <section className={styles.recap} aria-labelledby="atlas-ledger-title">
            <div>
              <h3 id="atlas-ledger-title" className={styles.miniLabel}>
                {r.ledger.title}
              </h3>
              <p className={styles.method}>{r.ledger.lede}</p>
              <dl className={styles.ledger}>
                {result.ledger.map((entry) => (
                  <div key={entry.question} data-answered={entry.answered ? "" : undefined}>
                    <dt>{entry.label}</dt>
                    <dd>
                      <span className={styles.ledgerAnswer}>
                        {entry.answer ?? r.ledger.skipped}
                      </span>
                      {entry.answered ? (
                        <span className={styles.ledgerUses}>
                          {entry.uses.length > 0
                            ? entry.uses.map((use) => r.ledger.uses[use]).join(" · ")
                            : r.ledger.notUsed}
                        </span>
                      ) : null}
                      {entry.withheld ? (
                        <span className={styles.ledgerWithheld}>
                          {r.ledger.withheld[entry.withheld]}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
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

function ProductCard({
  product,
  result,
  copy,
  active,
  onActive,
}: {
  product: AtlasResultProduct;
  result: AtlasResultView;
  copy: AtlasCopy;
  active: boolean;
  onActive: (slug: string | null) => void;
}) {
  const p = copy.result.product;
  const role =
    product.list === "start" ? "core" : product.list === "supply" ? "material" : "complement";
  const label =
    product.list === "start"
      ? copy.result.start.title
      : product.list === "supply"
        ? copy.result.supplies.title
        : copy.result.more.title;
  const sources = product.research?.sources ?? 0;
  const sourcesLabel = (sources === 1 ? p.source : p.sources).replace("{n}", String(sources));

  return (
    <article
      className={styles.compound}
      data-role={role}
      data-area={product.areas[0]?.id}
      data-active={active ? "" : undefined}
      onMouseEnter={() => onActive(product.slug)}
      onMouseLeave={() => onActive(null)}
    >
      <header className={styles.compoundHead}>
        <span className={styles.role}>{label}</span>
        {product.inMind ? <span className={styles.world}>{p.inMind}</span> : null}
        {product.worldLabel ? (
          <span className={styles.world} data-world={product.world ?? undefined}>
            {p.signature} · {product.worldLabel}
          </span>
        ) : null}
      </header>

      <h4 className={styles.compoundName}>{product.name}</h4>
      <p className={styles.classification}>{product.classification}</p>

      {product.why ? (
        <div className={styles.why}>
          <p className={styles.miniLabel}>{p.why}</p>
          <p className={styles.written}>{product.why}</p>
        </div>
      ) : null}

      {product.research ? (
        <div className={styles.research}>
          <dl className={styles.researchList}>
            {product.research.mechanism ? (
              <div>
                <dt>{p.research}</dt>
                <dd>{product.research.mechanism}</dd>
              </div>
            ) : null}
            {product.research.studied ? (
              <div>
                <dt>{p.studied}</dt>
                <dd>{product.research.studied}</dd>
              </div>
            ) : null}
          </dl>
          {/* Outside the list: a `dl` may only contain dt, dd and div. */}
          {sources > 0 ? (
            <Link
              href={product.research.href}
              className={styles.textLink}
              aria-label={`${sourcesLabel} — ${product.name}`}
            >
              {sourcesLabel} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      {product.areas.length > 0 ? (
        <ul className={styles.chips} aria-label={p.topics}>
          {product.areas.map((area) => (
            <li key={area.id} className={styles.chip} data-area={area.id}>
              {area.label}
            </li>
          ))}
          {product.bridges ? <li className={styles.chipBridge}>{p.overlap}</li> : null}
        </ul>
      ) : null}

      <dl className={styles.facts}>
        {product.suggestion ? (
          <div className={styles.suggestion}>
            <dt>{p.suggested}</dt>
            <dd>
              {product.suggestion.presentation}
              <strong className={styles.suggestionPrice}>{product.suggestion.priceLabel}</strong>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>{p.presentations}</dt>
          <dd>
            {product.presentationRange}
            <span className={styles.muted}> · {pad(product.presentations)}</span>
          </dd>
        </div>
        <div>
          <dt>{copy.result.documentation.title}</dt>
          <dd data-state={product.documented ? "yes" : "no"}>
            {product.documented ? p.documented : p.undocumented}
          </dd>
        </div>
        {product.withinBudget !== null ? (
          <div>
            <dt>{copy.result.budget.title}</dt>
            <dd data-state={product.withinBudget ? "yes" : "over"}>
              {product.withinBudget ? p.fits : p.over}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className={styles.cardActions}>
        {result.commerce.bagEnabled && product.suggestion ? (
          <AddOne product={product} copy={copy} />
        ) : null}
        <Link
          href={product.href}
          className={styles.cta}
          aria-label={`${p.open} — ${product.name}`}
          onFocus={() => onActive(product.slug)}
          onBlur={() => onActive(null)}
        >
          {p.open} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

/** The suggested presentation, into the bag — the price is the registry's. */
function AddOne({ product, copy }: { product: AtlasResultProduct; copy: AtlasCopy }) {
  const { add } = useBag();
  const [added, setAdded] = useState(false);
  const suggestion = product.suggestion!;
  return (
    <button
      type="button"
      className={styles.add}
      onClick={() => {
        add({
          variantId: suggestion.variantId,
          slug: product.slug,
          name: product.name,
          presentation: suggestion.presentation,
          unitPrice: suggestion.price,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? copy.commerce.added : `${copy.commerce.add} · ${suggestion.presentation}`}
    </button>
  );
}

function AddAll({
  products,
  result,
  copy,
  tone,
}: {
  products: readonly AtlasResultProduct[];
  result: AtlasResultView;
  copy: AtlasCopy;
  tone: "dark" | "light";
}) {
  const { add } = useBag();
  const [added, setAdded] = useState(false);
  const addable = products.filter((p) => p.suggestion !== null);
  if (addable.length === 0) return null;
  if (!result.commerce.bagEnabled) {
    return tone === "light" ? <p className={styles.method}>{copy.commerce.unavailable}</p> : null;
  }
  return (
    <button
      type="button"
      className={styles.addAll}
      data-tone={tone}
      onClick={() => {
        for (const product of addable) {
          add({
            variantId: product.suggestion!.variantId,
            slug: product.slug,
            name: product.name,
            presentation: product.suggestion!.presentation,
            unitPrice: product.suggestion!.price,
          });
        }
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? copy.result.product.addedAll : copy.result.product.addAll}
    </button>
  );
}

function Meter({
  label,
  sum,
  cap,
  copy,
}: {
  label: string;
  sum: AtlasResultSum;
  cap: number | null;
  copy: AtlasCopy["result"]["budget"];
}) {
  const ratio = cap && sum.amount !== null ? sum.amount / cap : null;
  return (
    <div className={styles.meter} data-over={sum.fits === false ? "" : undefined}>
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>
          {label} <span className={styles.muted}>· {pad(sum.count)}</span>
        </span>
        <span className={styles.meterValue}>{sum.label ?? copy.unknown}</span>
      </div>
      {ratio !== null ? (
        <>
          <div className={styles.meterTrack} aria-hidden="true">
            <span
              className={styles.meterFill}
              style={{ inlineSize: `${Math.min(ratio, 1) * 100}%` }}
            />
          </div>
          <p className={styles.meterState}>{sum.fits ? copy.fits : copy.over}</p>
        </>
      ) : null}
    </div>
  );
}
