import type { AtlasExperienceLevel } from "./types";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * WHAT EVERY ANSWER MEANS, AND WHAT IT IS ALLOWED TO DO — in one place.
 *
 * The questionnaire (`content/atlas/questionnaire.ts`) is owner content: it
 * says what is ASKED. This file is the system's half of the contract, and the
 * only file that names question ids:
 *
 *   ATLAS_FIELDS       every field of the profile, with the uses it permits
 *                      or the reason it is withheld
 *   ATLAS_BINDINGS     which question fills which field
 *   GOAL_AREAS,        how an option id becomes a catalogue fact the rest of
 *   EXPERIENCE_LEVELS  the pipeline speaks (an area id, a level)
 *
 * Nothing downstream reads a question id. The profile (`profile.ts`) is built
 * from these tables; the policy reads the profile; the ledger reads the same
 * tables to tell the visitor what happened to each answer.
 *
 * THE USES
 *
 *   discovery         which products become candidates, and in what order
 *   research-context  which approved statements and references are retrieved
 *                     and put forward for those products
 *   personalization   what the model (or the composer) is told about the
 *                     visitor, to explain the selection in their terms
 *   filtering         preferences that narrow or size the selection: formats,
 *                     budget, how many to start with
 *   recap             shown back to the visitor on the result page
 *   presentation      shapes the page itself, and nothing else
 *
 * THE BOUNDARY. A WITHHELD field reaches no decision path: not discovery, not
 * research context, not the model, not filtering. It may at most be shown back
 * to the visitor who gave it (`recap`). And because nothing on the server may
 * use it, it is never sent: `transmittableAnswers` drops it in the browser and
 * the API route drops it again on arrival. The profile represents it by name
 * and reason only — its type has no slot for a value.
 *
 * Why each class is withheld:
 *
 *   health, body,     Choosing a compound from a person's conditions,
 *   lifestyle         medication, measurements or habits is individual
 *                     treatment selection. Atlas does not make that inference
 *                     and does not hand the material to a model that might.
 *                     It is also sensitive personal data (datos personales
 *                     sensibles), which has no business leaving the browser
 *                     for a use that is not permitted.
 *   administration    Route, duration and injection tolerance exist only to
 *                     shape a protocol. NEOGEN publishes none.
 *   personal-outcome  A specific personal outcome ("satiety", "erectile
 *                     function", "lose 8 kg") matched to a specific compound
 *                     is exactly the claim the catalogue has no approved
 *                     source for. The GOAL is used — as the catalogue area it
 *                     corresponds to, the same section the menu opens — but
 *                     its finer detail is not.
 *   use-history       Compounds a visitor has used on themselves.
 *   unbound           A question this file does not bind. Fail closed: a new
 *                     question is inert until it is classified here, and
 *                     `check:atlas` fails until it is.
 */

export type AtlasUse =
  "discovery" | "research-context" | "personalization" | "filtering" | "recap" | "presentation";

export const ATLAS_USES: readonly AtlasUse[] = [
  "discovery",
  "research-context",
  "personalization",
  "filtering",
  "recap",
  "presentation",
];

/** The uses that happen on the server. A field with none is never sent. */
export const SERVER_USES: readonly AtlasUse[] = [
  "discovery",
  "research-context",
  "personalization",
  "filtering",
  "presentation",
];

/** The uses a withheld field may never have. */
export const DECISION_USES: readonly AtlasUse[] = [
  "discovery",
  "research-context",
  "personalization",
  "filtering",
];

export type AtlasWithheld =
  | "health"
  | "body"
  | "lifestyle"
  | "administration"
  | "personal-outcome"
  | "use-history"
  | "unbound"
  /* Decided per request, not per field: */
  /** The note carried health, body, medication or dosing detail and was discarded whole. */
  | "health-note"
  /** The name personalises the page and is never sent to the model. */
  | "name-private";

export type AtlasFieldId =
  /* bound to a question today */
  | "goal-area"
  | "experience"
  | "context-note"
  /* withheld, bound to a question today */
  | "goal-focus"
  | "compounds-used"
  | "age"
  | "sex"
  | "weight"
  | "height"
  | "activity"
  | "sleep-quality"
  | "stress"
  | "administration-route"
  | "protocol-duration"
  | "conditions"
  | "medications"
  | "medications-other"
  | "frustrations"
  | "outcome-goal"
  | "training"
  | "injection-tolerance"
  | "schedule"
  | "work"
  | "alcohol"
  | "caffeine"
  | "outcome-priority"
  | "injuries"
  /* permitted, but no question asks for them today — they run on defaults */
  | "research-functions"
  | "products"
  | "intent"
  | "history"
  | "priorities"
  | "style"
  | "forms"
  | "size"
  | "supplies"
  | "budget"
  | "horizon"
  | "timing"
  | "name";

export interface AtlasFieldSpec {
  /** What the field may influence. For a withheld field: at most `recap`. */
  uses: readonly AtlasUse[];
  /** Null when the field is used; otherwise why it is kept out of every decision. */
  withheld: AtlasWithheld | null;
}

const used = (...uses: AtlasUse[]): AtlasFieldSpec => ({ uses, withheld: null });
const withheld = (reason: AtlasWithheld, ...uses: "recap"[]): AtlasFieldSpec => ({
  uses,
  withheld: reason,
});

export const ATLAS_FIELDS: Readonly<Record<AtlasFieldId, AtlasFieldSpec>> = {
  /* The goal, as the catalogue area it corresponds to. The model is told the
     AREA id, never the goal's wording. */
  "goal-area": used("discovery", "personalization", "recap"),
  /* Catalogue complexity only: how many products to start with, and whether
     single-compound products come first. Not suitability. */
  experience: used("filtering", "discovery", "personalization"),
  /* Screened per request: discarded whole when it carries health detail. */
  "context-note": used("personalization"),

  "goal-focus": withheld("personal-outcome", "recap"),
  "compounds-used": withheld("use-history"),
  age: withheld("body"),
  sex: withheld("body"),
  weight: withheld("body"),
  height: withheld("body"),
  activity: withheld("body"),
  "sleep-quality": withheld("body"),
  stress: withheld("body"),
  "administration-route": withheld("administration"),
  "protocol-duration": withheld("administration"),
  conditions: withheld("health"),
  medications: withheld("health"),
  "medications-other": withheld("health"),
  frustrations: withheld("personal-outcome"),
  "outcome-goal": withheld("personal-outcome"),
  training: withheld("lifestyle"),
  "injection-tolerance": withheld("administration"),
  schedule: withheld("lifestyle"),
  work: withheld("lifestyle"),
  alcohol: withheld("lifestyle"),
  caffeine: withheld("lifestyle"),
  "outcome-priority": withheld("personal-outcome"),
  injuries: withheld("health"),

  "research-functions": used("discovery", "research-context", "personalization", "recap"),
  products: used("discovery", "personalization", "recap"),
  intent: used("discovery", "filtering", "personalization", "recap"),
  history: used("personalization", "presentation"),
  priorities: used("discovery", "research-context", "personalization"),
  style: used("personalization", "presentation"),
  forms: used("filtering", "personalization"),
  size: used("filtering", "personalization"),
  supplies: used("filtering", "personalization"),
  budget: used("filtering", "discovery", "personalization", "recap"),
  horizon: used("filtering", "personalization"),
  timing: used("discovery", "personalization"),
  name: { uses: ["presentation"], withheld: null },
};

/**
 * WHICH QUESTION FILLS WHICH FIELD. The only map from question ids.
 *
 * Several questions may fill one field when at most one of them is visible at
 * a time — the ten goal follow-ups all fill `goal-focus`. A question id absent
 * here is `unbound`: withheld, never sent.
 */
export const ATLAS_BINDINGS: Readonly<Record<string, AtlasFieldId>> = {
  goal: "goal-area",
  "goal-weight-loss": "goal-focus",
  "goal-body-composition": "goal-focus",
  "goal-longevity": "goal-focus",
  "goal-tissue-recovery": "goal-focus",
  "goal-sleep": "goal-focus",
  "goal-cognition": "goal-focus",
  "goal-skin-hair": "goal-focus",
  "goal-sexual-health": "goal-focus",
  "goal-daily-wellbeing": "goal-focus",
  "goal-immunity": "goal-focus",
  age: "age",
  "biological-sex": "sex",
  "weight-kg": "weight",
  "height-cm": "height",
  "physical-activity": "activity",
  "sleep-quality": "sleep-quality",
  stress: "stress",
  "peptide-experience": "experience",
  "previous-compounds": "compounds-used",
  "administration-route": "administration-route",
  "protocol-duration": "protocol-duration",
  "health-conditions": "conditions",
  medications: "medications",
  "other-medications": "medications-other",
  "additional-notes": "context-note",
  "current-frustrations": "frustrations",
  "ninety-day-goal": "outcome-goal",
  "training-type": "training",
  "injection-tolerance": "injection-tolerance",
  "daily-schedule": "schedule",
  "work-type": "work",
  alcohol: "alcohol",
  caffeine: "caffeine",
  "main-priority": "outcome-priority",
  injuries: "injuries",
};

/**
 * The goal → the catalogue section it corresponds to: the same area page the
 * menu opens. Coarse on purpose — a section of the catalogue, not a compound
 * matched to an outcome. A goal with no corresponding section maps to none,
 * and Atlas falls back to the catalogue as a whole.
 */
export const GOAL_AREAS: Readonly<Record<string, readonly DiscoveryAreaId[]>> = {
  "weight-loss": ["metabolic"],
  "body-composition": ["growth"],
  longevity: ["longevity"],
  "tissue-recovery": ["recovery"],
  sleep: ["neuro"],
  cognition: ["neuro"],
  "skin-hair": ["skin"],
  "sexual-health": ["hormonal"],
  "daily-wellbeing": [],
  immunity: ["recovery"],
};

export const EXPERIENCE_LEVELS: Readonly<Record<string, AtlasExperienceLevel>> = {
  none: "new",
  beginner: "some",
  intermediate: "some",
  advanced: "experienced",
};

/* ---- lookups -------------------------------------------------------------- */

const UNBOUND: AtlasFieldSpec = { uses: [], withheld: "unbound" };

/** The field a question fills, or null when unbound. */
export function fieldOf(questionId: string): AtlasFieldId | null {
  return ATLAS_BINDINGS[questionId] ?? null;
}

/** The spec governing a question's answer. Unbound questions are withheld. */
export function specOf(questionId: string): AtlasFieldSpec {
  const field = fieldOf(questionId);
  return field ? ATLAS_FIELDS[field] : UNBOUND;
}

/** May this question's answer leave the browser? Only when a server use is permitted. */
export function isTransmitted(questionId: string): boolean {
  const spec = specOf(questionId);
  return spec.withheld === null && spec.uses.some((use) => SERVER_USES.includes(use));
}
