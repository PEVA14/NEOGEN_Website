import type { Availability } from "@/data/commerce";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * NEOGEN ATLAS — the shapes a personal selection is built from.
 *
 *   Questionnaire → AtlasProfile → POLICY → signals → retrieval → generation
 *                 → validation → AtlasResultView → UI
 *
 * The PROFILE is everything the visitor told Atlas, parsed and nothing more.
 * The POLICY (`policy.ts`) is the only code that decides what each answer is
 * allowed to influence. Everything downstream consumes the policy's outputs —
 * selection signals, constraints, narrative signals, presentation signals and
 * a ledger — and never reads the profile directly. Changing what an answer
 * may do is an edit to the policy and nowhere else.
 */

export const ATLAS_MAX_TOPICS = 3;
export const ATLAS_MAX_PRIORITIES = 2;
export const ATLAS_MAX_IN_MIND = 3;
export const ATLAS_NOTE_MAX = 400;
export const ATLAS_NAME_MAX = 40;

/* ---- The questionnaire's closed vocabularies ------------------------------ */

/** What the visitor wants to get done with NEOGEN today. */
export type AtlasIntent = "first-order" | "compare" | "deepen" | "cover-topics" | "browse";
export const atlasIntents: readonly AtlasIntent[] = [
  "first-order",
  "compare",
  "deepen",
  "cover-topics",
  "browse",
];

/** Experience with this kind of product, as the visitor describes it. */
export type AtlasExperienceLevel = "new" | "some" | "experienced";
export const atlasExperienceLevels: readonly AtlasExperienceLevel[] = [
  "new",
  "some",
  "experienced",
];

export type AtlasHistory = "first-time" | "returning";
export const atlasHistories: readonly AtlasHistory[] = ["first-time", "returning"];

/** What matters most in this selection. */
export type AtlasPriority = "documentation" | "price" | "signature" | "overlap";
export const atlasPriorities: readonly AtlasPriority[] = [
  "documentation",
  "price",
  "signature",
  "overlap",
];

/** How the visitor wants the result explained. */
export type AtlasStyle = "direct" | "detailed";
export const atlasStyles: readonly AtlasStyle[] = ["direct", "detailed"];

/** The presentation forms, exactly as `Strength` distinguishes them. */
export type AtlasForm = "solid" | "solution" | "volume" | "iu" | "blend";
export const atlasForms: readonly AtlasForm[] = ["solid", "solution", "volume", "iu", "blend"];

/** Which presentation of a product to put forward. A purchasing preference. */
export type AtlasSize = "smallest" | "largest" | "no-preference";
export const atlasSizes: readonly AtlasSize[] = ["smallest", "largest", "no-preference"];

export type AtlasHorizon = "one-order" | "over-time";
export const atlasHorizons: readonly AtlasHorizon[] = ["one-order", "over-time"];

export type AtlasTiming = "soon" | "no-rush";
export const atlasTimings: readonly AtlasTiming[] = ["soon", "no-rush"];

/** Budget tiers in MXN, applied to REAL registry prices. */
export type AtlasBudget = "open" | "8k" | "20k" | "40k";
export const atlasBudgets: readonly AtlasBudget[] = ["open", "8k", "20k", "40k"];
export const ATLAS_BUDGET_CAPS: Readonly<Record<AtlasBudget, number | null>> = {
  open: null,
  "8k": 8000,
  "20k": 20000,
  "40k": 40000,
};

/* ---- The profile ---------------------------------------------------------- */

export interface AtlasProfile {
  /* Goals */
  /** One to three topics (discovery areas), RANKED: index 0 leads. */
  topics: readonly DiscoveryAreaId[];
  intent: AtlasIntent;
  /** Published product slugs the visitor already has in mind. */
  inMind: readonly string[];
  /* About you */
  firstName: string;
  experience: AtlasExperienceLevel;
  history: AtlasHistory;
  priorities: readonly AtlasPriority[];
  style: AtlasStyle;
  /* Preferences */
  /** Empty means any form. */
  forms: readonly AtlasForm[];
  size: AtlasSize;
  includeSupplies: boolean;
  /* Budget and context */
  budget: AtlasBudget;
  horizon: AtlasHorizon;
  timing: AtlasTiming;
  /** Free text, normalised but NOT yet judged — the policy decides its use. */
  note: string;
}

/** Every question, by name — the ledger's keys. */
export type AtlasField = keyof AtlasProfile;

/* ---- What the policy hands downstream ------------------------------------- */

/** The four things an answer can be allowed to affect. */
export type AtlasUse = "selection" | "ranking" | "explanation" | "presentation";

/** Why an answer, or part of one, was kept away from a use. */
export type AtlasWithheld =
  /** The note carried health, body or medication detail and was discarded whole. */
  | "health-note"
  /** The name personalises the page and is never sent to the model. */
  | "name-private";

export interface AtlasLedgerEntry {
  field: AtlasField;
  /** False when the visitor skipped an optional question. */
  answered: boolean;
  /**
   * The answer, for the page to echo back. The note's text is never echoed —
   * only whether one was given.
   */
  value: string | readonly string[] | boolean | null;
  uses: readonly AtlasUse[];
  withheld: AtlasWithheld | null;
}

export interface AtlasWeights {
  /** Per topic rank. Length ≥ ATLAS_MAX_TOPICS. */
  topic: readonly number[];
  inMind: number;
  /** Filed under more than one of the visitor's topics. */
  overlap: number;
  /** One of the three signature products with their own environment. */
  signature: number;
  documented: number;
  referenced: number;
  /** Entry price at or below the pool's median. */
  value: number;
  /** Suggested presentation above the cap. Negative. */
  overBudget: number;
  /** Multi-component products. Negative for newcomers, zero otherwise. */
  blend: number;
  /** Per extra presentation beyond the first, up to two. */
  range: number;
  /** Suggested presentation marked unavailable. Negative. */
  unavailable: number;
}

export interface AtlasSelectionSignals {
  topics: readonly DiscoveryAreaId[];
  inMind: readonly string[];
  forms: readonly AtlasForm[];
  budgetCap: number | null;
  /** Which presentation to put forward for each product. */
  variant: "entry" | "largest-within-budget";
  includeSupplies: boolean;
  /** Each topic keeps at least this many candidates, when it has them. */
  perTopicFloor: number;
  weights: AtlasWeights;
}

export interface AtlasRange {
  min: number;
  max: number;
}

/** Rules the written result must meet. The validator enforces every one. */
export interface AtlasConstraints {
  start: AtlasRange;
  more: AtlasRange;
  total: AtlasRange;
  /** Together, the "start here" presentations stay inside the cap when that is possible. */
  startWithinBudget: boolean;
  /** Every in-mind product that was retrieved must appear in the result. */
  includeInMind: boolean;
  /** Every chosen topic with a candidate appears in the result. */
  coverTopics: boolean;
  /** One-order visitors see within-budget additions before the rest. */
  moreWithinBudgetFirst: boolean;
}

/** What the model may know about the visitor. Nothing else is sent. */
export interface AtlasNarrativeSignals {
  topics: readonly DiscoveryAreaId[];
  intent: AtlasIntent;
  inMind: readonly string[];
  experience: AtlasExperienceLevel;
  history: AtlasHistory;
  priorities: readonly AtlasPriority[];
  style: AtlasStyle;
  forms: readonly AtlasForm[];
  size: AtlasSize;
  includeSupplies: boolean;
  budget: AtlasBudget;
  horizon: AtlasHorizon;
  timing: AtlasTiming;
  /** Null when absent or discarded. */
  note: string | null;
}

export interface AtlasPresentationSignals {
  firstName: string | null;
  style: AtlasStyle;
  history: AtlasHistory;
}

export interface AtlasPolicyDecision {
  selection: AtlasSelectionSignals;
  constraints: AtlasConstraints;
  narrative: AtlasNarrativeSignals;
  presentation: AtlasPresentationSignals;
  ledger: readonly AtlasLedgerEntry[];
  /** The note was provided and discarded. */
  noteDiscarded: boolean;
}

/* ---- Catalogue facts ------------------------------------------------------ */

export interface AtlasSubjectVariant {
  id: string;
  /** MXN, or null when unpriced. */
  price: number | null;
  availability: Availability | null;
}

/** One product as retrieval sees it — facts only, precomputed on the server. */
export interface AtlasSubject {
  slug: string;
  name: string;
  /** Non-null for the signature products, which carry an Experience world. */
  world: string | null;
  areas: readonly DiscoveryAreaId[];
  forms: readonly string[];
  presentations: number;
  variants: readonly AtlasSubjectVariant[];
  /** MXN amount of its cheapest priced presentation, or null when unpriced. */
  entryPrice: number | null;
  documented: boolean;
  referenceIds: readonly string[];
  /** Catalogue position, for deterministic tie-breaks. */
  order: number;
}

export interface AtlasCandidate extends AtlasSubject {
  score: number;
  /** The visitor's topics this product is filed under, in rank order. */
  matchedAreas: readonly DiscoveryAreaId[];
  /** Filed under more than one of the visitor's topics. */
  bridges: boolean;
  /** The visitor named it. */
  inMind: boolean;
  /** The presentation the result puts forward, chosen by the size preference. */
  suggestedVariantId: string | null;
  suggestedPrice: number | null;
  /** Suggested presentation fits the cap. Null with no cap. */
  withinBudget: boolean | null;
  /** False only when the suggested presentation is marked unavailable. */
  available: boolean | null;
}

export interface AtlasDestination {
  id: string;
  kind: "area" | "product" | "catalogue" | "research-index" | "quality-model" | "explorer";
  /** Area id or product slug; empty for the fixed destinations. */
  ref: string;
}

export interface AtlasAreaStat {
  id: DiscoveryAreaId;
  rank: number;
  compounds: number;
  entryPrice: number | null;
}

export interface AtlasRetrieval {
  areas: readonly AtlasAreaStat[];
  /** The products the model may choose from — and the only slugs it may name. */
  candidates: readonly AtlasCandidate[];
  supplies: readonly AtlasCandidate[];
  destinations: readonly AtlasDestination[];
  referenceIds: readonly string[];
  budgetCap: number | null;
  /** How many products matched before the candidate limit. */
  poolSize: number;
}
