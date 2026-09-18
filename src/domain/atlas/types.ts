import type { AtlasFieldCategory, AtlasFieldId, AtlasSensitivity } from "./fields";
import type { AtlasPermission } from "./policy";
import type { ResearchFunctionId } from "@/content/functions";
import type { Availability } from "@/data/commerce";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * NEOGEN ATLAS — the shapes a personal selection is built from.
 *
 *   answers → AtlasProfile (complete, typed)       profile.ts, fields.ts
 *           → privacy / transmission policy         privacy.ts
 *           → advisor policy, over projections      policy.ts, policies/*
 *           → signals → retrieval → advisor engine → validation
 *           → AtlasResultView → UI
 *
 * The PROFILE (`profile.ts`) is the whole answered questionnaire, typed. The
 * ADVISOR POLICY never reads it: it receives one projection per permission
 * and turns them into the shapes below — selection signals, constraints,
 * narrative signals, the AI context, presentation signals. Everything
 * downstream consumes those.
 */

export type { AtlasFieldCategory, AtlasFieldId, AtlasSensitivity } from "./fields";

/**
 * How many ranked topics the policy weighs. The questionnaire may offer fewer
 * (its own `max`); anything beyond this many ranks carries no weight.
 */
export const ATLAS_TOPIC_RANKS = 3;

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

/* ---- What the policy hands downstream ------------------------------------- */

export interface AtlasWeights {
  /** Per topic rank. Length ≥ ATLAS_TOPIC_RANKS. */
  topic: readonly number[];
  pinned: number;
  /** Per research function the product is publicly tagged with. */
  function: number;
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
  functions: readonly ResearchFunctionId[];
  /**
   * RETRIEVAL permission, separate from selection: the research functions whose
   * approved statements a card leads with. May differ from `functions`.
   */
  evidenceFocus: readonly ResearchFunctionId[];
  /** Products that must be candidates and must appear in the result. */
  pinned: readonly AtlasPin[];
  forms: readonly AtlasForm[];
  budgetCap: number | null;
  /** Which presentation to put forward for each product. */
  variant: "entry" | "largest-within-budget";
  includeSupplies: boolean;
  /** Each topic keeps at least this many candidates, when it has them. */
  perTopicFloor: number;
  weights: AtlasWeights;
}

/**
 * A product the policy requires in the result, with its reasons. The visitor
 * naming a product is one source; a future policy rule is the other — the
 * pipeline carries both identically, from retrieval through the model's
 * constraints and the validator to the result card.
 */
export interface AtlasPin {
  slug: string;
  source: "visitor" | "policy";
  reasons: readonly AtlasReasonCode[];
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
  /** Every pinned product that was retrieved must appear in the result. */
  includePinned: boolean;
  /** Every chosen topic with a candidate appears in the result. */
  coverTopics: boolean;
  /** One-order visitors see within-budget additions before the rest. */
  moreWithinBudgetFirst: boolean;
}

/**
 * The policy's derived signals for writing the result — built from the
 * AI-context projection, plus the catalogue areas the SELECTION used (a fact
 * about the candidates, not an answer).
 */
export interface AtlasNarrativeSignals {
  /**
   * The fields the visitor answered AND the policy lets the writer know. Every
   * other value below is a default, and neither the model nor the composer may
   * present a default as something the visitor said.
   */
  asked: readonly AtlasFieldId[];
  /** Catalogue areas of this selection, ranked. */
  topics: readonly DiscoveryAreaId[];
  functions: readonly ResearchFunctionId[];
  intent: AtlasIntent;
  pinned: readonly string[];
  experience: AtlasExperienceLevel;
  history: AtlasHistory;
  priorities: readonly AtlasPriority[];
  style: AtlasStyle;
  forms: readonly AtlasForm[];
  size: AtlasSize;
  includeSupplies: boolean;
  budgetCap: number | null;
  horizon: AtlasHorizon;
  timing: AtlasTiming;
}

/**
 * One profile field the advisor ENGINE may see: exactly the policy's
 * AI-context projection, with category and sensitivity kept on it so what a
 * model received is auditable. Text arrives as untrusted data.
 */
export interface AtlasContextEntry {
  field: AtlasFieldId;
  category: AtlasFieldCategory;
  sensitivity: AtlasSensitivity;
  value: string | number | boolean | readonly string[];
}

export interface AtlasPresentationSignals {
  firstName: string | null;
  style: AtlasStyle;
  history: AtlasHistory;
}

export interface AtlasPolicyDecision {
  /** Which policy decided, and what it was permitted — recorded on the result. */
  policy: {
    id: string;
    version: string;
    permissions: Readonly<Record<AtlasFieldId, readonly AtlasPermission[]>>;
  };
  selection: AtlasSelectionSignals;
  constraints: AtlasConstraints;
  narrative: AtlasNarrativeSignals;
  presentation: AtlasPresentationSignals;
  /** What the advisor engine may know about the visitor, field by field. */
  context: readonly AtlasContextEntry[];
  /** The note was provided and discarded. The ledger records it per question. */
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
  /** Research functions backed by an approved, sourced statement. */
  functions: readonly ResearchFunctionId[];
  forms: readonly string[];
  presentations: number;
  variants: readonly AtlasSubjectVariant[];
  /** MXN amount of its cheapest priced presentation, or null when unpriced. */
  entryPrice: number | null;
  documented: boolean;
  referenceIds: readonly string[];
  /** Approved, sourced statements of its public overview — ids, never text. */
  evidence: readonly AtlasEvidenceRef[];
  /** Catalogue position, for deterministic tie-breaks. */
  order: number;
}

/**
 * One approved statement a product's public overview makes, by id. The text
 * is resolved per locale at assembly, from `content/overview`; the model sees
 * ids and may point at them, and has nowhere to write a finding of its own.
 */
export interface AtlasEvidenceRef {
  /** The statement id in the product's overview. */
  id: string;
  kind: "mechanism" | "research";
  /** Research functions this statement backs. */
  functions: readonly ResearchFunctionId[];
  referenceIds: readonly string[];
}

/** Why a candidate is in the result — decided by code, never by the model. */
export type AtlasReasonCode =
  | "named-by-visitor"
  | "policy-pin"
  | "area-match"
  | "function-match"
  | "spans-areas"
  | "signature"
  | "documented"
  | "referenced"
  | "value"
  | "within-budget"
  | "over-budget"
  | "unavailable"
  | "catalogue-wide";

export interface AtlasReason {
  code: AtlasReasonCode;
  /** The area or research-function id the reason is about, when it has one. */
  ref: string | null;
}

/**
 * Relevance, as the policy's scoring computed it. Deterministic and
 * reproducible — not a model's self-reported confidence.
 */
export interface AtlasRelevance {
  /** 1-based position among the candidates. */
  rank: number;
  score: number;
  tier: "primary" | "secondary" | "supporting";
}

export interface AtlasCandidate extends AtlasSubject {
  score: number;
  /** The visitor's topics this product is filed under, in rank order. */
  matchedAreas: readonly DiscoveryAreaId[];
  /** Filed under more than one of the visitor's topics. */
  bridges: boolean;
  /** The visitor's research functions this product is tagged with. */
  matchedFunctions: readonly ResearchFunctionId[];
  /** Required in the result, and why. Null for an ordinary candidate. */
  pin: AtlasPin | null;
  /** Structured reasons for its place, in order of weight. */
  reasons: readonly AtlasReason[];
  /** Its evidence, statements backing the visitor's functions first. */
  evidence: readonly AtlasEvidenceRef[];
  relevance: AtlasRelevance;
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
