"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Container } from "@/components/primitives";
import {
  answerIssues,
  groupComplete,
  initialAnswers,
  visibleGroups,
  visibleQuestions,
  type AtlasAnswers,
  type AtlasAnswerValue,
  type AtlasQuestionnaireView,
} from "@/domain/atlas/questionnaire";
import { atlasRecap, buildAtlasLedger } from "@/domain/atlas/ledger";
import { transmittableAnswers } from "@/domain/atlas/privacy";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import { AtlasMark } from "./AtlasMark";
import { AtlasResult } from "./AtlasResult";
import { QuestionField, usePreferredAreas } from "./QuestionField";
import styles from "./AtlasExperience.module.css";

import type { AtlasCopy } from "./types";
import type { AtlasResultView } from "@/domain/atlas/result";
import type { Locale } from "@/i18n/config";

/**
 * NEOGEN ATLAS — the questionnaire, the generation, the result.
 *
 * One client island, and it knows NO question. It receives the resolved
 * questionnaire (`AtlasQuestionnaireView`) and renders it: groups become
 * steps, the rail reads their names, `QuestionField` draws each question, and
 * the engine decides what is answerable and when a step is complete. Adding or
 * rewriting a question never touches this file — see
 * `src/content/atlas/questionnaire.ts` and `docs/ATLAS_QUESTIONNAIRE.md`.
 *
 * It holds no recommendation rule either. Generation is a single POST to
 * `/api/atlas` carrying the TRANSMITTABLE answers and a locale — never a
 * prompt, a model or a product list — and the response is an assembled
 * result. Answers the privacy policy keeps on the device (`domain/atlas/privacy.ts`)
 * never leave this component: they are shown back in the ledger, built here.
 *
 * PERSISTENCE is a per-viewer convenience only: the answers and the last
 * result sit in `sessionStorage`, keyed by the questionnaire's version so a
 * changed questionnaire discards stale drafts rather than restoring them
 * wrong. Every read and write is guarded, and the experience works without it.
 */

type Phase = "intro" | "generating" | "result" | "error" | { step: string };
type ErrorKind = "rate_limited" | "invalid" | "failed";

const pad = (n: number) => String(n).padStart(2, "0");
const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

export function AtlasExperience({
  locale,
  questionnaire,
  copy,
}: {
  locale: Locale;
  questionnaire: AtlasQuestionnaireView;
  copy: AtlasCopy;
}) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<AtlasAnswers>(() => initialAnswers(questionnaire));
  const [result, setResult] = useState<AtlasResultView | null>(null);
  const [error, setError] = useState<ErrorKind | null>(null);
  const [stage, setStage] = useState(0);
  /* Nothing is written back until the restore has run, or the first render
     would overwrite the draft it is about to read. */
  const [hydrated, setHydrated] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const restored = useRef(false);
  const settled = useRef(false);

  const storageKey = `neogen.atlas.v${questionnaire.version}`;
  const steps = visibleGroups(questionnaire, answers);
  const stepIndex = typeof phase === "object" ? steps.findIndex((g) => g.id === phase.step) : -1;
  const group = stepIndex >= 0 ? steps[stepIndex] : null;
  const questions = useMemo(
    () => questionnaire.groups.flatMap((g) => g.questions),
    [questionnaire],
  );
  const preferredAreas = usePreferredAreas(questions, answers);

  /* Restore once, after hydration, from a callback rather than the effect body. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    queueMicrotask(() => {
      try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (!raw) {
          setHydrated(true);
          return;
        }
        const saved = JSON.parse(raw) as {
          answers?: Record<string, AtlasAnswerValue>;
          step?: unknown;
          result?: AtlasResultView;
        };
        if (saved.answers) {
          /* Kept answer by answer: one that no longer validates is dropped,
             the rest of a part-finished questionnaire survives. */
          const kept: Record<string, AtlasAnswerValue> = { ...initialAnswers(questionnaire) };
          for (const question of questions) {
            const value = saved.answers[question.id];
            if (value === undefined) continue;
            if (answerIssues(question, value).length === 0) kept[question.id] = value;
          }
          setAnswers(kept);
        }
        if (saved.result) {
          setResult(saved.result);
          setPhase("result");
        } else if (
          typeof saved.step === "string" &&
          questionnaire.groups.some((g) => g.id === saved.step)
        ) {
          setPhase({ step: saved.step });
        }
      } catch {
        /* Storage unavailable or malformed: start fresh. */
      }
      setHydrated(true);
    });
  }, [questionnaire, questions, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          /* Only a step is remembered as a step: from the intro, the result or
             a failure, a reload returns to where the visitor actually was. */
          step: typeof phase === "object" ? phase.step : null,
          result: phase === "result" ? result : null,
        }),
      );
    } catch {
      /* Private mode or blocked storage: nothing to keep, nothing breaks. */
    }
  }, [answers, hydrated, phase, result, storageKey]);

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

  const setAnswer = (id: string, value: AtlasAnswerValue) =>
    setAnswers((current) => ({ ...current, [id]: value }));

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
        body: JSON.stringify({ locale, answers: transmittableAnswers(answers) }),
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
  }, [answers, locale, reduced, copy.generating.stages.length]);

  const first = steps[0]?.id;
  const last = steps[steps.length - 1]?.id;
  const restart = () => {
    setAnswers(initialAnswers(questionnaire));
    setResult(null);
    if (first) setPhase({ step: first });
  };

  const canAdvance = group === null || groupComplete(group, answers);
  const onLastStep = group !== null && group.id === last;

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
                  <button
                    type="button"
                    className={styles.start}
                    onClick={() => first && setPhase({ step: first })}
                  >
                    {copy.intro.start}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className={styles.duration}>{copy.intro.duration}</p>
                </div>
              </div>

              {/* The steps announce themselves: one point per group, in order. */}
              <ol className={styles.points} data-count={steps.length}>
                {steps.map((step, i) => (
                  <li key={step.id}>
                    <span className={styles.pointIndex}>{pad(i + 1)}</span>
                    <span className={styles.pointTitle}>{step.label}</span>
                    <span className={styles.pointBody}>{step.lede}</span>
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

      {group !== null ? (
        <section className={styles.flow} aria-labelledby="atlas-step-title">
          <Container width="full">
            <ol
              className={styles.rail}
              data-count={steps.length}
              aria-label={fill(copy.progress, { n: stepIndex + 1, total: steps.length })}
            >
              {steps.map((step, i) => (
                <li
                  key={step.id}
                  data-state={i < stepIndex ? "done" : i === stepIndex ? "current" : "todo"}
                  aria-current={i === stepIndex ? "step" : undefined}
                >
                  <span className={styles.railBar} aria-hidden="true" />
                  <span className={styles.railLabel}>
                    {pad(i + 1)}
                    <span className={styles.railName}> · {step.label}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div role="group" aria-labelledby="atlas-step-title">
              <header className={styles.stepHead}>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  id="atlas-step-title"
                  className={styles.stepTitle}
                >
                  {group.title}
                </h2>
                <p className={styles.stepLede}>{group.lede}</p>
              </header>

              {visibleQuestions(group, answers).map((question) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => setAnswer(question.id, value)}
                  copy={copy.field}
                  preferredAreas={preferredAreas}
                />
              ))}
            </div>

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.back}
                onClick={() =>
                  setPhase(stepIndex <= 0 ? "intro" : { step: steps[stepIndex - 1].id })
                }
              >
                <span aria-hidden="true">←</span> {copy.controls.back}
              </button>
              {onLastStep ? (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!canAdvance}
                  onClick={generate}
                >
                  {copy.controls.generate}
                  <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!canAdvance}
                  onClick={() => setPhase({ step: steps[stepIndex + 1].id })}
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
                <button
                  type="button"
                  className={styles.back}
                  onClick={() => last && setPhase({ step: last })}
                >
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
          ledger={buildAtlasLedger(
            questionnaire,
            answers,
            copy.result.ledger,
            result.policy,
            result.notices.noteDiscarded,
          )}
          recap={atlasRecap(questionnaire, answers, copy.result.ledger, result.policy)}
          copy={copy}
          headingRef={headingRef}
          onEdit={() => first && setPhase({ step: first })}
          onRestart={restart}
        />
      ) : null}
    </div>
  );
}
