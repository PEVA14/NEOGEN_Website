"use client";

import { useMemo, useState } from "react";

import styles from "./AtlasExperience.module.css";

import type { AtlasFieldCopy } from "./types";
import type { AtlasAnswerValue, AtlasQuestionView } from "@/domain/atlas/questionnaire";

/**
 * ONE QUESTION, DRAWN.
 *
 * The renderer for every question kind, and the only place the questionnaire
 * meets the DOM. It reads a RESOLVED question (`AtlasQuestionView`) — labels
 * already in the visitor's language, options already read from the registries
 * — and reports a new answer. It holds no question, no option and no rule.
 *
 * ADDING A KIND is a case in `Field` plus its fields on the view. Adding a
 * QUESTION is neither: it is a line of questionnaire content.
 *
 * Each kind keeps the markup and classes the questionnaire already used, so
 * the visual design is unchanged: option cards, pills, area tiles, the switch,
 * the search field, the note counter.
 */

export interface QuestionFieldProps {
  question: AtlasQuestionView;
  value: AtlasAnswerValue | undefined;
  onChange: (value: AtlasAnswerValue) => void;
  copy: AtlasFieldCopy;
  /**
   * Area ids the visitor has chosen, used only to order a long registry list
   * before they search it. Presentation, never selection.
   */
  preferredAreas: readonly string[];
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

const fold = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const PRODUCT_LIST_LIMIT = 18;

function asList(value: AtlasAnswerValue | undefined): readonly string[] {
  return Array.isArray(value) ? (value as readonly string[]) : [];
}

/** Toggle one id in a list, respecting the question's own maximum. */
function toggle(list: readonly string[], id: string, max: number | null): string[] {
  if (list.includes(id)) return list.filter((v) => v !== id);
  if (max !== null && list.length >= max) return [...list];
  return [...list, id];
}

/** Count copy for a registry option — products for an area, compounds for a function. */
function metaCount(question: AtlasQuestionView, count: number, copy: AtlasFieldCopy): string {
  if (question.role === "research-functions") {
    return count === 1 ? copy.meta.compoundOne : fill(copy.meta.compounds, { n: count });
  }
  return fill(copy.meta.products, { n: count });
}

export function QuestionField({
  question,
  value,
  onChange,
  copy,
  preferredAreas,
}: QuestionFieldProps) {
  const [query, setQuery] = useState("");
  const [limitHit, setLimitHit] = useState(false);
  const selected = asList(value);

  const labelId = `atlas-q-${question.id}`;
  const hintId = question.hint ? `${labelId}-hint` : undefined;

  const legend = (
    <>
      <legend className={styles.legend}>
        {question.label}
        {question.markOptional ? <span className={styles.optional}> · {copy.optional}</span> : null}
      </legend>
      {question.hint ? (
        <p id={hintId} className={styles.legendHint}>
          {question.hint}
        </p>
      ) : null}
    </>
  );

  /* ---- multi-select ------------------------------------------------------- */
  if (question.kind === "multi-select") {
    const pick = (id: string) => {
      const next = toggle(selected, id, question.max);
      setLimitHit(next.length === selected.length && !selected.includes(id));
      onChange(next);
    };
    const full = question.max !== null && selected.length >= question.max;

    const counter =
      question.max !== null ? (
        <p className={styles.selection} aria-live="polite">
          {fill(copy.selected, { n: selected.length, max: question.max })}
          {limitHit ? ` — ${fill(copy.limit, { max: question.max })}` : ""}
        </p>
      ) : null;

    if (question.render === "tiles") {
      return (
        <fieldset className={styles.field}>
          {legend}
          {counter}
          <ul className={styles.areaGrid}>
            {question.options.map((option) => {
              const rank = selected.indexOf(option.id);
              const isSelected = rank >= 0;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    className={styles.areaTile}
                    data-area={option.meta?.area}
                    data-selected={isSelected ? "" : undefined}
                    onClick={() => pick(option.id)}
                  >
                    <span className={styles.areaSwatch} aria-hidden="true" />
                    <span className={styles.areaRank}>
                      {isSelected && question.ranked ? (copy.ranks[rank] ?? " ") : " "}
                    </span>
                    <span className={styles.areaLabel}>{option.label}</span>
                    {option.meta?.framing ? (
                      <span className={styles.areaFraming}>{option.meta.framing}</span>
                    ) : null}
                    {option.meta?.body ? (
                      <span className={styles.areaBody}>{option.meta.body}</span>
                    ) : null}
                    <span className={styles.areaFoot}>
                      {option.meta?.compounds !== undefined ? (
                        <span>{metaCount(question, option.meta.compounds, copy)}</span>
                      ) : null}
                      {option.meta?.entryPrice ? (
                        <span>
                          {copy.meta.from} {option.meta.entryPrice}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      );
    }

    if (question.render === "search") {
      const byName = fold(query.trim());
      const pool = byName
        ? question.options.filter((option) => fold(option.label).includes(byName))
        : question.options.filter((option) =>
            (option.meta?.areas ?? []).some((area) => preferredAreas.includes(area)),
          );
      const matches = pool
        .filter((option) => !selected.includes(option.id))
        .slice(0, PRODUCT_LIST_LIMIT);
      const nameOf = (id: string) =>
        question.options.find((option) => option.id === id)?.label ?? id;

      return (
        <fieldset className={styles.field}>
          {legend}
          {selected.length > 0 ? (
            <ul className={styles.chosen}>
              {selected.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={styles.chosenItem}
                    aria-label={fill(copy.remove, { name: nameOf(id) })}
                    onClick={() => onChange(selected.filter((s) => s !== id))}
                  >
                    {nameOf(id)} <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {full ? null : (
            <>
              <label className={styles.srOnly} htmlFor={`${labelId}-search`}>
                {copy.search}
              </label>
              <input
                id={`${labelId}-search`}
                type="search"
                className={styles.textInput}
                placeholder={copy.search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
              <div className={styles.pills}>
                {matches.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={styles.pill}
                    onClick={() => {
                      onChange([...selected, option.id]);
                      setQuery("");
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                {matches.length === 0 && query ? (
                  <p className={styles.legendHint}>{copy.empty}</p>
                ) : null}
              </div>
            </>
          )}
        </fieldset>
      );
    }

    if (question.render === "pills") {
      return (
        <fieldset className={styles.field}>
          {legend}
          <div className={styles.pills}>
            {question.options.map((option) => (
              <label key={option.id} className={styles.pill}>
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  onChange={() => pick(option.id)}
                  className={styles.input}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    return (
      <fieldset className={styles.field}>
        {legend}
        {counter}
        <div className={styles.options} data-cols={question.columns}>
          {question.options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label key={option.id} className={styles.option}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && full}
                  onChange={() => pick(option.id)}
                  className={styles.input}
                />
                <span className={styles.indicator} aria-hidden="true" />
                <span className={styles.optionLabel}>{option.label}</span>
                {option.hint || option.meta?.compounds !== undefined ? (
                  <span className={styles.optionHint}>
                    {option.hint}
                    {option.meta?.compounds !== undefined
                      ? ` ${metaCount(question, option.meta.compounds, copy)}`
                      : ""}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  /* ---- single-select ------------------------------------------------------ */
  if (question.kind === "single-select") {
    if (question.render === "pills") {
      return (
        <fieldset className={styles.field}>
          {legend}
          <div className={styles.pills}>
            {question.options.map((option) => (
              <label key={option.id} className={styles.pill}>
                <input
                  type="radio"
                  name={labelId}
                  checked={value === option.id}
                  onChange={() => onChange(option.id)}
                  className={styles.input}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
    return (
      <fieldset className={styles.field}>
        {legend}
        <div className={styles.options} data-cols={question.columns}>
          {question.options.map((option) => (
            <label key={option.id} className={styles.option}>
              <input
                type="radio"
                name={labelId}
                value={option.id}
                checked={value === option.id}
                onChange={() => onChange(option.id)}
                className={styles.input}
              />
              <span className={styles.indicator} data-shape="radio" aria-hidden="true" />
              <span className={styles.optionLabel}>{option.label}</span>
              {option.hint ? <span className={styles.optionHint}>{option.hint}</span> : null}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  /* ---- toggle ------------------------------------------------------------- */
  if (question.kind === "toggle") {
    return (
      <label className={styles.switch}>
        <span className={styles.switchText}>
          <span className={styles.optionLabel}>{question.label}</span>
          {question.hint ? <span className={styles.optionHint}>{question.hint}</span> : null}
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={value === true}
          onChange={() => onChange(!(value === true))}
          className={styles.input}
        />
        <span className={styles.switchTrack} aria-hidden="true" />
      </label>
    );
  }

  /* ---- number and range --------------------------------------------------- */
  if (question.kind === "number" || question.kind === "range") {
    const current = typeof value === "number" ? value : (question.min ?? 0);
    const shown = question.unit ? `${current} ${question.unit}` : String(current);
    return (
      <div className={styles.field}>
        <label htmlFor={labelId} className={styles.legend}>
          {question.label}
          {question.markOptional ? (
            <span className={styles.optional}> · {copy.optional}</span>
          ) : null}
        </label>
        {question.hint ? (
          <p id={hintId} className={styles.legendHint}>
            {question.hint}
          </p>
        ) : null}
        {question.kind === "range" ? (
          <>
            <input
              id={labelId}
              type="range"
              className={styles.slider}
              min={question.min ?? undefined}
              max={question.max ?? undefined}
              step={question.step ?? undefined}
              value={current}
              aria-describedby={hintId}
              aria-valuetext={shown}
              onChange={(event) => onChange(Number(event.target.value))}
            />
            <div className={styles.sliderMeta}>
              <span>{question.ends?.min ?? question.min}</span>
              <strong className={styles.sliderValue}>{shown}</strong>
              <span>{question.ends?.max ?? question.max}</span>
            </div>
          </>
        ) : (
          <div className={styles.numberRow}>
            <input
              id={labelId}
              type="number"
              className={styles.numberInput}
              min={question.min ?? undefined}
              max={question.max ?? undefined}
              step={question.step ?? undefined}
              value={typeof value === "number" ? value : ""}
              aria-describedby={hintId}
              inputMode="numeric"
              onChange={(event) =>
                onChange(event.target.value === "" ? "" : Number(event.target.value))
              }
            />
            {question.unit ? <span className={styles.unit}>{question.unit}</span> : null}
          </div>
        )}
      </div>
    );
  }

  /* ---- short text --------------------------------------------------------- */
  if (question.kind === "short-text") {
    return (
      <div className={styles.field}>
        <label htmlFor={labelId} className={styles.legend}>
          {question.label}
        </label>
        {question.hint ? (
          <p id={hintId} className={styles.legendHint}>
            {question.hint}
          </p>
        ) : null}
        <input
          id={labelId}
          type="text"
          className={styles.textInput}
          value={typeof value === "string" ? value : ""}
          maxLength={question.maxLength ?? undefined}
          placeholder={question.placeholder ?? undefined}
          autoComplete={question.autoComplete ?? undefined}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  /* ---- long text ---------------------------------------------------------- */
  const text = typeof value === "string" ? value : "";
  return (
    <div className={styles.field}>
      <label htmlFor={labelId} className={styles.legend}>
        {question.label}
        {question.markOptional ? <span className={styles.optional}> · {copy.optional}</span> : null}
      </label>
      <textarea
        id={labelId}
        className={styles.textarea}
        value={text}
        maxLength={question.maxLength ?? undefined}
        placeholder={question.placeholder ?? undefined}
        aria-describedby={question.footnote ? `${labelId}-foot` : hintId}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className={styles.textareaMeta}>
        {question.footnote ? (
          <p id={`${labelId}-foot`} className={styles.contextHint}>
            {question.footnote}
          </p>
        ) : (
          <span />
        )}
        {question.maxLength !== null ? (
          <p className={styles.charCount} aria-live="polite">
            {fill(copy.counter, { n: text.length, max: question.maxLength })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Products the visitor already chose for the role-topics question, if any. */
export function usePreferredAreas(
  questions: readonly AtlasQuestionView[],
  answers: Readonly<Record<string, AtlasAnswerValue>>,
): readonly string[] {
  return useMemo(() => {
    const topics = questions.find((question) => question.role === "topics");
    return topics ? asList(answers[topics.id]) : [];
  }, [questions, answers]);
}
