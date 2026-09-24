import { isPublicReference, referenceHref, REFERENCES } from "@/content/references";

import type { ContentStatus } from "@/content/lifecycle";

/**
 * MOLECULAR IDENTITY — formula, mass, sequence, registry numbers.
 *
 * EMPTY ON PURPOSE, IN THE SHAPE OF `content/certifications`.
 *
 * A scientific compendium is expected to print a compound's formula, its
 * molecular mass and, for a peptide, its sequence. None of that is in this
 * repository: the catalogue was imported with names and presentations only,
 * and the sourced profiles describe what compounds DO, not their chemistry.
 * Writing those figures from memory is exactly the fabrication this project
 * forbids — a wrong residue or a transposed digit in a mass is not a typo on
 * a research site, it is a false identity.
 *
 * So the compound record has a place for identity and prints what is here,
 * which today is nothing. A record's identity table then shows the facts the
 * catalogue does hold (name, alternative designation, composition, type,
 * presentations) and simply has no formula row — never a "pending" one.
 *
 * WHAT AN ENTRY NEEDS TO RENDER. Every value is read from a named source and
 * the entry says which: a reference already in the registry (approved), or a
 * public database record a reader can open (PubChem, ChEBI, UniProt). Status
 * `approved`, a source, and at least one field.
 */
export interface MolecularIdentity {
  slug: string;
  /** Hill notation, as the source prints it — "C225H348N48O68". */
  formula: string | null;
  /** Average molecular mass in g/mol, as the source states it. */
  molecularMass: number | null;
  /** One-letter or three-letter sequence, verbatim from the source. */
  sequence: string | null;
  cas: string | null;
  source:
    | { kind: "reference"; referenceId: string }
    | { kind: "database"; name: "PubChem" | "ChEBI" | "UniProt"; url: string };
  status: ContentStatus;
}

export const IDENTITIES: readonly MolecularIdentity[] = [];

export interface PublicIdentity {
  formula: string | null;
  molecularMass: number | null;
  sequence: string | null;
  cas: string | null;
  sourceLabel: string;
  sourceUrl: string | null;
}

/** The identity a record may print, or null — which is every compound today. */
export function publicIdentity(
  slug: string,
  identities: readonly MolecularIdentity[] = IDENTITIES,
): PublicIdentity | null {
  const entry = identities.find((i) => i.slug === slug);
  if (!entry || entry.status !== "approved") return null;
  if (!entry.formula && entry.molecularMass === null && !entry.sequence && !entry.cas) return null;

  if (entry.source.kind === "reference") {
    const { referenceId } = entry.source;
    const reference = REFERENCES.find((r) => r.id === referenceId);
    if (!reference || !isPublicReference(reference)) return null;
    return {
      formula: entry.formula,
      molecularMass: entry.molecularMass,
      sequence: entry.sequence,
      cas: entry.cas,
      sourceLabel: reference.title,
      sourceUrl: referenceHref(reference),
    };
  }
  if (!/^https:\/\/\S+$/.test(entry.source.url)) return null;
  return {
    formula: entry.formula,
    molecularMass: entry.molecularMass,
    sequence: entry.sequence,
    cas: entry.cas,
    sourceLabel: entry.source.name,
    sourceUrl: entry.source.url,
  };
}
