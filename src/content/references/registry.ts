import type { Reference } from "./types";

/**
 * THE REFERENCE REGISTRY — deliberately empty.
 *
 * No citation has been checked against its source, so none is listed. Adding
 * one means reading the source and copying its metadata from the source — the
 * journal page, PubMed, the DOI resolver — never from a secondary list, a
 * search snippet, or memory. `npm run check:content` validates every record's
 * identifiers, and an approved record with no DOI, PMID or URL fails.
 */
export const REFERENCES: readonly Reference[] = [];
