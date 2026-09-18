/**
 * THE PROFILE'S FIELDS — what every answer IS. Not what may be done with it.
 *
 * Atlas keeps its concerns apart, each in its own file:
 *
 *   1. collection      content/atlas/questionnaire.ts   what is ASKED (owner content)
 *   2. representation  THIS FILE + profile.ts           what each answer is, typed
 *   3. transmission    privacy.ts                       what may leave the browser
 *   4–7. permissions   policy.ts + policies/*           what one advisor may use a
 *                                                       field for: candidate
 *                                                       selection, retrieval, AI
 *                                                       context, recap
 *
 * This file answers only (2). Every field declares its value KIND (so the
 * profile is typed), its CATEGORY (what the answer is about) and its
 * SENSITIVITY (how carefully it must be handled). It grants no permission: a
 * field existing here says nothing about whether any advisor may read it.
 *
 * SENSITIVITY is explicit so handling is auditable, never implicit:
 *
 *   standard   purchasing preferences — budget, formats, timing
 *   personal   about the person but not sensitive — experience, age band, name
 *   sensitive  datos personales sensibles or close to them — health, body,
 *              medication, sexual health, use history, and goals that reveal
 *              them. `privacy.ts` refuses to transmit one without a written basis.
 *
 * `ATLAS_BINDINGS` is the only map from question ids. A question it does not
 * bind is still represented — in `AtlasProfile.unbound`, as `unclassified`
 * and sensitive until someone classifies it.
 */

export type AtlasFieldKind = "enum" | "enum-list" | "number" | "boolean" | "text";

export type AtlasFieldCategory =
  | "goal"
  | "outcome"
  | "experience"
  | "use-history"
  | "body"
  | "health"
  | "administration"
  | "lifestyle"
  | "context"
  | "commerce"
  | "identity"
  | "unclassified";

export type AtlasSensitivity = "standard" | "personal" | "sensitive";

export interface AtlasFieldSpec {
  kind: AtlasFieldKind;
  category: AtlasFieldCategory;
  sensitivity: AtlasSensitivity;
  /** Free text screened for health detail before any server-side use. */
  screened?: true;
  /** For numbers: the unit the value is normalised to. */
  unit?: "kg" | "cm" | "MXN";
}

type Spec<K extends AtlasFieldKind> = AtlasFieldSpec & { kind: K };

function f<K extends AtlasFieldKind>(
  kind: K,
  category: AtlasFieldCategory,
  sensitivity: AtlasSensitivity,
  extra: Partial<Pick<AtlasFieldSpec, "screened" | "unit">> = {},
): Spec<K> {
  return { kind, category, sensitivity, ...extra };
}

export const ATLAS_FIELDS = {
  /* ---- asked by questionnaire v4 ---- */
  /* A goal can reveal health or sexual health: sensitive. */
  goal: f("enum", "goal", "sensitive"),
  "goal-focus": f("enum", "outcome", "sensitive"),
  experience: f("enum", "experience", "personal"),
  "compounds-used": f("text", "use-history", "sensitive"),
  "age-band": f("enum", "body", "personal"),
  sex: f("enum", "body", "personal"),
  "weight-kg": f("number", "body", "sensitive", { unit: "kg" }),
  "height-cm": f("number", "body", "sensitive", { unit: "cm" }),
  activity: f("enum", "body", "sensitive"),
  "sleep-quality": f("enum", "body", "sensitive"),
  stress: f("enum", "body", "sensitive"),
  "administration-route": f("enum", "administration", "sensitive"),
  "protocol-duration": f("enum", "administration", "sensitive"),
  "injection-tolerance": f("enum", "administration", "sensitive"),
  conditions: f("enum-list", "health", "sensitive"),
  medications: f("enum-list", "health", "sensitive"),
  "medications-other": f("text", "health", "sensitive"),
  injuries: f("text", "health", "sensitive"),
  "context-note": f("text", "context", "personal", { screened: true }),
  frustrations: f("text", "outcome", "sensitive"),
  "outcome-goal": f("text", "outcome", "sensitive"),
  "outcome-priority": f("enum", "outcome", "personal"),
  training: f("enum", "lifestyle", "personal"),
  schedule: f("enum", "lifestyle", "personal"),
  work: f("enum", "lifestyle", "personal"),
  alcohol: f("enum", "lifestyle", "sensitive"),
  caffeine: f("enum", "lifestyle", "sensitive"),

  /* ---- representable, not asked by v4 (they run on defaults) ---- */
  "research-functions": f("enum-list", "commerce", "standard"),
  products: f("enum-list", "commerce", "standard"),
  intent: f("enum", "commerce", "standard"),
  history: f("enum", "commerce", "standard"),
  priorities: f("enum-list", "commerce", "standard"),
  style: f("enum", "commerce", "standard"),
  forms: f("enum-list", "commerce", "standard"),
  size: f("enum", "commerce", "standard"),
  supplies: f("boolean", "commerce", "standard"),
  budget: f("number", "commerce", "standard", { unit: "MXN" }),
  horizon: f("enum", "commerce", "standard"),
  timing: f("enum", "commerce", "standard"),
  name: f("text", "identity", "personal"),
};

export type AtlasFieldId = keyof typeof ATLAS_FIELDS;
export const ATLAS_FIELD_IDS = Object.keys(ATLAS_FIELDS) as AtlasFieldId[];

/** A field's value type, derived from its declared kind. */
interface KindValue {
  enum: string;
  "enum-list": readonly string[];
  number: number;
  boolean: boolean;
  text: string;
}
export type AtlasFieldValue<K extends AtlasFieldId> = KindValue[(typeof ATLAS_FIELDS)[K]["kind"]];

/**
 * WHICH QUESTION FILLS WHICH FIELD. Several questions may fill one field when
 * at most one of them is visible at a time — the ten goal follow-ups all fill
 * `goal-focus`.
 */
export const ATLAS_BINDINGS: Readonly<Record<string, AtlasFieldId>> = {
  goal: "goal",
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
  age: "age-band",
  "biological-sex": "sex",
  "weight-kg": "weight-kg",
  "height-cm": "height-cm",
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

/** The field a question fills, or null when unbound. */
export function fieldOf(questionId: string): AtlasFieldId | null {
  return ATLAS_BINDINGS[questionId] ?? null;
}

/** How an unbound question is treated until classified: the most careful way. */
export const UNCLASSIFIED: AtlasFieldSpec = {
  kind: "text",
  category: "unclassified",
  sensitivity: "sensitive",
};

/** The spec for a question's answer; an unbound question is unclassified and sensitive. */
export function fieldSpecOf(questionId: string): AtlasFieldSpec {
  const field = fieldOf(questionId);
  return field ? ATLAS_FIELDS[field] : UNCLASSIFIED;
}
