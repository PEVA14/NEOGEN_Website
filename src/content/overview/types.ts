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
}
