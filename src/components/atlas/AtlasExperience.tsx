"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Container } from "@/components/primitives";
import {
  ATLAS_CONTEXT_MAX,
  ATLAS_MAX_AREAS,
  ATLAS_MAX_FOCUS,
  atlasBudgets,
  atlasDepths,
  atlasFocuses,
  atlasForms,
  type AtlasBudget,
  type AtlasDepth,
  type AtlasFocus,
  type AtlasForm,
} from "@/domain/atlas/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import { AtlasMark } from "./AtlasMark";
import { AtlasResult } from "./AtlasResult";
import styles from "./AtlasExperience.module.css";

import type { AtlasAreaOption, AtlasCopy } from "./types";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { AtlasResultView } from "@/domain/atlas/result";
import type { Locale } from "@/i18n/config";

/**
 * NEOGEN ATLAS — the questionnaire, the generation, the map.
 *
 * One client island. Everything the reader chooses is a closed vocabulary; the
 * one free-text field is optional, short, and warned about. Generation is a
 * single POST to `/api/atlas` carrying answers and a locale — never a prompt,
 * a model or a product list — and the response is an assembled result.
 *
 * PERSISTENCE is a per-viewer convenience only: answers and the last map sit
 * in `sessionStorage` so a reload keeps them. Every read and write is guarded,
 * and the experience works without it.
 */

type Phase = "intro" | "areas" | "profile" | "budget" | "generating" | "result" | "error";
type ErrorKind = "rate_limited" | "invalid" | "failed";

interface Draft {
  areas: DiscoveryAreaId[];
  depth: AtlasDepth;
  focus: AtlasFocus[];
  forms: AtlasForm[];
  includeMaterials: boolean;
  budget: AtlasBudget;
  context: string;
}

const EMPTY: Draft = {
  areas: [],
  depth: "orientation",
  focus: [],
  forms: [],
  includeMaterials: false,
  budget: "open",
  context: "",
};

const STORAGE_KEY = "neogen.atlas.v1";
const STEPS = ["areas", "profile", "budget"] as const;
type Step = (typeof STEPS)[number];

const pad = (n: number) => String(n).padStart(2, "0");
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

function isStep(value: unknown): value is Step {
  return typeof value === "string" && (STEPS as readonly string[]).includes(value);
}

export function AtlasExperience({
  locale,
  areas,
  copy,
}: {
  locale: Locale;
  areas: readonly AtlasAreaOption[];
  copy: AtlasCopy;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [result, setResult] = useState<AtlasResultView | null>(null);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [stage, setStage] = useState(0);
  const [limitHit, setLimitHit] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const restored = useRef(false);
  const settled = useRef(false);

  /* Restore once, after hydration, from a callback rather than the effect body. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const known = new Set(areas.map((a) => a.id));
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
            areas: (saved.draft.areas ?? []).filter((id) => known.has(id)),
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
  }, [areas]);

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

  /* A phase change is a new screen: take the reader to it and put focus on its heading. */
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

  const toggleArea = (id: DiscoveryAreaId) => {
    setDraft((current) => {
      if (current.areas.includes(id)) {
        setLimitHit(false);
        return { ...current, areas: current.areas.filter((a) => a !== id) };
      }
      if (current.areas.length >= ATLAS_MAX_AREAS) {
        setLimitHit(true);
        return current;
      }
      setLimitHit(false);
      return { ...current, areas: [...current.areas, id] };
    });
  };

  const toggle = <T extends string>(list: readonly T[], value: T, max?: number): T[] =>
    list.includes(value)
      ? list.filter((v) => v !== value)
      : max !== undefined && list.length >= max
        ? [...list]
        : [...list, value];

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
        body: JSON.stringify({ locale, answers: draft }),
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
    setPhase("areas");
  };

  const stepIndex = isStep(phase) ? STEPS.indexOf(phase) : -1;
  const canAdvance = phase !== "areas" || draft.areas.length > 0;

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
                  <button type="button" className={styles.start} onClick={() => setPhase("areas")}>
                    {copy.intro.start}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className={styles.duration}>{copy.intro.duration}</p>
                </div>
              </div>

              <ol className={styles.points}>
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
                    {pad(i + 1)} · {copy.steps[step]}
                  </span>
                </li>
              ))}
            </ol>

            {phase === "areas" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                <header className={styles.stepHead}>
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    id="atlas-step-title"
                    className={styles.stepTitle}
                  >
                    {copy.areas.title}
                  </h2>
                  <p className={styles.stepLede}>{copy.areas.lede}</p>
                  <p className={styles.selection} aria-live="polite">
                    {fill(copy.areas.selected, { n: draft.areas.length, max: ATLAS_MAX_AREAS })}
                    {limitHit ? ` — ${copy.areas.limit}` : ""}
                  </p>
                </header>
                <ul className={styles.areaGrid}>
                  {areas.map((area) => {
                    const rank = draft.areas.indexOf(area.id);
                    const selected = rank >= 0;
                    return (
                      <li key={area.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          className={styles.areaTile}
                          data-area={area.id}
                          data-selected={selected ? "" : undefined}
                          onClick={() => toggleArea(area.id)}
                        >
                          <span className={styles.areaSwatch} aria-hidden="true" />
                          <span className={styles.areaRank}>
                            {selected ? `${pad(rank + 1)} · ${copy.areas.ranks[rank]}` : " "}
                          </span>
                          <span className={styles.areaLabel}>{area.label}</span>
                          <span className={styles.areaFraming}>{area.framing}</span>
                          <span className={styles.areaBody}>{area.body}</span>
                          <span className={styles.areaFoot}>
                            <span>{fill(copy.areas.count, { n: area.compounds })}</span>
                            {area.entryPrice ? (
                              <span>
                                {copy.areas.from} {area.entryPrice}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {phase === "profile" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                <header className={styles.stepHead}>
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    id="atlas-step-title"
                    className={styles.stepTitle}
                  >
                    {copy.profile.title}
                  </h2>
                  <p className={styles.stepLede}>{copy.profile.lede}</p>
                </header>

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.profile.depth.label}</legend>
                  <div className={styles.options} data-cols="2">
                    {atlasDepths.map((depth) => (
                      <label key={depth} className={styles.option}>
                        <input
                          type="radio"
                          name="atlas-depth"
                          value={depth}
                          checked={draft.depth === depth}
                          onChange={() => update({ depth })}
                          className={styles.input}
                        />
                        <span className={styles.indicator} data-shape="radio" aria-hidden="true" />
                        <span className={styles.optionLabel}>
                          {copy.profile.depth.options[depth].label}
                        </span>
                        <span className={styles.optionHint}>
                          {copy.profile.depth.options[depth].hint}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.profile.focus.label}</legend>
                  <p className={styles.legendHint}>{copy.profile.focus.hint}</p>
                  <div className={styles.options} data-cols="4">
                    {atlasFocuses.map((focus) => {
                      const checked = draft.focus.includes(focus);
                      return (
                        <label key={focus} className={styles.option}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!checked && draft.focus.length >= ATLAS_MAX_FOCUS}
                            onChange={() =>
                              update({ focus: toggle(draft.focus, focus, ATLAS_MAX_FOCUS) })
                            }
                            className={styles.input}
                          />
                          <span className={styles.indicator} aria-hidden="true" />
                          <span className={styles.optionLabel}>
                            {copy.profile.focus.options[focus].label}
                          </span>
                          <span className={styles.optionHint}>
                            {copy.profile.focus.options[focus].hint}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.profile.forms.label}</legend>
                  <p className={styles.legendHint}>{copy.profile.forms.hint}</p>
                  <div className={styles.pills}>
                    {atlasForms.map((form) => (
                      <label key={form} className={styles.pill}>
                        <input
                          type="checkbox"
                          checked={draft.forms.includes(form)}
                          onChange={() => update({ forms: toggle(draft.forms, form) })}
                          className={styles.input}
                        />
                        {copy.profile.forms.options[form]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className={styles.switch}>
                  <span className={styles.switchText}>
                    <span className={styles.optionLabel}>{copy.profile.materials.label}</span>
                    <span className={styles.optionHint}>{copy.profile.materials.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={draft.includeMaterials}
                    onChange={() => update({ includeMaterials: !draft.includeMaterials })}
                    className={styles.input}
                  />
                  <span className={styles.switchTrack} aria-hidden="true" />
                </label>
              </div>
            ) : null}

            {phase === "budget" ? (
              <div role="group" aria-labelledby="atlas-step-title">
                <header className={styles.stepHead}>
                  <h2
                    ref={headingRef}
                    tabIndex={-1}
                    id="atlas-step-title"
                    className={styles.stepTitle}
                  >
                    {copy.budget.title}
                  </h2>
                  <p className={styles.stepLede}>{copy.budget.lede}</p>
                </header>

                <fieldset className={styles.field}>
                  <legend className={styles.legend}>{copy.budget.label}</legend>
                  <div className={styles.options} data-cols="4">
                    {atlasBudgets.map((budget) => (
                      <label key={budget} className={styles.option}>
                        <input
                          type="radio"
                          name="atlas-budget"
                          value={budget}
                          checked={draft.budget === budget}
                          onChange={() => update({ budget })}
                          className={styles.input}
                        />
                        <span className={styles.indicator} data-shape="radio" aria-hidden="true" />
                        <span className={styles.optionLabel}>
                          {copy.budget.options[budget].label}
                        </span>
                        <span className={styles.optionHint}>
                          {copy.budget.options[budget].hint}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className={styles.field}>
                  <label htmlFor="atlas-context" className={styles.legend}>
                    {copy.budget.context.label}{" "}
                    <span className={styles.optional}>· {copy.budget.context.optional}</span>
                  </label>
                  <textarea
                    id="atlas-context"
                    className={styles.textarea}
                    value={draft.context}
                    maxLength={ATLAS_CONTEXT_MAX}
                    placeholder={copy.budget.context.placeholder}
                    aria-describedby="atlas-context-hint"
                    onChange={(event) => update({ context: event.target.value })}
                  />
                  <div className={styles.textareaMeta}>
                    <p id="atlas-context-hint" className={styles.contextHint}>
                      {copy.budget.context.hint}
                    </p>
                    <p className={styles.charCount} aria-live="polite">
                      {fill(copy.budget.context.counter, {
                        n: draft.context.length,
                        max: ATLAS_CONTEXT_MAX,
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
          onEdit={() => setPhase("areas")}
          onRestart={restart}
        />
      ) : null}
    </div>
  );
}
