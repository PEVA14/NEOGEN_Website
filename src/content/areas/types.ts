import type { CopyBlock, SourcedStatement } from "@/content/overview/types";
import type { DiscoveryAreaId } from "@/data/discovery/types";

/**
 * AN AREA OVERVIEW — the context slot on a discovery area page.
 *
 * The same content rules as a product overview, applied to a department: a
 * scientific sentence is a `SourcedStatement` and cannot render without a
 * public reference, and a summary is a `CopyBlock` that may not carry a claim
 * at all. Validation is the product overview's own (`publicStatement`,
 * `publicCopy`), imported rather than copied.
 *
 * WHAT IS DELIBERATELY ABSENT: any field for dose, administration, protocol,
 * frequency, outcome or efficacy. `check:content` scans this file's source for
 * them, as it does the product overview's.
 *
 * An area overview describes WHY compounds are studied in a context. It never
 * describes what they do for a person, and it never widens a product fact into
 * an area fact — a statement about one compound belongs in that compound's own
 * overview, where its citation sits next to its name.
 */
export interface AreaOverview {
  area: DiscoveryAreaId;
  /** One or two sentences framing the area. Derived copy or business fact. */
  summary: CopyBlock | null;
  /** The research themes the area's literature is organised around. Sourced. */
  themes: readonly SourcedStatement[];
  /** Biological pathways, as a published source names them. Sourced. */
  pathways: readonly SourcedStatement[];
  /** The references a reader should start with. Must all be public to show. */
  keyReferences: readonly string[];
}
