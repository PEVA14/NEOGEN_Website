"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Container } from "@/components/primitives";
import {
  ATLAS_MAX_IN_MIND,
  ATLAS_MAX_PRIORITIES,
  ATLAS_MAX_TOPICS,
  ATLAS_NAME_MAX,
  ATLAS_NOTE_MAX,
  atlasBudgets,
  atlasExperienceLevels,
  atlasForms,
  atlasHistories,
  atlasHorizons,
  atlasIntents,
  atlasPriorities,
  atlasSizes,
  atlasStyles,
  atlasTimings,
  type AtlasProfile,
} from "@/domain/atlas/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import { AtlasMark } from "./AtlasMark";
import { AtlasResult } from "./AtlasResult";
import styles from "./AtlasExperience.module.css";

import type { AtlasAreaOption, AtlasCopy, AtlasProductOption } from "./types";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { AtlasResultView } from "@/domain/atlas/result";
import type { Locale } from "@/i18n/config";

/**
 * NEOGEN ATLAS — the questionnaire, the generation, the result.
 *
 * One client island. It collects a profile and renders a result; it holds no
 * recommendation rule. Generation is a single POST to `/api/atlas` carrying
 * the profile and a locale — never a prompt, a model or a product list — and
 * the response is an assembled result.
 *
 * PERSISTENCE is a per-viewer convenience only: the draft and the last result
 * sit in `sessionStorage` so a reload keeps them. Every read and write is
 * guarded, and the experience works without it.
 */

type Phase = "intro" | Step | "generating" | "result" | "error";
type ErrorKind = "rate_limited" | "invalid" | "failed";
type Draft = {
  -readonly [K in keyof AtlasProfile]: AtlasProfile[K] extends readonly (infer U)[]
    ? U[]
    : AtlasProfile[K];
};

const EMPTY: Draft = {
  topics: [],
  intent: "first-order",
  inMind: [],
  firstName: "",
  experience: "new",
  history: "first-time",
  priorities: [],
  style: "direct",
  forms: [],
  size: "no-preference",
  includeSupplies: false,
  budget: "open",
  horizon: "one-order",
  timing: "no-rush",
  note: "",
};

const STORAGE_KEY = "neogen.atlas.v2";
const STEPS = ["goals", "you", "preferences", "budget"] as const;
type Step = (typeof STEPS)[number];
const PRODUCT_LIST_LIMIT = 18;

const pad = (n: number) => String(n).padStart(2, "0");
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
const fold = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function isStep(value: unknown): value is Step {
  return typeof value === "string" && (STEPS as readonly string[]).includes(value);
}

export function AtlasExperience({
  locale,
  areas,
  products,
  copy,
}: {
  locale: Locale;
  areas: readonly AtlasAreaOption[];
  products: readonly AtlasProductOption[];
  copy: AtlasCopy;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [result, setResult] = useState<AtlasResultView | null>(null);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [stage, setStage] = useState(0);
  const [limitHit, setLimitHit] = useState(false);
  const [query, setQuery] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const restored = useRef(false);
  const settled = useRef(false);

  /* Restore once, after hydration, from a callback rather than the effect body. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const knownAreas = new Set(areas.map((a) => a.id));
    const knownProducts = new Set(products.map((p) => p.slug));
    queueMicrotask(() => {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as {
          draft?: Partial<Draft>;
          phase?: unknown;
          result?: AtlasResultView;
        };
        if (saved.draft) {
          setDraft({
            ...EMPTY,
            ...saved.draft,
            topics: (saved.draft.topics ?? []).filter((id) => knownAreas.has(id)),
            inMind: (saved.draft.inMind ?? []).filter((slug) => knownProducts.has(slug)),
          });
        }
        if (saved.phase === "result" && saved.result) {
          setResult(saved.result);
          setPhase("result");
        } else if (isStep(saved.phase)) {
          setPhase(saved.phase);
        }
      } catch {
        /* Storage unavailable or malformed: start fresh. */
      }
    });
  }, [areas, products]);

  useEffect(() => {
    try {
      const persistedPhase = phase === "generating" || phase === "error" ? "budget" : phase;
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          draft,
          phase: persistedPhase,
          result: phase === "result" ? result : null,
        }),
      );
    } catch {
      /* Private mode or blocked storage: nothing to keep, nothing breaks. */
    }
  }, [draft, phase, result]);

  /* A phase change is a new screen: take the visitor to it and put focus on its heading. */
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [phase, reduced]);

  /* The stages advance while the request runs; they describe the real pipeline. */
  useEffect(() => {
    if (phase !== "generating") return;
    const last = copy.generating.stages.length - 1;
    const timer = window.setInterval(
      () => setStage((s) => Math.min(s + 1, last)),
      reduced ? 900 : 1500,
    );
    return () => window.clearInterval(timer);
  }, [phase, reduced, copy.generating.stages.length]);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const toggleTopic = (id: DiscoveryAreaId) => {
    setDraft((current) => {
      if (current.topics.includes(id)) {
        setLimitHit(false);
        return { ...current, topics: current.topics.filter((a) => a !== id) };
      }
      if (current.topics.length >= ATLAS_MAX_TOPICS) {
        setLimitHit(true);
        return current;
      }
      setLimitHit(false);
      return { ...current, topics: [...current.topics, id] };
    });
  };

  const toggle = <T extends string>(list: readonly T[], value: T, max?: number): T[] =>
    list.includes(value)
      ? list.filter((v) => v !== value)
      : max !== undefined && list.length >= max
        ? [...list]
        : [...list, value];

  /* Products in the chosen topics first; a search reaches the whole catalogue. */
  const productMatches = useMemo(() => {
    const q = fold(query.trim());
    const pool = q
      ? products.filter((p) => fold(p.name).includes(q))
      : products.filter((p) => p.areas.some((a) => draft.topics.includes(a)));
    return pool.filter((p) => !draft.inMind.includes(p.slug)).slice(0, PRODUCT_LIST_LIMIT);
  }, [products, query, draft.topics, draft.inMind]);
  const productName = (slug: string) => products.find((p) => p.slug === slug)?.name ?? slug;

  const generate = useCallback(async () => {
    setStage(0);
    setError(null);
    setPhase("generating");
    const started = Date.now();

    let payload: { ok?: boolean; result?: AtlasResultView; error?: string } | null = null;
    let status = 0;
    try {
      const response = await fetch("/api/atlas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, profile: draft }),
      });
      status = response.status;
      payload = await response.json().catch(() => null);
    } catch {
      payload = null;
    }

    /* Long enough that the stages read as a process rather than a flicker. */
    const wait = (reduced ? 300 : 1400) - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));

    if (payload?.ok && payload.result) {
      setStage(copy.generating.stages.length);
      setResult(payload.result);
      setPhase("result");
    } else {
      setError(
        payload?.error === "rate_limited" || status === 429
          ? "rate_limited"
          : payload?.error === "invalid_answers"
            ? "invalid"
            : "failed",
      );
      setPhase("error");
    }
  }, [draft, locale, reduced, copy.generating.stages.length]);

  const restart = () => {
    setDraft(EMPTY);
    setResult(null);
    setLimitHit(false);
    setQuery("");
    setPhase("goals");
  };

  const stepIndex = isStep(phase) ? STEPS.indexOf(phase) : -1;
  const canAdvance = phase !== "goals" || draft.topics.length > 0;

  const heading = (text: string, lede: string) => (
    <header className={styles.stepHead}>
      <h2 ref={headingRef} tabIndex={-1} id="atlas-step-title" className={styles.stepTitle}>
        {text}
      </h2>
      <p className={styles.stepLede}>{lede}</p>
    </header>
  );

  return (
    <div ref={rootRef} className={styles.root}>
      {phase === "intro" ? (
        <section className={styles.masthead} data-surface="dark" aria-labelledby="atlas-title">
          <div className={styles.cartography} aria-hidden="true" />
          <Container width="full">
            <div className={styles.mastheadInner}>
              <div className={styles.mastheadGrid}>
                <div>
                  <p className={styles.eyebrow}>
                    <AtlasMark className={styles.eyebrowMark} />
                    {copy.eyebrow}
                  </p>
                  <h1 id="atlas-title" className={styles.title}>
                    {copy.title}
                  </h1>
                  <p className={styles.lede}>{copy.lede}</p>
                </div>
                <div className={styles.startBlock}>
                  <button type="button" className={styles.start} onClick={() => setPhase("goals")}>
                    {copy.intro.start}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className={styles.duration}>{copy.intro.duration}</p>
                </div>
              </div>

              <ol className={styles.points} data-count={copy.intro.points.length}>
                {copy.intro.points.map((point) => (
                  <li key={point.index}>
                    <span className={styles.pointIndex}>{point.index}</span>
                    <span className={styles.pointTitle}>{point.title}</span>
                    <span className={styles.pointBody}>{point.body}</span>
                  </li>
                ))}
              </ol>

              <div className={styles.boundaries}>
                <p>{copy.intro.boundary}</p>
                <p>{copy.intro.sources}</p>
              </div>
            </div>
          </Container>
        </section>
      ) : (
        <div className={styles.bar} data-surface="dark">
          <Container width="full">
            <div className={styles.barInner}>
              <p className={styles.eyebrow}>
                <AtlasMark className={styles.eyebrowMark} />
                {copy.eyebrow}
              </p>
              <h1 className={styles.barTitle}>{copy.title}</h1>
            </div>
          </Container>
        </div>
      )}

      {stepIndex >= 0 ? (
        <section className={styles.flow} aria-labelledby="atlas-step-title">
          <Container width="full">
            <ol
              className={styles.rail}
              data-count={STEPS.length}
              aria-label={fill(copy.progress, { n: stepIndex + 1, total: STEPS.length })}
            >
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  data-state={i < stepIndex ? "done" : i === stepIndex ? "current" : "todo"}
                  aria-current={i === stepIndex ? "step" : undefined}
                >
                  <span className={styles.railBar} aria-hidden="true" />
                  <span className={styles.railLabel}>
                    {pad(i + 1)}
                    <span className={styles.railName}> · {copy.steps[step]}</span>
                  </span>
                </li>
              ))}
            </ol>

            {phase === "goals" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                {heading(copy.goals.title, copy.goals.lede)}

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.goals.topics.label}</legend>
                  <p className={styles.legendHint}>{copy.goals.topics.hint}</p>
                  <p className={styles.selection} aria-live="polite">
                    {fill(copy.goals.topics.selected, {
                      n: draft.topics.length,
                      max: ATLAS_MAX_TOPICS,
                    })}
                    {limitHit ? ` — ${copy.goals.topics.limit}` : ""}
                  </p>
                  <ul className={styles.areaGrid}>
                    {areas.map((area) => {
                      const rank = draft.topics.indexOf(area.id);
                      const selected = rank >= 0;
                      return (
                        <li key={area.id}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            className={styles.areaTile}
                            data-area={area.id}
                            data-selected={selected ? "" : undefined}
                            onClick={() => toggleTopic(area.id)}
                          >
                            <span className={styles.areaSwatch} aria-hidden="true" />
                            <span className={styles.areaRank}>
                              {selected ? copy.goals.topics.ranks[rank] : " "}
                            </span>
                            <span className={styles.areaLabel}>{area.label}</span>
                            <span className={styles.areaFraming}>{area.framing}</span>
                            <span className={styles.areaBody}>{area.body}</span>
                            <span className={styles.areaFoot}>
                              <span>{fill(copy.goals.topics.count, { n: area.compounds })}</span>
                              {area.entryPrice ? (
                                <span>
                                  {copy.goals.topics.from} {area.entryPrice}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>

                <Choice
                  name="atlas-intent"
                  label={copy.goals.intent.label}
                  values={atlasIntents}
                  value={draft.intent}
                  options={copy.goals.intent.options}
                  onChange={(intent) => update({ intent })}
                  cols={3}
                />

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.goals.inMind.label}</legend>
                  <p className={styles.legendHint}>{copy.goals.inMind.hint}</p>
                  {draft.inMind.length > 0 ? (
                    <ul className={styles.chosen}>
                      {draft.inMind.map((slug) => (
                        <li key={slug}>
                          <button
                            type="button"
                            className={styles.chosenItem}
                            aria-label={fill(copy.goals.inMind.remove, { name: productName(slug) })}
                            onClick={() =>
                              update({ inMind: draft.inMind.filter((s) => s !== slug) })
                            }
                          >
                            {productName(slug)} <span aria-hidden="true">×</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {draft.inMind.length < ATLAS_MAX_IN_MIND ? (
                    <>
                      <label className={styles.srOnly} htmlFor="atlas-product-search">
                        {copy.goals.inMind.search}
                      </label>
                      <input
                        id="atlas-product-search"
                        type="search"
                        className={styles.textInput}
                        placeholder={copy.goals.inMind.search}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        autoComplete="off"
                      />
                      <div className={styles.pills}>
                        {productMatches.map((product) => (
                          <button
                            key={product.slug}
                            type="button"
                            className={styles.pill}
                            onClick={() => {
                              update({ inMind: [...draft.inMind, product.slug] });
                              setQuery("");
                            }}
                          >
                            {product.name}
                          </button>
                        ))}
                        {productMatches.length === 0 && query ? (
                          <p className={styles.legendHint}>{copy.goals.inMind.empty}</p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </fieldset>
              </div>
            ) : null}

            {phase === "you" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                {heading(copy.you.title, copy.you.lede)}

                <div className={styles.field}>
                  <label htmlFor="atlas-name" className={styles.legend}>
                    {copy.you.firstName.label}
                  </label>
                  <p id="atlas-name-hint" className={styles.legendHint}>
                    {copy.you.firstName.hint}
                  </p>
                  <input
                    id="atlas-name"
                    type="text"
                    className={styles.textInput}
                    value={draft.firstName}
                    maxLength={ATLAS_NAME_MAX}
                    placeholder={copy.you.firstName.placeholder}
                    autoComplete="given-name"
                    aria-describedby="atlas-name-hint"
                    onChange={(event) => update({ firstName: event.target.value })}
                  />
                </div>

                <Choice
                  name="atlas-experience"
                  label={copy.you.experience.label}
                  values={atlasExperienceLevels}
                  value={draft.experience}
                  options={copy.you.experience.options}
                  onChange={(experience) => update({ experience })}
                  cols={3}
                />

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.you.history.label}</legend>
                  <div className={styles.pills}>
                    {atlasHistories.map((history) => (
                      <label key={history} className={styles.pill}>
                        <input
                          type="radio"
                          name="atlas-history"
                          checked={draft.history === history}
                          onChange={() => update({ history })}
                          className={styles.input}
                        />
                        {copy.you.history.options[history]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.you.priorities.label}</legend>
                  <p className={styles.legendHint}>{copy.you.priorities.hint}</p>
                  <div className={styles.options} data-cols="4">
                    {atlasPriorities.map((priority) => {
                      const checked = draft.priorities.includes(priority);
                      return (
                        <label key={priority} className={styles.option}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!checked && draft.priorities.length >= ATLAS_MAX_PRIORITIES}
                            onChange={() =>
                              update({
                                priorities: toggle(
                                  draft.priorities,
                                  priority,
                                  ATLAS_MAX_PRIORITIES,
                                ),
                              })
                            }
                            className={styles.input}
                          />
                          <span className={styles.indicator} aria-hidden="true" />
                          <span className={styles.optionLabel}>
                            {copy.you.priorities.options[priority].label}
                          </span>
                          <span className={styles.optionHint}>
                            {copy.you.priorities.options[priority].hint}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <Choice
                  name="atlas-style"
                  label={copy.you.style.label}
                  values={atlasStyles}
                  value={draft.style}
                  options={copy.you.style.options}
                  onChange={(style) => update({ style })}
                  cols={2}
                />
              </div>
            ) : null}

            {phase === "preferences" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                {heading(copy.preferences.title, copy.preferences.lede)}

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.preferences.forms.label}</legend>
                  <p className={styles.legendHint}>{copy.preferences.forms.hint}</p>
                  <div className={styles.pills}>
                    {atlasForms.map((form) => (
                      <label key={form} className={styles.pill}>
                        <input
                          type="checkbox"
                          checked={draft.forms.includes(form)}
                          onChange={() => update({ forms: toggle(draft.forms, form) })}
                          className={styles.input}
                        />
                        {copy.preferences.forms.options[form]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Choice
                  name="atlas-size"
                  label={copy.preferences.size.label}
                  values={atlasSizes}
                  value={draft.size}
                  options={copy.preferences.size.options}
                  onChange={(size) => update({ size })}
                  cols={3}
                />

                <label className={styles.switch}>
                  <span className={styles.switchText}>
                    <span className={styles.optionLabel}>{copy.preferences.supplies.label}</span>
                    <span className={styles.optionHint}>{copy.preferences.supplies.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={draft.includeSupplies}
                    onChange={() => update({ includeSupplies: !draft.includeSupplies })}
                    className={styles.input}
                  />
                  <span className={styles.switchTrack} aria-hidden="true" />
                </label>
              </div>
            ) : null}

            {phase === "budget" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                {heading(copy.budget.title, copy.budget.lede)}

                <Choice
                  name="atlas-budget"
                  label={copy.budget.label}
                  values={atlasBudgets}
                  value={draft.budget}
                  options={copy.budget.options}
                  onChange={(budget) => update({ budget })}
                  cols={4}
                />

                <Choice
                  name="atlas-horizon"
                  label={copy.budget.horizon.label}
                  values={atlasHorizons}
                  value={draft.horizon}
                  options={copy.budget.horizon.options}
                  onChange={(horizon) => update({ horizon })}
                  cols={2}
                />

                <Choice
                  name="atlas-timing"
                  label={copy.budget.timing.label}
                  values={atlasTimings}
                  value={draft.timing}
                  options={copy.budget.timing.options}
                  onChange={(timing) => update({ timing })}
                  cols={2}
                />

                <div className={styles.field}>
                  <label htmlFor="atlas-note" className={styles.legend}>
                    {copy.budget.note.label}{" "}
                    <span className={styles.optional}>· {copy.budget.note.optional}</span>
                  </label>
                  <textarea
                    id="atlas-note"
                    className={styles.textarea}
                    value={draft.note}
                    maxLength={ATLAS_NOTE_MAX}
                    placeholder={copy.budget.note.placeholder}
                    aria-describedby="atlas-note-hint"
                    onChange={(event) => update({ note: event.target.value })}
                  />
                  <div className={styles.textareaMeta}>
                    <p id="atlas-note-hint" className={styles.contextHint}>
                      {copy.budget.note.hint}
                    </p>
                    <p className={styles.charCount} aria-live="polite">
                      {fill(copy.budget.note.counter, {
                        n: draft.note.length,
                        max: ATLAS_NOTE_MAX,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.back}
                onClick={() => setPhase(stepIndex === 0 ? "intro" : STEPS[stepIndex - 1])}
              >
                <span aria-hidden="true">←</span> {copy.controls.back}
              </button>
              {phase === "budget" ? (
                <button type="button" className={styles.primary} onClick={generate}>
                  {copy.controls.generate}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!canAdvance}
                  onClick={() => setPhase(STEPS[stepIndex + 1])}
                >
                  {copy.controls.next}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </Container>
        </section>
      ) : null}

      {phase === "generating" ? (
        <section
          className={styles.generating}
          data-surface="dark"
          aria-labelledby="atlas-generating-title"
          aria-busy="true"
        >
          <div className={styles.cartography} aria-hidden="true" />
          <Container width="full">
            <div className={styles.generatingGrid}>
              <div className={styles.scope} aria-hidden="true">
                <span className={styles.ring} />
                <span className={styles.ring} />
                <span className={styles.ring} />
                <AtlasMark className={styles.scopeMark} animated />
              </div>
              <div>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  id="atlas-generating-title"
                  className={styles.stepTitle}
                >
                  {copy.generating.title}
                </h2>
                <ol className={styles.stages}>
                  {copy.generating.stages.map((label, i) => (
                    <li
                      key={label}
                      data-state={i < stage ? "done" : i === stage ? "active" : "pending"}
                    >
                      <span className={styles.stageIndex}>{pad(i + 1)}</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ol>
                <p className={styles.generatingNote}>{copy.generating.note}</p>
                <p role="status" className={styles.srOnly}>
                  {copy.generating.stages[Math.min(stage, copy.generating.stages.length - 1)]}
                </p>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {phase === "error" ? (
        <section className={styles.flow} aria-labelledby="atlas-error-title">
          <Container width="full">
            <div className={styles.errorPanel} role="alert">
              <h2
                ref={headingRef}
                tabIndex={-1}
                id="atlas-error-title"
                className={styles.stepTitle}
              >
                {copy.error.title}
              </h2>
              <p className={styles.stepLede}>
                {error === "rate_limited"
                  ? copy.error.rateLimited
                  : error === "invalid"
                    ? copy.error.invalid
                    : copy.error.body}
              </p>
              <div className={styles.controls}>
                <button type="button" className={styles.back} onClick={() => setPhase("budget")}>
                  <span aria-hidden="true">←</span> {copy.controls.edit}
                </button>
                {error !== "invalid" ? (
                  <button type="button" className={styles.primary} onClick={generate}>
                    {copy.error.retry}
                    <span aria-hidden="true">→</span>
                  </button>
                ) : null}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {phase === "result" && result ? (
        <AtlasResult
          result={result}
          copy={copy}
          headingRef={headingRef}
          onEdit={() => setPhase("goals")}
          onRestart={restart}
        />
      ) : null}
    </div>
  );
}

/** One radio question, as the option cards the questionnaire already uses. */
function Choice<T extends string>({
  name,
  label,
  values,
  value,
  options,
  onChange,
  cols,
}: {
  name: string;
  label: string;
  values: readonly T[];
  value: T;
  options: Readonly<Record<T, { label: string; hint: string }>>;
  onChange: (value: T) => void;
  cols: 2 | 3 | 4;
}) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.options} data-cols={cols}>
        {values.map((option) => (
          <label key={option} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className={styles.input}
            />
            <span className={styles.indicator} data-shape="radio" aria-hidden="true" />
            <span className={styles.optionLabel}>{options[option].label}</span>
            <span className={styles.optionHint}>{options[option].hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
