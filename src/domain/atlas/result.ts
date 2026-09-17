import type { AtlasBudget, AtlasDepth, AtlasDestination, AtlasFocus, AtlasForm } from "./types";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THE RESULT A READER SEES — assembled on the server, rendered in the browser.
 *
 * Two sources meet here and are kept visibly apart: every `rationale`, `note`,
 * `title` and `summary` is WRITTEN (by a model, or by the composer), and every
 * other field is READ from a registry at request time. The browser receives
 * both already joined and has no way to ask for anything else.
 */

export type AtlasMode =
  /** Written by the configured model and validated. */
  | "ai"
  /** Composed locally because no model is configured. Development only. */
  | "development"
  /** Composed from the registry because generation was unavailable or failed. */
  | "catalogue";

export interface AtlasResultArea {
  id: DiscoveryAreaId;
  rank: number;
  label: string;
  framing: string;
  href: string;
  compounds: number;
  entryPrice: string | null;
  rationale: string | null;
}

export interface AtlasResultCompound {
  slug: string;
  name: string;
  href: string;
  role: "core" | "complement" | "material";
  rationale: string | null;
  world: string | null;
  worldLabel: string | null;
  areas: readonly { id: DiscoveryAreaId; label: string }[];
  bridges: boolean;
  classification: string;
  presentationRange: string;
  presentations: number;
  entryPrice: string | null;
  entryAmount: number | null;
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

export interface AtlasResultBudget {
  budget: AtlasBudget;
  cap: string | null;
  capAmount: number | null;
  /** Sum of each core compound's entry presentation, from the registry. */
  coreEntry: string | null;
  coreEntryAmount: number | null;
  coreCount: number;
  /** Sum across every compound on the map. */
  allEntry: string | null;
  allEntryAmount: number | null;
  allCount: number;
  fitsCore: boolean | null;
  fitsAll: boolean | null;
}

export interface AtlasResultView {
  mode: AtlasMode;
  title: string;
  summary: string;
  areas: readonly AtlasResultArea[];
  compounds: readonly AtlasResultCompound[];
  materials: readonly AtlasResultCompound[];
  path: readonly AtlasResultStep[];
  notes: readonly string[];
  budget: AtlasResultBudget;
  /** How many compounds matched, and how many the model was shown. */
  poolSize: number;
  candidateCount: number;
  /** Show the fixed health notice — the note mentioned personal or health detail. */
  healthNotice: boolean;
  /** The reader's note was dropped before generation. */
  contextScreened: boolean;
  references: readonly { id: string; title: string; href: string | null }[];
  documentation: { publicRecords: number; modelHref: string; explorerHref: string | null };
  inputs: {
    depth: AtlasDepth;
    focus: readonly AtlasFocus[];
    forms: readonly AtlasForm[];
    includeMaterials: boolean;
  };
}
