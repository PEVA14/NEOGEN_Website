import type {
  AtlasBudget,
  AtlasDestination,
  AtlasField,
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

export interface AtlasResultProduct {
  slug: string;
  name: string;
  href: string;
  list: AtlasPickList;
  why: string | null;
  /** The visitor named this product. */
  inMind: boolean;
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
  budget: AtlasBudget;
  cap: string | null;
  capAmount: number | null;
  /** The "start here" presentations together. */
  start: AtlasResultSum;
  /** Every product in the result. */
  all: AtlasResultSum;
}

/** One question: what the visitor answered and what Atlas did with it. */
export interface AtlasResultLedgerEntry {
  field: AtlasField;
  /** Display text of the answer, or null when skipped. */
  answer: string | null;
  uses: readonly AtlasUse[];
  withheld: AtlasWithheld | null;
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
  ledger: readonly AtlasResultLedgerEntry[];
  references: readonly { id: string; title: string; href: string | null }[];
  documentation: { publicRecords: number; modelHref: string; explorerHref: string | null };
  commerce: { bagEnabled: boolean; localeTag: string };
}
