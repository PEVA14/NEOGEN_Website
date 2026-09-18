import {
  ATLAS_BINDINGS,
  ATLAS_FIELDS,
  EXPERIENCE_LEVELS,
  GOAL_AREAS,
  fieldOf,
  isTransmitted,
  type AtlasFieldId,
} from "./fields";
import { allQuestions, questionVisible } from "./questionnaire";
import { ATLAS_TOPIC_RANKS } from "./types";

import type { AtlasAnswers, AtlasAnswerValue, AtlasQuestionnaireView } from "./questionnaire";
import type { AtlasProfile, AtlasWithheldField } from "./types";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * ANSWERS → PROFILE.
 *
 * The only code that reads an answer by question id, and it does so through
 * `fields.ts`: each visible, bound question fills its field, translated into
 * the pipeline's own vocabulary (a goal becomes an area id, an experience
 * option becomes a level). Downstream code sees the profile and never a
 * question id, so the questionnaire can be reworded, reordered or extended
 * without touching the policy.
 *
 * A permitted field no question fills runs on `FIELD_DEFAULTS` and is marked
 * `default` in `sources`, so nothing downstream presents a default as
 * something the visitor said. A withheld field is listed by name and reason in
 * `withheld`, with no value — see `AtlasWithheldField`.
 */

export const FIELD_DEFAULTS = {
  areas: [] as readonly DiscoveryAreaId[],
  functions: [] as AtlasProfile["functions"],
  products: [] as readonly string[],
  intent: "first-order",
  timing: "no-rush",
  priorities: [] as AtlasProfile["priorities"],
  experience: "some",
  forms: [] as AtlasProfile["forms"],
  size: "no-preference",
  includeSupplies: false,
  budgetCap: null as number | null,
  horizon: "one-order",
  history: "first-time",
  style: "direct",
  firstName: "",
  note: "",
} as const satisfies Omit<AtlasProfile, "sources" | "withheld">;

/** The visible, bound answer for a field — the first visible question that fills it. */
function answerFor(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  field: AtlasFieldId,
): AtlasAnswerValue | undefined {
  for (const question of allQuestions(view)) {
    if (fieldOf(question.id) !== field || !questionVisible(question, answers)) continue;
    const value = answers[question.id];
    const answered =
      value !== undefined &&
      !(typeof value === "string" && value.trim() === "") &&
      !(Array.isArray(value) && value.length === 0);
    if (answered) return value;
  }
  return undefined;
}

export function profileFromAnswers(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
): AtlasProfile {
  const sources: Partial<Record<AtlasFieldId, "answer" | "default">> = {};
  const mark = (field: AtlasFieldId, answered: boolean) => {
    sources[field] = answered ? "answer" : "default";
  };

  /* goal-area: the goal option → the catalogue area it corresponds to. */
  const goal = answerFor(view, answers, "goal-area");
  const areas =
    typeof goal === "string" && goal in GOAL_AREAS
      ? GOAL_AREAS[goal].slice(0, ATLAS_TOPIC_RANKS)
      : FIELD_DEFAULTS.areas;
  mark("goal-area", typeof goal === "string" && goal in GOAL_AREAS);

  /* experience: an option id → a level; an id the table does not know falls back. */
  const level = answerFor(view, answers, "experience");
  const experience =
    typeof level === "string" && level in EXPERIENCE_LEVELS
      ? EXPERIENCE_LEVELS[level]
      : FIELD_DEFAULTS.experience;
  mark("experience", typeof level === "string" && level in EXPERIENCE_LEVELS);

  const note = answerFor(view, answers, "context-note");
  mark("context-note", typeof note === "string");

  /* Permitted fields no question binds today: defaults, marked as such. */
  const bound = new Set(Object.values(ATLAS_BINDINGS));
  for (const field of Object.keys(ATLAS_FIELDS) as AtlasFieldId[]) {
    if (ATLAS_FIELDS[field].withheld === null && !bound.has(field)) mark(field, false);
  }

  /* Withheld fields: the questions that ask for them, and why — never a value. */
  const withheld: AtlasWithheldField[] = [];
  for (const question of allQuestions(view)) {
    const field = fieldOf(question.id);
    const reason = field ? ATLAS_FIELDS[field].withheld : "unbound";
    if (reason === null) continue;
    const key = field ?? (question.id as AtlasFieldId);
    const existing = withheld.find((entry) => entry.field === key);
    if (existing) {
      withheld[withheld.indexOf(existing)] = {
        ...existing,
        questions: [...existing.questions, question.id],
      };
    } else {
      withheld.push({ field: key, questions: [question.id], reason });
    }
  }

  return {
    ...FIELD_DEFAULTS,
    areas,
    experience,
    note: typeof note === "string" ? note : FIELD_DEFAULTS.note,
    sources,
    withheld,
  };
}

/**
 * THE ANSWERS THAT MAY LEAVE THE BROWSER — those whose field has a server
 * use. Everything withheld or unbound stays on the visitor's device: it
 * reaches the result page's ledger and recap, which are built there, and
 * nothing else. The API route applies the same filter on arrival.
 */
export function transmittableAnswers(answers: AtlasAnswers): AtlasAnswers {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => isTransmitted(id)));
}

/**
 * The questionnaire as the SERVER validates it: transmitted questions only.
 * A withheld question is not in it, so the server cannot accept an answer to
 * one even if a client sends it.
 */
export function transmittedView(view: AtlasQuestionnaireView): AtlasQuestionnaireView {
  return {
    ...view,
    groups: view.groups
      .map((group) => ({
        ...group,
        questions: group.questions.filter((question) => isTransmitted(question.id)),
      }))
      .filter((group) => group.questions.length > 0),
  };
}
