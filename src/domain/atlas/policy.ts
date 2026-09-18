import type {
  AtlasConstraints,
  AtlasIntent,
  AtlasPin,
  AtlasPolicyDecision,
  AtlasProfile,
  AtlasRange,
  AtlasWeights,
} from "./types";

import { mentionsPersonalHealth } from "./screen";
import { forbiddenTermIn } from "@/content/lifecycle";

/**
 * THE ADVISOR POLICY.
 *
 * Turns the profile into everything downstream consumes: selection signals,
 * constraints, what the model may be told, and how the page is shaped.
 * Retrieval, the deterministic plan, the prompt, the validator and the result
 * page all read its output; none of them reads the profile, and none of them
 * contains a recommendation rule of its own.
 *
 * WHAT EACH FIELD MAY DO is declared in `fields.ts` (`ATLAS_FIELDS`), and this
 * file keeps to it: a field used here for selection is one that table permits
 * for discovery or filtering, and a field the table withholds is not on the
 * profile as a value at all. `check:atlas` proves both directions — permitted
 * answers change the decision, withheld ones cannot.
 *
 * THE BOUNDARY
 *
 * Product selection is driven by what the catalogue can honestly answer: the
 * catalogue area the visitor's goal corresponds to, research functions,
 * products named, experience (as catalogue complexity), and the purchasing
 * preferences — formats, size, supplies, budget, how and when they buy. Each
 * maps to registry facts: areas, function tags, overlaps, signature products,
 * documentation, presentations, prices, availability.
 *
 * Health, body, lifestyle, administration, personal-outcome detail and use
 * history are withheld (`fields.ts` says why for each) and never reach this
 * file. A free note that carries such detail is discarded whole, per request,
 * before retrieval and before any model call; the rest of the profile keeps
 * all of its influence. The visitor's name personalises the page and is never
 * sent to a model.
 *
 * Nothing in this file scores a product by what it does to a body, because
 * there is no approved claim in the registries to score and the policy will
 * not invent one.
 */

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
 * Products the policy itself requires. None today: no rule of the current
 * policy names a product. This is the seam a future rule plugs into — its pins
 * travel through retrieval, the model's constraints, the validator and the
 * result card exactly as a visitor-named product does, with its reasons.
 */
export function policyPins(profile: AtlasProfile): readonly AtlasPin[] {
  void profile;
  return [];
}

export function applyAtlasPolicy(profile: AtlasProfile): AtlasPolicyDecision {
  const breadth = BREADTH[profile.intent];
  const pinned: AtlasPin[] = [
    ...profile.products.map((slug) => ({
      slug,
      source: "visitor" as const,
      reasons: ["named-by-visitor" as const],
    })),
    ...policyPins(profile).filter((pin) => !profile.products.includes(pin.slug)),
  ];
  /* What the visitor actually said. A discarded note was said, and is not passed on. */
  const asked = (Object.keys(profile.sources) as (keyof typeof profile.sources)[]).filter(
    (field) =>
      profile.sources[field] === "answer" &&
      (field !== "context-note" || noteIsUsable(profile.note)),
  );
  const priority = (p: AtlasProfile["priorities"][number]) => profile.priorities.includes(p);

  /* ---- ranking weights -------------------------------------------------- */
  const weights: AtlasWeights = {
    topic: TOPIC_WEIGHTS[breadth],
    pinned: 8,
    function: 4,
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
    startWithinBudget: profile.budgetCap !== null,
    includePinned: true,
    coverTopics: breadth !== "focused",
    moreWithinBudgetFirst: profile.horizon === "one-order",
  };

  /* ---- the note ---------------------------------------------------------- */
  const noteProvided = profile.note.length > 0;
  const noteUsable = noteIsUsable(profile.note);
  const noteDiscarded = noteProvided && !noteUsable;

  return {
    selection: {
      topics: profile.areas,
      functions: profile.functions,
      pinned,
      forms: profile.forms,
      budgetCap: profile.budgetCap,
      variant: profile.size === "largest" ? "largest-within-budget" : "entry",
      includeSupplies: profile.includeSupplies,
      perTopicFloor: breadth === "focused" ? 1 : 2,
      weights,
    },
    constraints,
    narrative: {
      asked,
      topics: profile.areas,
      functions: profile.functions,
      intent: profile.intent,
      pinned: pinned.map((pin) => pin.slug),
      experience: profile.experience,
      history: profile.history,
      priorities: profile.priorities,
      style: profile.style,
      forms: profile.forms,
      size: profile.size,
      includeSupplies: profile.includeSupplies,
      budgetCap: profile.budgetCap,
      horizon: profile.horizon,
      timing: profile.timing,
      note: noteUsable ? profile.note : null,
    },
    presentation: {
      firstName: profile.firstName || null,
      style: profile.style,
      history: profile.history,
    },
    noteDiscarded,
  };
}
