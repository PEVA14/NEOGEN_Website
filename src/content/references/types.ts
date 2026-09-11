import type { ContentStatus } from "@/content/lifecycle";

/**
 * A SCIENTIFIC REFERENCE — one record, used everywhere it is cited.
 *
 * The product page's research context and the Research Hub's index read the
 * SAME record by id. There is no second copy of a citation anywhere, so a
 * corrected DOI is corrected on every surface at once, and a retracted paper
 * is withdrawn from every surface at once.
 *
 * WHAT IS NOT HERE: a summary, an abstract, or a "key finding". Those are the
 * fields where an unsupported claim gets written in a source's name, and
 * NEOGEN does not paraphrase literature on a reader's behalf. A reference says
 * what the source is and where to read it. What NEOGEN says ABOUT a source
 * lives in `content/overview`, as a statement that carries this id.
 */
export type SourceType =
  | "journal-article"
  | "review-article"
  | "clinical-trial-registry"
  | "preprint"
  | "book"
  | "regulatory-document"
  | "dataset"
  | "other";

export interface Reference {
  /** Stable, human-readable, never reused. e.g. "ref-2024-smith-glp1". */
  id: string;
  title: string;
  /** As printed by the source, in order. Never abbreviated into "et al." here. */
  authors: readonly string[];
  /** Journal, publisher or registry. Null when the source type has none. */
  publication: string | null;
  year: number | null;
  /** Bare DOI — "10.1000/xyz" — never a URL. */
  doi: string | null;
  /** PubMed id — digits only. */
  pmid: string | null;
  /** Canonical URL, for sources with neither a DOI nor a PMID. */
  url: string | null;
  sourceType: SourceType;
  /**
   * Review status of the RECORD — that the metadata was checked against the
   * source itself, not copied from a secondary list.
   */
  status: ContentStatus;
}
