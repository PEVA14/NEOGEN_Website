import { Mono } from "@/components/typography";

import styles from "./Field.module.css";

import type { IssueCode, ValidationIssue } from "@/domain/checkout";

/**
 * CHECKOUT FORM PRIMITIVES.
 *
 * These are server components rendering plain HTML controls inside a plain
 * `<form>` — no client JavaScript anywhere in the checkout's field layer.
 * Validation happens in the server action and its result comes back as the
 * next render, so the error a customer sees is produced by the same code that
 * decides whether the order may be created. There is no client-side copy of
 * any rule to drift.
 *
 * ERROR ASSOCIATION IS THE POINT OF THIS FILE.
 * --------------------------------------------
 * A message sitting visually below an input is not connected to it for anyone
 * using a screen reader. So each field wires three things:
 *
 *   `aria-invalid` — states the condition, not just its colour.
 *   `aria-describedby` — points at the message AND the hint, so both are
 *     announced when focus lands, in that order.
 *   `aria-errormessage` is deliberately NOT used: support is still uneven, and
 *     `describedby` is announced reliably everywhere today.
 *
 * COLOUR IS NEVER THE ONLY SIGNAL. The rule beside an invalid field thickens,
 * the message is text, and `aria-invalid` carries it programmatically — so the
 * state survives a monochrome display, a colour-blind reader and a screen
 * reader equally.
 */

export type FieldErrors = Record<string, IssueCode | undefined>;

/** Reduce a validator's output to one message per field — the first wins. */
export function errorsFor(issues: readonly ValidationIssue[], show: boolean): FieldErrors {
  if (!show) return {};
  const map: FieldErrors = {};
  for (const issue of issues) {
    map[issue.field] ??= issue.code;
  }
  return map;
}

export interface FieldCopy {
  label: string;
  hint?: string;
}

interface BaseFieldProps {
  name: string;
  copy: FieldCopy;
  /** Localized message, already resolved from the issue code. Null when valid. */
  error?: string | null;
  defaultValue?: string;
  required?: boolean;
  span?: "full" | "half" | "third" | "quarter";
  autoComplete?: string;
}

function ids(name: string) {
  return { input: `f-${name}`, hint: `f-${name}-hint`, error: `f-${name}-error` };
}

function describedBy(name: string, hasHint: boolean, hasError: boolean): string | undefined {
  const id = ids(name);
  const parts = [hasError ? id.error : null, hasHint ? id.hint : null].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function Label({ name, copy }: { name: string; copy: FieldCopy }) {
  return (
    <label className={styles.label} htmlFor={ids(name).input}>
      <Mono size="2xs" className={styles.labelText}>
        {copy.label}
      </Mono>
    </label>
  );
}

function Messages({ name, copy, error }: { name: string; copy: FieldCopy; error?: string | null }) {
  const id = ids(name);
  return (
    <>
      {copy.hint ? (
        <Mono size="2xs" className={styles.hint} id={id.hint}>
          {copy.hint}
        </Mono>
      ) : null}
      {error ? (
        <Mono size="2xs" className={styles.error} id={id.error}>
          {/* A mark as well as the colour, so the state does not depend on
              being able to see the difference between two greys. */}
          <span aria-hidden="true">✕ </span>
          {error}
        </Mono>
      ) : null}
    </>
  );
}

export function Field({
  name,
  copy,
  error,
  defaultValue,
  required,
  span = "full",
  autoComplete,
  type = "text",
  inputMode,
  maxLength,
}: BaseFieldProps & {
  type?: "text" | "email" | "tel";
  inputMode?: "text" | "email" | "tel" | "numeric";
  maxLength?: number;
}) {
  const id = ids(name);
  return (
    <div className={styles.field} data-span={span} data-invalid={error ? "true" : undefined}>
      <Label name={name} copy={copy} />
      <input
        id={id.input}
        name={name}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, Boolean(copy.hint), Boolean(error))}
        className={styles.input}
      />
      <Messages name={name} copy={copy} error={error} />
    </div>
  );
}

export function SelectField({
  name,
  copy,
  error,
  defaultValue,
  required,
  span = "full",
  autoComplete,
  options,
  placeholder,
}: BaseFieldProps & {
  options: readonly { value: string; label: string }[];
  placeholder: string;
}) {
  const id = ids(name);
  return (
    <div className={styles.field} data-span={span} data-invalid={error ? "true" : undefined}>
      <Label name={name} copy={copy} />
      <div className={styles.selectWrap}>
        <select
          id={id.input}
          name={name}
          autoComplete={autoComplete}
          defaultValue={defaultValue ?? ""}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, Boolean(copy.hint), Boolean(error))}
          className={styles.select}
        >
          {/* An empty first option rather than a pre-selected state: guessing
              someone's state is worse than asking, and a silently wrong
              default is the kind of error nobody re-reads. */}
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className={styles.selectMark} aria-hidden="true" />
      </div>
      <Messages name={name} copy={copy} error={error} />
    </div>
  );
}

export function TextareaField({
  name,
  copy,
  error,
  defaultValue,
  span = "full",
  maxLength,
}: BaseFieldProps & { maxLength?: number }) {
  const id = ids(name);
  return (
    <div className={styles.field} data-span={span} data-invalid={error ? "true" : undefined}>
      <Label name={name} copy={copy} />
      <textarea
        id={id.input}
        name={name}
        rows={3}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, Boolean(copy.hint), Boolean(error))}
        className={styles.textarea}
      />
      <Messages name={name} copy={copy} error={error} />
    </div>
  );
}

/**
 * A summary of everything wrong, above the form.
 *
 * `role="alert"` so it is announced when the step re-renders after a failed
 * submit — without it, a customer who cannot see the page gets a silent
 * reload and no idea why they are still on the same step. Each entry links to
 * its field, which is the only fast way to fix a long form by keyboard.
 */
export function ErrorSummary({
  title,
  entries,
}: {
  title: string;
  entries: readonly { field: string; label: string; message: string }[];
}) {
  if (entries.length === 0) return null;
  return (
    <div className={styles.summary} role="alert">
      <Mono size="2xs" className={styles.summaryTitle}>
        {title}
      </Mono>
      <ul className={styles.summaryList}>
        {entries.map((entry) => (
          <li key={entry.field}>
            <a href={`#${ids(entry.field).input}`} className={styles.summaryLink}>
              {entry.label} — {entry.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The primary action ending a step. Charcoal, full-width, 44px minimum. */
export function StepActions({
  submit,
  back,
  disabled,
}: {
  submit: string;
  back?: { href: string; label: string };
  disabled?: boolean;
}) {
  return (
    <div className={styles.actions}>
      <button type="submit" className={styles.submit} disabled={disabled}>
        {submit}
      </button>
      {back ? (
        <a href={back.href} className={styles.back}>
          ← {back.label}
        </a>
      ) : null}
    </div>
  );
}
