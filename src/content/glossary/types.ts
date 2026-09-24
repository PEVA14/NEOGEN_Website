import type { ArticleStatus, LocalizedText } from "@/content/editorial/types";

/**
 * THE GLOSSARY — the vocabulary the rest of NEOGEN Research is written in.
 *
 * WHY IT IS INFRASTRUCTURE AND NOT A PAGE. A compound record says "phase 2",
 * "agonist", "half-life", "open-label". A reader who does not know those words
 * cannot evaluate the record, and a record that stopped to define each one
 * would stop being a record. So the words are defined once, here, and every
 * surface that uses them links here — the record lists the terms its own text
 * contains (`termsInText`), and each term lists the records that use it.
 *
 * WHAT A DEFINITION MAY SAY. The editorial `definition` class and nothing
 * else: what a word means, true independently of NEOGEN and of any product.
 * A definition never says what a compound does. "Agonist" is defined; which
 * compound is an agonist of what is a sourced statement in that compound's
 * record, and only there.
 *
 * WHAT IS DELIBERATELY ABSENT. There is no dosing, administration, protocol,
 * cycle or preparation vocabulary, and there never will be: those are
 * instructions for human use wearing a dictionary's clothes.
 * `FORBIDDEN_PUBLIC_TERMS` is checked against every entry by `check:content`.
 */
export type GlossaryCategory =
  /** Molecules: what a peptide is made of and how it is named. */
  | "structure"
  /** Receptors, pathways and the words a mechanism is described in. */
  | "mechanism"
  /** Study designs and how to weigh what a study found. */
  | "evidence"
  /** Analytical documentation: what a certificate contains. */
  | "quality"
  /** Physical materials and what affects their stability. */
  | "materials"
  /** The words NEOGEN's own records are organised by. */
  | "framework";

export const GLOSSARY_CATEGORIES: readonly GlossaryCategory[] = [
  "structure",
  "mechanism",
  "evidence",
  "quality",
  "materials",
  "framework",
];

/**
 * Where a term leads, beyond its definition. Keys resolve to real routes at
 * render time; an unknown key is a type error, so a term cannot link a page
 * that does not exist.
 */
export type GlossaryDestination =
  "peptides" | "compendium" | "lines" | "handling" | "start" | "references" | "quality-model";

export interface GlossaryTerm {
  /** Anchor id and stable key: `#vida-media`. Never reused, never renamed. */
  id: string;
  category: GlossaryCategory;
  status: ArticleStatus;
  term: LocalizedText;
  /** An abbreviation a reader may meet instead of the term — "COA", "HPLC". */
  abbreviation?: string;
  definition: LocalizedText;
  /**
   * The forms of the word as they appear in running text, folded (lowercase,
   * no accents). Matched as whole words against a record's statements, so a
   * record can list the terms it uses. Empty means "never matched in text" —
   * right for NEOGEN's own framework words, which describe the record rather
   * than appear in it.
   */
  matches: Readonly<Record<"es" | "en", readonly string[]>>;
  /** Other term ids. Checked: every one must exist. */
  seeAlso?: readonly string[];
  /** A note slug from `content/editorial` that treats the term at length. */
  note?: string;
  destination?: GlossaryDestination;
}
