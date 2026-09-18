import type {
  AtlasAnswerIssue,
  AtlasAnswers,
  AtlasAnswerValue,
  AtlasOptionSource,
  AtlasQuestion,
  AtlasQuestionnaire,
  AtlasRegistrySource,
  AtlasSchemaIssue,
  AtlasCondition,
} from "./types";
import type {
  AtlasGroupView,
  AtlasOptionView,
  AtlasQuestionnaireView,
  AtlasQuestionView,
} from "./view";
import type { LocalizedText } from "@/content/lifecycle";
import type { Locale } from "@/i18n/config";

/**
 * THE QUESTIONNAIRE ENGINE — pure, and the only place answers are judged.
 *
 * Everything here works on the RESOLVED VIEW (`view.ts`), never on the
 * bilingual schema, which is why the browser and the server apply identical
 * rules: the client renders a view and validates against it, the server
 * rebuilds the same view from the same content and re-validates. There is no
 * second copy of "what a valid answer is".
 *
 *   buildQuestionnaireView   schema + locale + registries → what the UI draws
 *   initialAnswers           the answers a fresh questionnaire starts with
 *   conditionHolds           conditional visibility, over answers by id
 *   answerIssues             one question's rules
 *   parseAtlasAnswers        an untrusted body → answers, or issues
 *   answerSummary            one answer as the visitor reads it back
 *
 * It knows no question and no meaning. What an answer MEANS — which profile
 * field it fills and what that field may influence — is `domain/atlas/fields.ts`,
 * and turning answers into the profile is `domain/atlas/profile.ts`.
 */

/* ---- building the view ---------------------------------------------------- */

/** Registry-backed options, resolved by the caller that owns the registries. */
export type AtlasOptionResolver = (
  registry: AtlasRegistrySource,
) => readonly Omit<AtlasOptionView, "value">[];

const text = (value: LocalizedText | undefined, locale: Locale): string | null =>
  value?.[locale]?.trim() || null;

function optionViews(
  source: AtlasOptionSource,
  locale: Locale,
  resolve: AtlasOptionResolver,
): readonly AtlasOptionView[] {
  if (source.kind === "registry") {
    return resolve(source.registry).map((option) => ({ ...option, value: null }));
  }
  return source.items.map((item) => ({
    id: item.id,
    label: item.label[locale],
    hint: text(item.hint, locale),
    value: item.value ?? null,
    meta: null,
  }));
}

function questionView(
  question: AtlasQuestion,
  locale: Locale,
  resolve: AtlasOptionResolver,
): AtlasQuestionView {
  const base = {
    id: question.id,
    kind: question.kind,
    label: question.label[locale],
    shortLabel: text(question.shortLabel, locale) ?? question.label[locale],
    hint: text(question.hint, locale),
    required: question.required ?? false,
    markOptional: question.markOptional ?? false,
    registry:
      (question.kind === "single-select" || question.kind === "multi-select") &&
      question.options.kind === "registry"
        ? question.options.registry
        : null,
    recap: question.recap ?? false,
    visibleWhen: question.visibleWhen ?? null,
    options: [] as readonly AtlasOptionView[],
    render: "cards" as AtlasQuestionView["render"],
    columns: 3 as AtlasQuestionView["columns"],
    ranked: false,
    min: null as number | null,
    max: null as number | null,
    step: null as number | null,
    unit: null as string | null,
    ends: null as AtlasQuestionView["ends"],
    maxLength: null as number | null,
    placeholder: null as string | null,
    footnote: null as string | null,
    autoComplete: null as string | null,
    initial: null as AtlasQuestionView["initial"],
  };

  switch (question.kind) {
    case "single-select":
      return {
        ...base,
        options: optionViews(question.options, locale, resolve),
        render: question.render ?? "cards",
        columns: question.columns ?? 3,
        initial: question.default ?? null,
      };
    case "multi-select":
      return {
        ...base,
        options: optionViews(question.options, locale, resolve),
        render: question.render ?? "cards",
        columns: question.columns ?? 3,
        ranked: question.ranked ?? false,
        min: question.min ?? (question.required ? 1 : 0),
        max: question.max ?? null,
        initial: [],
      };
    case "toggle":
      return { ...base, initial: question.default ?? false };
    case "number":
      return {
        ...base,
        min: question.min,
        max: question.max ?? null,
        step: question.step ?? 1,
        unit: text(question.unit, locale),
        initial: question.default ?? null,
      };
    case "range":
      return {
        ...base,
        min: question.min,
        max: question.max,
        step: question.step ?? 1,
        unit: text(question.unit, locale),
        ends: question.ends
          ? { min: question.ends.min[locale], max: question.ends.max[locale] }
          : null,
        initial: question.default,
      };
    case "short-text":
      return {
        ...base,
        maxLength: question.maxLength,
        placeholder: text(question.placeholder, locale),
        autoComplete: question.autoComplete ?? null,
        initial: "",
      };
    case "long-text":
      return {
        ...base,
        maxLength: question.maxLength,
        placeholder: text(question.placeholder, locale),
        footnote: text(question.footnote, locale),
        initial: "",
      };
  }
}

/**
 * Resolve the questionnaire for one locale.
 *
 * A multi-select marked `hideWithoutOptions` whose registry resolves to
 * nothing is dropped here, so a question with nothing to offer never reaches
 * the browser — and a group left with no questions is dropped with it.
 */
export function buildQuestionnaireView(
  questionnaire: AtlasQuestionnaire,
  locale: Locale,
  resolve: AtlasOptionResolver,
): AtlasQuestionnaireView {
  const groups: AtlasGroupView[] = [];
  for (const group of questionnaire.groups) {
    const questions = group.questions
      .filter(
        (question) =>
          !(
            question.kind === "multi-select" &&
            question.hideWithoutOptions &&
            optionViews(question.options, locale, resolve).length === 0
          ),
      )
      .map((question) => questionView(question, locale, resolve));
    if (questions.length === 0) continue;
    groups.push({
      id: group.id,
      label: group.label[locale],
      title: group.title[locale],
      lede: group.lede[locale],
      visibleWhen: group.visibleWhen ?? null,
      questions,
    });
  }
  return { version: questionnaire.version, groups };
}

/* ---- answers -------------------------------------------------------------- */

export function allQuestions(view: AtlasQuestionnaireView): readonly AtlasQuestionView[] {
  return view.groups.flatMap((group) => group.questions);
}

export function initialAnswers(view: AtlasQuestionnaireView): AtlasAnswers {
  const answers: Record<string, AtlasAnswerValue> = {};
  for (const question of allQuestions(view)) {
    if (question.initial !== null) answers[question.id] = question.initial;
  }
  return answers;
}

function isAnswered(value: AtlasAnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Does a condition hold for these answers? Unknown questions are never met. */
export function conditionHolds(condition: AtlasCondition, answers: AtlasAnswers): boolean {
  if ("all" in condition) return condition.all.every((c) => conditionHolds(c, answers));
  if ("any" in condition) return condition.any.some((c) => conditionHolds(c, answers));
  if ("not" in condition) return !conditionHolds(condition.not, answers);
  const value = answers[condition.question];
  if ("answered" in condition) return isAnswered(value);
  if ("includes" in condition) {
    return Array.isArray(value) && value.includes(condition.includes);
  }
  return value === condition.equals;
}

export function questionVisible(question: AtlasQuestionView, answers: AtlasAnswers): boolean {
  return question.visibleWhen === null || conditionHolds(question.visibleWhen, answers);
}

export function groupVisible(group: AtlasGroupView, answers: AtlasAnswers): boolean {
  if (group.visibleWhen !== null && !conditionHolds(group.visibleWhen, answers)) return false;
  return group.questions.some((question) => questionVisible(question, answers));
}

export function visibleGroups(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
): readonly AtlasGroupView[] {
  return view.groups.filter((group) => groupVisible(group, answers));
}

export function visibleQuestions(
  group: AtlasGroupView,
  answers: AtlasAnswers,
): readonly AtlasQuestionView[] {
  return group.questions.filter((question) => questionVisible(question, answers));
}

/** Everything wrong with one answer. An empty list means it is acceptable. */
export function answerIssues(
  question: AtlasQuestionView,
  value: AtlasAnswerValue | undefined,
): readonly AtlasAnswerIssue[] {
  const issues: AtlasAnswerIssue[] = [];
  const bad = (code: AtlasAnswerIssue["code"], detail?: string) =>
    issues.push({ question: question.id, code, detail });

  if (value === undefined) {
    if (question.required) bad("required");
    return issues;
  }

  switch (question.kind) {
    case "single-select": {
      if (typeof value !== "string") {
        bad("wrong_type");
        break;
      }
      if (value === "") {
        if (question.required) bad("required");
        break;
      }
      if (!question.options.some((option) => option.id === value)) bad("unknown_option", value);
      break;
    }
    case "multi-select": {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
        bad("wrong_type");
        break;
      }
      const list = value as readonly string[];
      if (new Set(list).size !== list.length) bad("duplicate");
      for (const id of list) {
        if (!question.options.some((option) => option.id === id)) bad("unknown_option", id);
      }
      if (question.min !== null && list.length < question.min) bad("too_few", String(question.min));
      if (question.max !== null && list.length > question.max)
        bad("too_many", String(question.max));
      break;
    }
    case "toggle":
      if (typeof value !== "boolean") bad("wrong_type");
      break;
    case "number":
    case "range": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        bad("wrong_type");
        break;
      }
      if (question.min !== null && value < question.min) bad("out_of_range", String(value));
      if (question.max !== null && value > question.max) bad("out_of_range", String(value));
      break;
    }
    case "short-text":
    case "long-text": {
      if (typeof value !== "string") {
        bad("wrong_type");
        break;
      }
      if (question.required && value.trim() === "") bad("required");
      if (question.maxLength !== null && value.length > question.maxLength) {
        bad("too_long", String(value.length));
      }
      break;
    }
  }
  return issues;
}

/** Can this step be left? Only its VISIBLE questions are judged. */
export function groupComplete(group: AtlasGroupView, answers: AtlasAnswers): boolean {
  return visibleQuestions(group, answers).every(
    (question) => answerIssues(question, answers[question.id]).length === 0,
  );
}

export type AtlasAnswersResult =
  { ok: true; answers: AtlasAnswers } | { ok: false; issues: readonly AtlasAnswerIssue[] };

/**
 * An untrusted body → answers.
 *
 * REJECTS rather than coerces: an unknown question id, a value of the wrong
 * shape, an option outside the resolved list, a number out of bounds or text
 * over its limit all fail the whole submission. Answers to questions that are
 * not visible are DROPPED, so a stale draft cannot smuggle in an answer to a
 * question the visitor never saw.
 */
export function parseAtlasAnswers(
  input: unknown,
  view: AtlasQuestionnaireView,
): AtlasAnswersResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, issues: [{ question: "*", code: "wrong_type" }] };
  }
  const body = input as Record<string, unknown>;
  const questions = allQuestions(view);
  const known = new Map(questions.map((question) => [question.id, question]));
  const issues: AtlasAnswerIssue[] = [];

  for (const key of Object.keys(body)) {
    if (!known.has(key)) issues.push({ question: key, code: "unknown_question" });
  }

  /* Visibility is decided on the submitted answers, in declaration order. */
  const staged: Record<string, AtlasAnswerValue> = {};
  for (const question of questions) {
    if (!questionVisible(question, staged)) continue;
    const raw = body[question.id];
    const value = raw === undefined ? undefined : (raw as AtlasAnswerValue);
    const problems = answerIssues(question, value);
    issues.push(...problems);
    if (value !== undefined && problems.length === 0) staged[question.id] = value;
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, answers: staged };
}

const asText = (value: AtlasAnswerValue | undefined): string =>
  typeof value === "string" ? value : "";

/* ---- showing an answer back ----------------------------------------------- */

/**
 * One answer as a reader sees it, built from the same option labels the
 * question was drawn with. The result page never formats an answer itself.
 */
export function answerSummary(
  question: AtlasQuestionView,
  value: AtlasAnswerValue | undefined,
  copy: { yes: string; no: string },
): string | null {
  if (!isAnswered(value)) return null;
  const labelOf = (id: string) => question.options.find((option) => option.id === id)?.label ?? id;

  switch (question.kind) {
    case "single-select":
      return labelOf(value as string);
    case "multi-select":
      return (value as readonly string[]).map(labelOf).join(" · ");
    case "toggle":
      return value ? copy.yes : copy.no;
    case "number":
    case "range":
      return question.unit ? `${value} ${question.unit}` : String(value);
    case "short-text":
      return asText(value);
    case "long-text":
      /* The note's own words are never echoed — only that one was given. */
      return null;
  }
}

/* ---- schema validation (tooling, not pages) ------------------------------- */

/**
 * Everything structurally wrong with the questionnaire CONTENT.
 *
 * `check:atlas` fails on any issue, so a questionnaire that could not be
 * answered — a condition pointing at a later question, a duplicate id, a
 * default that is not an option — is caught before it ships.
 */
export function validateQuestionnaire(
  questionnaire: AtlasQuestionnaire,
  registries: readonly AtlasRegistrySource[] = [
    "discovery-areas",
    "published-products",
    "research-functions",
  ],
): readonly AtlasSchemaIssue[] {
  const issues: AtlasSchemaIssue[] = [];
  const add = (code: AtlasSchemaIssue["code"], where: string, detail?: string) =>
    issues.push({ code, where, detail });

  const groupIds = new Set<string>();
  const questionIds = new Set<string>();
  const seen: string[] = [];

  const checkCondition = (condition: AtlasCondition, where: string) => {
    if ("all" in condition) return condition.all.forEach((c) => checkCondition(c, where));
    if ("any" in condition) return condition.any.forEach((c) => checkCondition(c, where));
    if ("not" in condition) return checkCondition(condition.not, where);
    if (!questionIds.has(condition.question)) {
      add(
        seen.includes(condition.question)
          ? "condition_unknown_question"
          : "condition_forward_reference",
        where,
        condition.question,
      );
    }
  };

  for (const group of questionnaire.groups) {
    if (groupIds.has(group.id)) add("duplicate_group_id", group.id);
    groupIds.add(group.id);

    for (const question of group.questions) {
      const where = `${group.id}/${question.id}`;
      if (questionIds.has(question.id)) add("duplicate_question_id", where);

      if (question.kind === "single-select" || question.kind === "multi-select") {
        if (question.options.kind === "registry") {
          if (!registries.includes(question.options.registry)) {
            add("registry_source_unknown", where, question.options.registry);
          }
        } else {
          const ids = new Set<string>();
          for (const item of question.options.items) {
            if (ids.has(item.id)) add("duplicate_option_id", where, item.id);
            ids.add(item.id);
          }
          if (
            question.kind === "single-select" &&
            question.default !== undefined &&
            !ids.has(question.default)
          ) {
            add("default_not_an_option", where, question.default);
          }
        }
        if (question.kind === "multi-select") {
          const min = question.min ?? 0;
          if (question.max !== undefined && question.max < Math.max(min, 1)) {
            add("bad_bounds", where, `max ${question.max} below min ${min}`);
          }
        }
      }

      if (question.kind === "number" || question.kind === "range") {
        if (question.max !== undefined && question.max <= question.min)
          add("bad_bounds", where, `${question.min}–${question.max}`);
        if (
          question.kind === "range" &&
          (question.default < question.min || question.default > question.max)
        ) {
          add("bad_bounds", where, `default ${question.default} outside bounds`);
        }
      }

      /* Declared BEFORE its own conditions are checked: self-reference is a
         forward reference, not a valid dependency. */
      if (question.visibleWhen) checkCondition(question.visibleWhen, where);
      questionIds.add(question.id);
      seen.push(question.id);
    }
    if (group.visibleWhen) checkCondition(group.visibleWhen, group.id);
  }

  return issues;
}

export type {
  AtlasAnswerIssue,
  AtlasAnswers,
  AtlasAnswerValue,
  AtlasCondition,
  AtlasQuestion,
  AtlasQuestionnaire,
  AtlasQuestionGroup,
  AtlasRegistrySource,
  AtlasSchemaIssue,
} from "./types";
export type {
  AtlasGroupView,
  AtlasOptionMeta,
  AtlasOptionView,
  AtlasQuestionnaireView,
  AtlasQuestionView,
} from "./view";
