import type {
  AtlasDestination,
  AtlasFieldId,
  AtlasReasonCode,
  AtlasRelevance,
  AtlasStyle,
  AtlasUse,
  AtlasWithheld,
} from "./types";
import type { Money } from "@/data/commerce";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THE ADVISOR RESULT — assembled on the server, rendered in the browser.
 *
 * Two sources meet here and are kept visibly apart: every `why`, `note`,
 * `tip`, `headline`, `summary` and `aboutYou` is WRITTEN (by a model, or by
 * the composer), and every other field is READ from a registry at request
 * time. The browser receives both already joined, and the UI contains no
 * recommendation rule: it renders what this structure says.
 *
 * A PRODUCT CARRIES ITS OWN CASE: where it came from (`source`), the
 * structured reasons it is there, the approved evidence it rests on and its
 * relevance. All four are computed or resolved on the server from registry
 * facts, so a future policy that returns specific products with reasons fits
 * this shape as it is.
 */

export type AtlasMode =
  /** Written by the configured model and validated. */
  | "ai"
  /** Composed locally because no model is configured. Development only. */
  | "development"
  /** Composed from the registry because generation was unavailable or failed. */
  | "catalogue";

export type AtlasPickList = "start" | "more" | "supply";

export interface AtlasResultTopic {
  id: DiscoveryAreaId;
  rank: number;
  label: string;
  framing: string;
  href: string;
  compounds: number;
  entryPrice: string | null;
  note: string | null;
}

export interface AtlasResultSuggestion {
  variantId: string;
  /** Formatted from the registry — "10 mg". */
  presentation: string;
  price: Money;
  priceLabel: string;
}

/** Why a product is in the result: a code for machines, a label for people. */
export interface AtlasResultReason {
  code: AtlasReasonCode;
  /** The area or research function it concerns, when it has one. */
  ref: string | null;
  label: string;
}

/** One approved, sourced statement, resolved from `content/overview`. */
export interface AtlasResultEvidence {
  id: string;
  kind: "mechanism" | "research";
  text: string;
  references: readonly { id: string; title: string; href: string | null }[];
}

export interface AtlasResultProduct {
  slug: string;
  name: string;
  href: string;
  list: AtlasPickList;
  why: string | null;
  /**
   * How it entered the result: the visitor named it, a policy rule required
   * it, retrieval scored it, or it is a supply the visitor asked for.
   */
  source: "visitor" | "policy" | "retrieval" | "supply";
  /** The visitor named this product. Kept for the card's badge. */
  inMind: boolean;
  reasons: readonly AtlasResultReason[];
  /** Model-chosen statements first (validated), then the rest, all approved. */
  evidence: readonly AtlasResultEvidence[];
  /** Null for supplies, which are not scored. */
  relevance: AtlasRelevance | null;
  world: string | null;
  worldLabel: string | null;
  areas: readonly { id: DiscoveryAreaId; label: string }[];
  bridges: boolean;
  classification: string;
  presentationRange: string;
  presentations: number;
  entryPrice: string | null;
  /** The presentation Atlas puts forward, by the size preference. */
  suggestion: AtlasResultSuggestion | null;
  withinBudget: boolean | null;
  documented: boolean;
  /**
   * What the compound does and what it has been studied in — the first
   * mechanism note and the first research statement of its PUBLIC overview,
   * read from `content/overview`, never from the generation. Null when no
   * approved, sourced overview exists.
   */
  research: AtlasResultResearch | null;
}

export interface AtlasResultResearch {
  mechanism: string | null;
  studied: string | null;
  /** Public references the overview cites. */
  sources: number;
  /** The product page's overview section. */
  href: string;
}

export interface AtlasResultStep {
  id: string;
  kind: AtlasDestination["kind"];
  label: string;
  href: string;
  note: string | null;
}

export interface AtlasResultSum {
  count: number;
  amount: number | null;
  label: string | null;
  fits: boolean | null;
}

export interface AtlasResultBudget {
  cap: string | null;
  capAmount: number | null;
  /** The "start here" presentations together. */
  start: AtlasResultSum;
  /** Every product in the result. */
  all: AtlasResultSum;
}

/**
 * One question: what the visitor answered and what Atlas did with it. Built in
 * the browser (`buildAtlasLedger`), because withheld answers never leave it.
 */
export interface AtlasResultLedgerEntry {
  /** The question's stable id. */
  question: string;
  /** The profile field it fills; null when unbound. */
  field: AtlasFieldId | null;
  /** The question as the visitor read it. */
  label: string;
  /** Display text of the answer, or null when skipped. */
  answer: string | null;
  answered: boolean;
  uses: readonly AtlasUse[];
  withheld: AtlasWithheld | null;
}

/** The answers echoed as chips above the result — questions with `recap`. */
export interface AtlasResultRecapEntry {
  question: string;
  label: string;
  answer: string;
}

export interface AtlasResultView {
  mode: AtlasMode;
  /** For the page only — never sent to a model. */
  firstName: string | null;
  style: AtlasStyle;
  returning: boolean;
  headline: string;
  summary: string;
  aboutYou: string;
  start: readonly AtlasResultProduct[];
  more: readonly AtlasResultProduct[];
  supplies: readonly AtlasResultProduct[];
  topics: readonly AtlasResultTopic[];
  nextSteps: readonly AtlasResultStep[];
  tips: readonly string[];
  budget: AtlasResultBudget;
  poolSize: number;
  candidateCount: number;
  notices: {
    /** The note was discarded before generation. */
    noteDiscarded: boolean;
    /** The model flagged health content that the screen did not catch. */
    healthMentioned: boolean;
  };
  references: readonly { id: string; title: string; href: string | null }[];
  documentation: { publicRecords: number; modelHref: string; explorerHref: string | null };
  commerce: { bagEnabled: boolean; localeTag: string };
}
