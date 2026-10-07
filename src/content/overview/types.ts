import type { ResearchFunctionId } from "@/content/functions";
import type { ContentProvenance, LocalizedText } from "@/content/lifecycle";
import type { DiscoveryAreaId } from "@/data/discovery/types";

/**
 * A STATEMENT THAT NEEDS A SOURCE.
 *
 * Every scientific sentence on a product page is one of these, and it cannot
 * render without at least one PUBLIC reference behind it. Not "should have" —
 * cannot: `publicOverview` drops it, and `check:content` fails the build if an
 * approved statement has none.
 */
export interface SourcedStatement {
  id: string;
  text: LocalizedText;
  /** Reference ids from `content/references`. At least one, all resolvable. */
  references: readonly string[];
  provenance: ContentProvenance;
  /**
   * WHAT KIND OF STATEMENT THIS IS, where it is more than a finding.
   *
   *   safety   it reports adverse events, a safety result, or a regulatory /
   *            approval status, as its source states them
   *   limits   it states a limit of the evidence itself — models used, how
   *            few or how uncontrolled the human studies are
   *
   * Set by hand, per statement, from what the sentence already says — never
   * inferred, and never used to add a sentence. Absent means an ordinary
   * mechanism or research finding. The Quick Record's "Safety & limits" view
   * is built from this; a compound with no tagged statement says so rather
   * than implying it has been shown to be safe.
   */
  aspect?: StatementAspect;
}

export type StatementAspect = "safety" | "limits";

/**
 * WHAT A COMPOUND IS STUDIED FOR, IN PLAIN LANGUAGE (comprehension pass,
 * 2026-10-06).
 *
 * One sentence a reader with no biology can follow — "studied in clinical
 * trials for body weight…" — before any mechanism or citation. It answers
 * "what is this studied for?", never "what is this for?".
 *
 * It is a RESTATEMENT, not a new statement, and the type makes that
 * checkable: every idea in the sentence is a `concept`, and each concept
 * names the approved statement it restates and the exact words in that
 * statement it restates them from. The words left over once the concepts
 * are taken out may only be framing ("studied", "in", "and" — the closed
 * list in `plainLanguage.ts`). So a summary cannot gain an idea that no
 * statement holds: adding "appetite" to a sentence means adding a concept,
 * and a concept needs a quote that exists in an approved statement.
 *
 * Its sources are its statements' sources. It renders only while every
 * statement it rests on renders, in both languages.
 */
export interface StudiedFor {
  id: string;
  text: LocalizedText;
  /**
   *   specific  the record establishes a concrete subject of study — a
   *             condition, population, process or outcome — in human
   *             research or in a body of preclinical work, and the sentence
   *             names it along with the model it was studied in
   *   general   the record supports only what kind of compound it is, a
   *             single narrow study, or (for a blend) its components'
   *             separate literature, and the sentence says no more than that
   */
  scope: StudiedForScope;
  concepts: readonly StudiedForConcept[];
  /** Derived copy whose lineage is `scientific-source` and nothing else. */
  provenance: ContentProvenance;
}

export type StudiedForScope = "specific" | "general";

export interface StudiedForConcept {
  /** The words as the summary says them, per locale. Must appear in `text`. */
  says: LocalizedText;
  /** The id of the statement in this product's overview it restates. */
  statement: string;
  /** Verbatim words from that statement, per locale, that `says` restates. */
  quote: LocalizedText;
}

/**
 * A block of copy that is NOT a scientific claim — a product summary or a
 * technical note built from business decisions and product facts.
 */
export interface CopyBlock {
  id: string;
  text: LocalizedText;
  provenance: ContentProvenance;
}

/**
 * THE PRODUCT OVERVIEW.
 *
 * WHAT IS DELIBERATELY ABSENT FROM THIS TYPE: dose, dosage, administration,
 * injection, cycle, protocol, frequency, reconstitution. Not optional fields
 * left empty — fields that do not exist. Human use is not a thing NEOGEN's
 * content model can express, so no editor can fill one in, and no component
 * can render one. `FORBIDDEN_PUBLIC_TERMS` catches the same ideas if they are
 * smuggled into free text.
 */
export interface ProductOverview {
  slug: string;
  /** One or two sentences. Derived copy or product fact — never a claim. */
  summary: CopyBlock | null;
  /** Why this compound is studied, and in what context. Sourced. */
  researchContext: readonly SourcedStatement[];
  /** What it is investigated for, per discovery area. Sourced. */
  areasOfInvestigation: readonly { area: DiscoveryAreaId; statement: SourcedStatement }[];
  /** Mechanism or pathway, as a published source describes it. Sourced. */
  mechanismNotes: readonly SourcedStatement[];
  /** The references a reader should start with. Must all be public to show. */
  keyReferences: readonly string[];
  /** Technical notes from product facts — format, identity, storage class. */
  technicalNotes: readonly CopyBlock[];
  /**
   * What this compound is studied for, as research functions. Each tag points
   * at the id of a statement in THIS overview's `mechanismNotes` or
   * `researchContext`, and is public only while that statement is.
   */
  functions: readonly { id: ResearchFunctionId; statement: string }[];
}
