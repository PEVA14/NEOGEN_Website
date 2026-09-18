import { contextEntry } from "../policy";
import { mentionsPersonalHealth } from "../screen";
import {
  ATLAS_TOPIC_RANKS,
  atlasForms,
  atlasHistories,
  atlasHorizons,
  atlasIntents,
  atlasPriorities,
  atlasSizes,
  atlasStyles,
  atlasTimings,
} from "../types";
import { RESEARCH_FUNCTION_IDS, type ResearchFunctionId } from "@/content/functions";
import { forbiddenTermIn } from "@/content/lifecycle";

import type { AtlasFieldId, AtlasFieldValue } from "../fields";
import type { AtlasAdvisorPolicy, AtlasPermission, AtlasProjection } from "../policy";
import type {
  AtlasConstraints,
  AtlasContextEntry,
  AtlasExperienceLevel,
  AtlasIntent,
  AtlasPin,
  AtlasRange,
  AtlasWeights,
} from "../types";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THE RESTRICTED CATALOGUE POLICY — the advisor Atlas runs today.
 *
 * One implementation of `AtlasAdvisorPolicy`. It selects from what the
 * catalogue can honestly answer: the catalogue AREA a goal corresponds to,
 * experience as catalogue complexity, and purchasing preferences. It does not
 * select, rank or explain a compound from a person's health, body, medication,
 * administration preferences, habits, use history or a specific personal
 * outcome — those fields exist in the profile, complete, and this policy is
 * granted no permission over them.
 *
 * Selection and AI context are granted separately. The goal selects (as its
 * area) but is NOT in the model's context: the model is told the catalogue
 * areas of the selection, never the goal. Experience does both. The note
 * reaches the model only, and only after the health screen.
 *
 * No medical rule lives here, and none may be added to this policy. A
 * different advisor is a different policy object.
 */

const P = {
  select: "candidate-selection",
  retrieve: "retrieval",
  context: "ai-context",
  recap: "recap",
  present: "presentation",
} as const satisfies Record<string, AtlasPermission>;

const none: readonly AtlasPermission[] = [];

export const RESTRICTED_PERMISSIONS: Readonly<Record<AtlasFieldId, readonly AtlasPermission[]>> = {
  goal: [P.select, P.recap],
  "goal-focus": [P.recap],
  experience: [P.select, P.context],
  "context-note": [P.context],

  "compounds-used": none,
  "age-band": none,
  sex: none,
  "weight-kg": none,
  "height-cm": none,
  activity: none,
  "sleep-quality": none,
  stress: none,
  "administration-route": none,
  "protocol-duration": none,
  "injection-tolerance": none,
  conditions: none,
  medications: none,
  "medications-other": none,
  injuries: none,
  frustrations: none,
  "outcome-goal": none,
  "outcome-priority": none,
  training: none,
  schedule: none,
  work: none,
  alcohol: none,
  caffeine: none,

  "research-functions": [P.select, P.retrieve, P.context, P.recap],
  products: [P.select, P.context, P.recap],
  intent: [P.select, P.context, P.recap],
  history: [P.context, P.present],
  priorities: [P.select, P.context],
  style: [P.context, P.present],
  forms: [P.select, P.context],
  size: [P.select, P.context],
  supplies: [P.select, P.context],
  budget: [P.select, P.context, P.recap],
  horizon: [P.select, P.context],
  timing: [P.select, P.context],
  name: [P.present],
};

/**
 * The goal → the catalogue section it corresponds to: the same area page the
 * menu opens. Coarse on purpose. A goal with no single section maps to none,
 * and this policy then considers the catalogue as a whole.
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

/**
 * Products this policy itself requires. None: no rule of this policy names a
 * product. The seam is shown so a future policy's pins are recognisable —
 * they travel through retrieval, the model's constraints, the validator and
 * the result card exactly as a visitor-named product does.
 */
export function policyPins(): readonly AtlasPin[] {
  return [];
}

/* ---- reading a projection -------------------------------------------------- */

/** An answered value from a projection, or null when not granted or not answered. */
function read<K extends AtlasFieldId>(p: AtlasProjection, field: K): AtlasFieldValue<K> | null {
  const entry = p.fields[field];
  return entry && entry.source === "answer" ? (entry.value as AtlasFieldValue<K>) : null;
}
function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
function someOf<T extends string>(value: readonly string[] | null, allowed: readonly T[]): T[] {
  return (value ?? []).filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** What this policy's rules read, from ONE projection. Defaults where it has nothing. */
function signalsFrom(p: AtlasProjection) {
  const goal = read(p, "goal");
  const level = read(p, "experience");
  return {
    areas: goal !== null && goal in GOAL_AREAS ? GOAL_AREAS[goal].slice(0, ATLAS_TOPIC_RANKS) : [],
    experience: level !== null && level in EXPERIENCE_LEVELS ? EXPERIENCE_LEVELS[level] : "some",
    functions: someOf(read(p, "research-functions"), RESEARCH_FUNCTION_IDS) as ResearchFunctionId[],
    products: [...(read(p, "products") ?? [])],
    intent: oneOf(read(p, "intent"), atlasIntents, "first-order"),
    history: oneOf(read(p, "history"), atlasHistories, "first-time"),
    priorities: someOf(read(p, "priorities"), atlasPriorities),
    style: oneOf(read(p, "style"), atlasStyles, "direct"),
    forms: someOf(read(p, "forms"), atlasForms),
    size: oneOf(read(p, "size"), atlasSizes, "no-preference"),
    includeSupplies: read(p, "supplies") ?? false,
    budgetCap: read(p, "budget"),
    horizon: oneOf(read(p, "horizon"), atlasHorizons, "one-order"),
    timing: oneOf(read(p, "timing"), atlasTimings, "no-rush"),
  };
}

/* ---- the policy -------------------------------------------------------------- */

export const RESTRICTED_POLICY: AtlasAdvisorPolicy = {
  id: "restricted-catalogue",
  version: "1",
  description:
    "Selects from catalogue facts only: the goal's catalogue area, experience as catalogue complexity, and purchasing preferences. Health, body, administration, lifestyle, use history and personal outcomes are not used.",
  permissions: RESTRICTED_PERMISSIONS,

  decide({ selection, retrieval, context, presentation }) {
    const s = signalsFrom(selection);
    const c = signalsFrom(context);
    const breadth = BREADTH[s.intent];

    const pinned: AtlasPin[] = [
      ...s.products.map((slug) => ({
        slug,
        source: "visitor" as const,
        reasons: ["named-by-visitor" as const],
      })),
      ...policyPins().filter((pin) => !s.products.includes(pin.slug)),
    ];
    const priority = (p: (typeof s.priorities)[number]) => s.priorities.includes(p);

    const weights: AtlasWeights = {
      topic: TOPIC_WEIGHTS[breadth],
      pinned: 8,
      function: 4,
      overlap: priority("overlap") ? 3 : s.experience === "experienced" ? 1.5 : 1,
      signature: priority("signature") ? 3 : s.experience === "new" ? 1.5 : 0.5,
      documented: priority("documentation") ? 3 : 0.5,
      referenced: priority("documentation") ? 1.5 : 0,
      value: priority("price") ? 2.5 : s.intent === "first-order" ? 1 : 0,
      overBudget: priority("price") ? -5 : -4,
      // A first catalogue visit starts with single-component products: fewer
      // things to compare on one page. A catalogue-complexity rule, not a
      // judgement about any use.
      blend: s.experience === "new" ? -1.5 : 0,
      range: s.size === "largest" ? 1 : s.experience === "experienced" ? 0.5 : 0,
      unavailable: s.timing === "soon" ? -5 : -1,
    };

    const startBase = START_SIZE[s.intent];
    const constraints: AtlasConstraints = {
      start: {
        min: startBase.min,
        max: s.experience === "new" ? Math.min(startBase.max, 2) : startBase.max,
      },
      more:
        s.horizon === "over-time" || s.intent === "browse"
          ? { min: 1, max: 5 }
          : { min: 1, max: 3 },
      total: ATLAS_TOTAL_RANGE,
      startWithinBudget: s.budgetCap !== null,
      includePinned: true,
      coverTopics: breadth !== "focused",
      moreWithinBudgetFirst: s.horizon === "one-order",
    };

    /* ---- the AI context: the ai-context projection, screened ---------------- */
    const note = read(context, "context-note") ?? "";
    const noteUsable = noteIsUsable(note);
    const entries: AtlasContextEntry[] = [];
    for (const [field, entry] of Object.entries(context.fields) as [
      AtlasFieldId,
      NonNullable<AtlasProjection["fields"][AtlasFieldId]>,
    ][]) {
      if (entry.source !== "answer" || entry.value === null) continue;
      if (field === "context-note" && !noteUsable) continue;
      entries.push(contextEntry(field, entry.value));
    }
    const asked = entries.map((entry) => entry.field);

    return {
      selection: {
        topics: s.areas,
        functions: s.functions,
        evidenceFocus: signalsFrom(retrieval).functions,
        pinned,
        forms: s.forms,
        budgetCap: s.budgetCap,
        variant: s.size === "largest" ? "largest-within-budget" : "entry",
        includeSupplies: s.includeSupplies,
        perTopicFloor: breadth === "focused" ? 1 : 2,
        weights,
      },
      constraints,
      narrative: {
        asked,
        /* The areas the SELECTION used — a fact about the candidates. */
        topics: s.areas,
        functions: c.functions,
        intent: c.intent,
        pinned: pinned.map((pin) => pin.slug),
        experience: c.experience,
        history: c.history,
        priorities: c.priorities,
        style: c.style,
        forms: c.forms,
        size: c.size,
        includeSupplies: c.includeSupplies,
        budgetCap: c.budgetCap,
        horizon: c.horizon,
        timing: c.timing,
      },
      presentation: {
        firstName: read(presentation, "name") || null,
        style: signalsFrom(presentation).style,
        history: signalsFrom(presentation).history,
      },
      context: entries,
      noteDiscarded: note.length > 0 && !noteUsable,
    };
  },
};
