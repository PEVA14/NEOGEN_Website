import { forbiddenTermIn } from "@/content/lifecycle";
import { fold } from "@/lib/search";

import { GLOSSARY } from "./registry";

import type { Locale } from "@/i18n/config";
import type { GlossaryCategory, GlossaryTerm } from "./types";

export { GLOSSARY } from "./registry";
export {
  GLOSSARY_CATEGORIES,
  type GlossaryCategory,
  type GlossaryDestination,
  type GlossaryTerm,
} from "./types";

/**
 * THE GLOSSARY GATE — the same two conditions as every content module here:
 * the entry is approved, and no word in it is one NEOGEN refuses to publish.
 * An entry that fails either is absent everywhere at once: the page, every
 * record's term list, and the counts the hub prints.
 */
export function isPublicTerm(term: GlossaryTerm): boolean {
  if (term.status !== "approved") return false;
  const text = [term.term.es, term.term.en, term.definition.es, term.definition.en].join(" ");
  return forbiddenTermIn(text) === null;
}

export function publicGlossary(): readonly GlossaryTerm[] {
  return GLOSSARY.filter(isPublicTerm);
}

export function publicTerm(id: string): GlossaryTerm | undefined {
  return publicGlossary().find((t) => t.id === id);
}

export function termsInCategory(category: GlossaryCategory): readonly GlossaryTerm[] {
  return publicGlossary().filter((t) => t.category === category);
}

/** Whole-word match on folded text; a phrase matches as a phrase. */
function mentions(folded: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(folded);
}

/**
 * The glossary terms a passage of text uses, in glossary order.
 *
 * This is how a compound record lists "the words in this record": it scans
 * the record's own published sentences, never a hand-kept list, so the list
 * cannot mention a term the record does not use — and it links the text to
 * the definitions without rewriting a single word of a sourced statement.
 */
export function termsInText(text: string, locale: Locale): readonly GlossaryTerm[] {
  const folded = fold(text);
  return publicGlossary().filter((term) =>
    term.matches[locale].some((needle) => mentions(folded, needle)),
  );
}
