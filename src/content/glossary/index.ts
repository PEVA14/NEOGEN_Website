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

/** A run of a sentence, and the glossary term it is, when it is one. */
export interface TermSpan {
  text: string;
  term: GlossaryTerm | null;
}

/**
 * A sentence cut at the glossary words it uses — so a record can make its own
 * vocabulary inspectable in place without rewriting a word of a sourced
 * statement. The match is `termsInText`'s (whole words, folded), mapped back
 * onto the original characters; the text of every span, joined, is the
 * sentence exactly.
 *
 * `seen` carries across a document: a term is marked at its FIRST use only,
 * so a record reads as prose with a few marked words, not a page of links.
 */
export function termSpans(text: string, locale: Locale, seen: Set<string>): readonly TermSpan[] {
  /* Fold character by character, keeping where each folded character came from. */
  let folded = "";
  const origin: number[] = [];
  let offset = 0;
  for (const ch of text) {
    for (const f of fold(ch)) {
      folded += f;
      origin.push(offset);
    }
    offset += ch.length;
  }
  origin.push(text.length);

  const hits: { start: number; end: number; term: GlossaryTerm }[] = [];
  for (const term of publicGlossary()) {
    if (seen.has(term.id)) continue;
    for (const needle of term.matches[locale]) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const found = new RegExp(`(?:^|[^a-z0-9])(${escaped})(?:$|[^a-z0-9])`).exec(folded);
      if (!found) continue;
      const start = found.index + found[0].indexOf(found[1]);
      const end = start + found[1].length;
      if (hits.some((h) => start < h.end && end > h.start)) continue;
      hits.push({ start: origin[start], end: origin[end], term });
      seen.add(term.id);
      break;
    }
  }
  hits.sort((a, b) => a.start - b.start);

  const spans: TermSpan[] = [];
  let at = 0;
  for (const hit of hits) {
    if (hit.start > at) spans.push({ text: text.slice(at, hit.start), term: null });
    spans.push({ text: text.slice(hit.start, hit.end), term: hit.term });
    at = hit.end;
  }
  if (at < text.length) spans.push({ text: text.slice(at), term: null });
  return spans;
}
