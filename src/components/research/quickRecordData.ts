import type { PublicSimpleEffects } from "@/content/effects";

/**
 * THE QUICK RECORD PAYLOAD — what the compendium drawer shows for one compound.
 *
 * Built on the server from the same registries as the full record
 * (`server/quickRecord.ts`) and fetched when a drawer opens, so the index
 * page stays light and nothing here is a second copy of the data: every
 * sentence is a published sourced statement, every source a reference record.
 *
 * THREE ZONES, NEVER BLURRED:
 *   record    what the scientific literature reports — statements and sources
 *   product   what NEOGEN sells — presentations and prices
 *   docs      what has been documented about NEOGEN's own material — by
 *             product, presentation or lot — which is not science about the
 *             compound
 *
 * Plus, above all three, the owner-authored Simple Effects when approved
 * (`simpleEffects`): editorial comprehension copy, never a statement.
 */
export type StatementSection = "mechanism" | "research" | "area";
export type StatementAspect = "safety" | "limits";

export interface QuickStatement {
  id: string;
  section: StatementSection;
  /** The area a by-area statement belongs to, as a label. */
  area: string | null;
  text: string;
  /** Positions in `sources`, 1-based, as the full record numbers them. */
  citations: readonly number[];
  aspect: StatementAspect | null;
  /** The full record's section this statement lives in. */
  recordHref: string;
}

export interface QuickSource {
  n: number;
  title: string;
  /** "Coskun T, Urva S, Roell WC et al." */
  authors: string;
  publication: string | null;
  year: number | null;
  /** Localized source type: "Artículo", "Revisión"… */
  type: string;
  doi: string | null;
  pmid: string | null;
  /** Where to read it — DOI, PubMed or the canonical URL. Null if none. */
  href: string | null;
  /** Ids of the statements in this record that cite it. */
  citedBy: readonly string[];
}

export interface QuickRecordData {
  slug: string;
  /** Owner-authored Simple Effects, when approved (`content/effects`). */
  simpleEffects: PublicSimpleEffects | null;
  record: {
    href: string;
    summary: string | null;
    /** What it is studied for, in plain language — read before anything else. */
    studiedFor: string | null;
    statements: readonly QuickStatement[];
    /** Record notes: derived copy about what the sources cover. Unsourced by design. */
    notes: readonly string[];
    sources: readonly QuickSource[];
    /** Earliest and latest source years, when any source is dated. */
    span: readonly [number, number] | null;
    /** Source types with counts, most frequent first. */
    types: readonly { label: string; count: number }[];
    /** Glossary terms the record's own text uses. */
    terms: readonly { id: string; label: string; href: string }[];
    /** Molecular identity — only when a source-backed entry exists. */
    identity: {
      formula: string | null;
      mass: string | null;
      sequence: string | null;
      cas: string | null;
      source: string;
      sourceUrl: string | null;
    } | null;
  } | null;
  product: {
    href: string;
    presentations: readonly { label: string; price: string | null }[];
    from: string | null;
  };
  docs: {
    product: number;
    presentation: number;
    lot: number;
    href: string;
  };
}
