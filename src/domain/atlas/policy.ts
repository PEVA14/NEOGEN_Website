import { forbiddenTermIn } from "@/content/lifecycle";

import { mentionsPersonalHealth } from "./screen";
import {
  ATLAS_BUDGET_CAPS,
  type AtlasConstraints,
  type AtlasField,
  type AtlasIntent,
  type AtlasLedgerEntry,
  type AtlasPolicyDecision,
  type AtlasProfile,
  type AtlasRange,
  type AtlasUse,
  type AtlasWeights,
  type AtlasWithheld,
} from "./types";

/**
 * THE ADVISOR / SELECTION POLICY.
 *
 * The one place that decides what each answer in a visitor's profile may
 * influence. Retrieval, the deterministic plan, the prompt, the validator and
 * the result page all consume `applyAtlasPolicy`'s output; none of them reads
 * the profile, and none of them contains a recommendation rule of its own.
 *
 * THE FOUR USES
 *
 *   selection     which products can appear at all, and how many
 *   ranking       the order they are weighed in
 *   explanation   what the model is told about the visitor, to explain picks
 *   presentation  how the result page is shaped and addressed
 *
 * THE BOUNDARY, KEPT HERE AND ONLY HERE
 *
 * Product selection is driven by what the catalogue can honestly answer: the
 * visitor's topics and their order, what they want to get done, products they
 * already have in mind, experience with the catalogue, priorities, formats,
 * preferred presentation size, supplies, budget, how they buy and when they
 * need it. Each maps to registry facts — areas, overlaps, signature products,
 * documentation, presentations, prices, availability.
 *
 * Two things are withheld, and each withholding is recorded in the ledger the
 * visitor sees:
 *
 *   - A note that carries health, body, medication or dosing detail is
 *     discarded whole, before retrieval and before any model call. Choosing a
 *     compound from a person's health is individual treatment selection; the
 *     policy does not make that inference and does not pass the material to a
 *     model that might. The rest of the profile keeps all of its influence.
 *   - The visitor's name personalises the page and is never sent to a model.
 *
 * Nothing in this file scores a product by what it does to a body, because
 * there is no approved claim in the registries to score and the policy will
 * not invent one.
 */

/** What each question is ALLOWED to influence. The ledger is built from this. */
export const ATLAS_POLICY: Readonly<Record<AtlasField, readonly AtlasUse[]>> = {
  topics: ["selection", "ranking", "explanation", "presentation"],
  intent: ["selection", "ranking", "explanation", "presentation"],
  inMind: ["selection", "ranking", "explanation"],
  firstName: ["presentation"],
  experience: ["selection", "ranking", "explanation"],
  history: ["explanation", "presentation"],
  priorities: ["ranking", "explanation"],
  style: ["explanation", "presentation"],
  forms: ["selection", "explanation"],
  size: ["selection", "ranking", "explanation", "presentation"],
  includeSupplies: ["selection", "explanation", "presentation"],
  budget: ["selection", "ranking", "explanation", "presentation"],
  horizon: ["selection", "explanation"],
  timing: ["ranking", "explanation"],
  note: ["selection", "explanation"],
};

/** Order of the ledger — the questionnaire's order. */
const LEDGER_ORDER: readonly AtlasField[] = [
  "topics",
  "intent",
  "inMind",
  "firstName",
  "experience",
  "history",
  "priorities",
  "style",
  "forms",
  "size",
  "includeSupplies",
  "budget",
  "horizon",
  "timing",
  "note",
];

type Breadth = "focused" | "balanced" | "spread";

const BREADTH: Readonly<Record<AtlasIntent, Breadth>> = {
  "first-order": "balanced",
  compare: "focused",
  deepen: "focused",
  "cover-topics": "spread",
  browse: "spread",
};

const TOPIC_WEIGHTS: Readonly<Record<Breadth, readonly number[]>> = {
  focused: [4, 1.5, 0.75],
  balanced: [3, 2, 1],
  spread: [3, 2.5, 2],
};

const START_SIZE: Readonly<Record<AtlasIntent, AtlasRange>> = {
  "first-order": { min: 1, max: 2 },
  compare: { min: 2, max: 3 },
  deepen: { min: 1, max: 3 },
  "cover-topics": { min: 2, max: 3 },
  browse: { min: 1, max: 2 },
};

export const ATLAS_TOTAL_RANGE: AtlasRange = { min: 3, max: 8 };

/** Should the note be read at all? Health, body, medication or dosing: no. */
export function noteIsUsable(note: string): boolean {
  return note.length > 0 && !mentionsPersonalHealth(note) && forbiddenTermIn(note) === null;
}

export function applyAtlasPolicy(profile: AtlasProfile): AtlasPolicyDecision {
  const breadth = BREADTH[profile.intent];
  const priority = (p: AtlasProfile["priorities"][number]) => profile.priorities.includes(p);

  /* ---- ranking weights -------------------------------------------------- */
  const weights: AtlasWeights = {
    topic: TOPIC_WEIGHTS[breadth],
    inMind: 8,
    overlap: priority("overlap") ? 3 : profile.experience === "experienced" ? 1.5 : 1,
    signature: priority("signature") ? 3 : profile.experience === "new" ? 1.5 : 0.5,
    documented: priority("documentation") ? 3 : 0.5,
    referenced: priority("documentation") ? 1.5 : 0,
    value: priority("price") ? 2.5 : profile.intent === "first-order" ? 1 : 0,
    overBudget: priority("price") ? -5 : -4,
    // A first catalogue visit starts with single-component products: fewer
    // things to compare on one page. A catalogue-complexity rule, not a
    // judgement about any use.
    blend: profile.experience === "new" ? -1.5 : 0,
    range: profile.size === "largest" ? 1 : profile.experience === "experienced" ? 0.5 : 0,
    unavailable: profile.timing === "soon" ? -5 : -1,
  };

  /* ---- how many, and under which rules ----------------------------------- */
  const startBase = START_SIZE[profile.intent];
  const start: AtlasRange = {
    min: startBase.min,
    max: profile.experience === "new" ? Math.min(startBase.max, 2) : startBase.max,
  };
  const more: AtlasRange =
    profile.horizon === "over-time" || profile.intent === "browse"
      ? { min: 1, max: 5 }
      : { min: 1, max: 3 };

  const constraints: AtlasConstraints = {
    start,
    more,
    total: ATLAS_TOTAL_RANGE,
    startWithinBudget: ATLAS_BUDGET_CAPS[profile.budget] !== null,
    includeInMind: true,
    coverTopics: breadth !== "focused",
    moreWithinBudgetFirst: profile.horizon === "one-order",
  };

  /* ---- the note ---------------------------------------------------------- */
  const noteProvided = profile.note.length > 0;
  const noteUsable = noteIsUsable(profile.note);
  const noteDiscarded = noteProvided && !noteUsable;

  /* ---- the ledger -------------------------------------------------------- */
  const answered: Readonly<Record<AtlasField, boolean>> = {
    topics: true,
    intent: true,
    inMind: profile.inMind.length > 0,
    firstName: profile.firstName.length > 0,
    experience: true,
    history: true,
    priorities: profile.priorities.length > 0,
    style: true,
    forms: profile.forms.length > 0,
    size: true,
    includeSupplies: true,
    budget: true,
    horizon: true,
    timing: true,
    note: noteProvided,
  };
  const withheld: Partial<Record<AtlasField, AtlasWithheld>> = {
    ...(profile.firstName ? { firstName: "name-private" as const } : {}),
    ...(noteDiscarded ? { note: "health-note" as const } : {}),
  };
  const ledger: AtlasLedgerEntry[] = LEDGER_ORDER.map((field) => ({
    field,
    answered: answered[field],
    value: field === "note" ? null : profile[field],
    uses: answered[field] && withheld[field] !== "health-note" ? ATLAS_POLICY[field] : [],
    withheld: withheld[field] ?? null,
  }));

  return {
    selection: {
      topics: profile.topics,
      inMind: profile.inMind,
      forms: profile.forms,
      budgetCap: ATLAS_BUDGET_CAPS[profile.budget],
      variant: profile.size === "largest" ? "largest-within-budget" : "entry",
      includeSupplies: profile.includeSupplies,
      perTopicFloor: breadth === "focused" ? 1 : 2,
      weights,
    },
    constraints,
    narrative: {
      topics: profile.topics,
      intent: profile.intent,
      inMind: profile.inMind,
      experience: profile.experience,
      history: profile.history,
      priorities: profile.priorities,
      style: profile.style,
      forms: profile.forms,
      size: profile.size,
      includeSupplies: profile.includeSupplies,
      budget: profile.budget,
      horizon: profile.horizon,
      timing: profile.timing,
      note: noteUsable ? profile.note : null,
    },
    presentation: {
      firstName: profile.firstName || null,
      style: profile.style,
      history: profile.history,
    },
    ledger,
    noteDiscarded,
  };
}
