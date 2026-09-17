import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * NEOGEN ATLAS — the shapes a personal research map is built from.
 *
 * Atlas turns a short questionnaire into a map of the catalogue: which of the
 * eight discovery areas a reader is working in, which compounds are filed
 * there, how they bridge, what they cost to enter, and where to go next. An
 * AI writes the reasoning; every product FACT is joined from the registry.
 *
 * WHAT IS DELIBERATELY NOT HERE. The reference tool this was modelled on asks
 * for weight, height, sex, medical conditions, medication, route of
 * administration, cycle length and timing, and answers with a dosing schedule.
 * None of those fields exist in this type, so none of them can be collected,
 * sent to a model, or rendered. A research-compound retailer's advisor that
 * takes a body and a diagnosis and returns a purchase is individualised
 * treatment selection whether or not a dose is printed.
 */

export const ATLAS_MAX_AREAS = 3;
export const ATLAS_MAX_FOCUS = 2;
/** The optional note. Short on purpose: it frames, it does not describe a person. */
export const ATLAS_CONTEXT_MAX = 280;

/** What the reader wants the map to favour. None of these is an outcome. */
export type AtlasFocus = "documentation" | "flagships" | "bridges" | "value";
export const atlasFocuses: readonly AtlasFocus[] = [
  "documentation",
  "flagships",
  "bridges",
  "value",
];

/** How much of the catalogue's structure the reader already knows. */
export type AtlasDepth = "orientation" | "detail";
export const atlasDepths: readonly AtlasDepth[] = ["orientation", "detail"];

/** The presentation forms, exactly as `Strength` distinguishes them. */
export type AtlasForm = "solid" | "solution" | "volume" | "iu" | "blend";
export const atlasForms: readonly AtlasForm[] = ["solid", "solution", "volume", "iu", "blend"];

/**
 * Budget tiers, in MXN, applied to REAL registry prices at the entry
 * presentation of each compound. A cap, not a plan: nothing here says how much
 * of anything to buy.
 */
export type AtlasBudget = "open" | "8k" | "20k" | "40k";
export const atlasBudgets: readonly AtlasBudget[] = ["open", "8k", "20k", "40k"];
export const ATLAS_BUDGET_CAPS: Readonly<Record<AtlasBudget, number | null>> = {
  open: null,
  "8k": 8000,
  "20k": 20000,
  "40k": 40000,
};

export interface AtlasAnswers {
  /** One to three areas, RANKED: index 0 is the primary area. */
  areas: readonly DiscoveryAreaId[];
  depth: AtlasDepth;
  focus: readonly AtlasFocus[];
  /** Empty means any form. */
  forms: readonly AtlasForm[];
  /** Offer laboratory materials (solvents, consumables) alongside compounds. */
  includeMaterials: boolean;
  budget: AtlasBudget;
  /**
   * The optional research note, AFTER screening. Empty whenever the reader's
   * note contained personal, health, medication or dosing detail — that text
   * is dropped before anything leaves the server.
   */
  context: string;
  /** True when a note was provided and dropped by the screen. */
  contextScreened: boolean;
}

/** One compound as retrieval sees it — facts only, precomputed on the server. */
export interface AtlasSubject {
  slug: string;
  name: string;
  /** Non-null for the flagships, which carry an Experience world. */
  world: string | null;
  /** The public discovery areas this compound is filed under. */
  areas: readonly DiscoveryAreaId[];
  /** Distinct strength kinds across its variants. */
  forms: readonly string[];
  presentations: number;
  /** MXN amount of its cheapest priced presentation, or null when unpriced. */
  entryPrice: number | null;
  /** At least one public documentation record resolves for it. */
  documented: boolean;
  /** Public reference ids that cite it. Empty until references are approved. */
  referenceIds: readonly string[];
  /** Catalogue position, for deterministic tie-breaks. */
  order: number;
}

export interface AtlasCandidate extends AtlasSubject {
  score: number;
  /** The reader's selected areas this compound is filed under, in rank order. */
  matchedAreas: readonly DiscoveryAreaId[];
  /** Filed under more than one of the selected areas. */
  bridges: boolean;
  /** Entry presentation fits the budget cap. Null when the budget is open. */
  withinBudget: boolean | null;
}

/** Somewhere a path step may send the reader. Every one is a route that renders. */
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
  /** The compounds the model may choose from — and the only slugs it may name. */
  candidates: readonly AtlasCandidate[];
  materials: readonly AtlasCandidate[];
  destinations: readonly AtlasDestination[];
  referenceIds: readonly string[];
  budgetCap: number | null;
  /** How many compounds matched before the candidate limit — for honest copy. */
  poolSize: number;
}
