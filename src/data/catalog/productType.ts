import type { Product } from "./types";

/**
 * PRODUCT TYPE — the factual axis. Exactly one per product.
 *
 * SEPARATE FROM `Product.category`, WHICH STAYS.
 * ---------------------------------------------
 * `category` is the supplier-oriented bucket the catalogue was imported with
 * (metabolic / peptides / blends / solvents). It still drives the catalogue
 * filter, the register and the spec table's "catalogue classification" row,
 * and it is deliberately NOT overwritten here: it is a real, if coarse,
 * internal classification, and replacing it in the same change that introduces
 * two new axes would make a migration impossible to verify.
 *
 * THE DEFAULT ASSERTS NOTHING.
 * ----------------------------
 * `compound` means only "a substance we sell". That inversion is the point.
 * Today's bug is that everything defaults to `peptides`, so the system claims
 * chemistry it has no basis for — twelve products under that label are not
 * peptides. Here, specificity is EARNED by confirmation: calling something a
 * peptide requires someone to say so.
 */
export type ProductType =
  /** The non-asserting default. */
  | "compound"
  | "peptide"
  | "protein"
  | "small-molecule"
  | "vitamin-cofactor"
  | "amino-acid-derivative"
  /** Derived: any variant dosed as a multi-component strength. */
  | "blend"
  /** Derived: the solvents. */
  | "solvent";

export const productTypes: readonly ProductType[] = [
  "compound",
  "peptide",
  "protein",
  "small-molecule",
  "vitamin-cofactor",
  "amino-acid-derivative",
  "blend",
  "solvent",
];

/**
 * OWNER-CONFIRMED TYPES.
 *
 * Hand-maintained and empty on purpose. Every entry is a statement about what
 * a substance is, and the source document states none — so this file is filled
 * by someone who knows, not by whoever wrote the parser.
 *
 * Kept out of `generated.ts` because the importer overwrites that file; a
 * confirmed value there would be destroyed on the next run. Same reasoning as
 * `commerce/availability.ts`.
 *
 *   semaglutide: "peptide",
 *   nad: "vitamin-cofactor",
 */
export const CONFIRMED_TYPE: Readonly<Record<string, ProductType>> = {};

/**
 * Two things are objectively derivable from data the registry already holds,
 * so they are never left to confirmation:
 *
 *   blend    — a variant whose strength has multiple components IS a blend.
 *   solvent  — the three waters, which the source sells by volume as diluents.
 *
 * Everything else needs a person.
 */
function derive(product: Product): ProductType | null {
  if (product.variants.some((v) => v.strength.kind === "blend")) return "blend";
  if (product.category === "solvents") return "solvent";
  return null;
}

/**
 * A confirmed value wins over a derived one — the owner knows more than the
 * parser. Where the two disagree, `check:catalog` reports it rather than
 * silently preferring either.
 */
export function productType(product: Product): ProductType {
  return CONFIRMED_TYPE[product.slug] ?? derive(product) ?? "compound";
}

/** For the check script: surfaces a confirmation that contradicts the data. */
export function derivedType(product: Product): ProductType | null {
  return derive(product);
}
