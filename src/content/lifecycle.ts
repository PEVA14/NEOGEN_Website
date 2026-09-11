import type { Locale } from "@/i18n/config";

/**
 * CONTENT LIFECYCLE — what may reach a customer, stated as data.
 *
 * Every piece of public content in NEOGEN belongs to one of five classes, and
 * the class decides what it needs before it can render. The classes are the
 * ones the Phase 11 brief named, lettered so a reviewer can say "that sentence
 * is a D with no A behind it" and mean something precise:
 *
 *   A  business-decision  — the owner decided it. "Free shipping from MX$10,000."
 *   B  product-fact       — true of the product and checkable. "5 mg × 10 vials."
 *   C  scientific-source  — a statement a published source supports. Needs a
 *                           reference, always.
 *   D  derived-copy       — marketing language built FROM A/B/C. Needs to say
 *                           which.
 *   E  blocked            — missing, unsourced, or not allowed. Never renders.
 *
 * THE ONE RULE: E never becomes D. Copy that "sounds right" but rests on
 * nothing is class E however well it is written, and the type system plus
 * `isPublishable` below are what stop it being promoted by accident.
 */
export type ContentClass =
  "business-decision" | "product-fact" | "scientific-source" | "derived-copy" | "blocked";

export const CONTENT_CLASS_LETTER: Readonly<Record<ContentClass, "A" | "B" | "C" | "D" | "E">> = {
  "business-decision": "A",
  "product-fact": "B",
  "scientific-source": "C",
  "derived-copy": "D",
  blocked: "E",
};

/**
 * Review status. Only `approved` renders.
 *
 * `source-needed` is its own state rather than a kind of draft because it is
 * the most common reason scientific copy stalls, and it needs a different
 * person to unblock it — someone who can find a paper, not someone who can
 * edit a sentence.
 */
export type ContentStatus = "draft" | "source-needed" | "owner-review" | "approved";

export interface ContentProvenance {
  class: ContentClass;
  status: ContentStatus;
  /**
   * For derived copy (D) only: the classes it was written from.
   *
   * Required and non-empty for D, because a marketing line that cannot name
   * what it rests on is class E. May never include `derived-copy` or
   * `blocked` — copy derived from copy is how an unsupported claim acquires a
   * respectable-looking ancestry.
   */
  derivedFrom?: readonly ContentClass[];
}

/** Localized text. Every locale is required so no language silently falls back. */
export type LocalizedText = Readonly<Record<Locale, string>>;

/**
 * VOCABULARY THAT MAY NEVER REACH A PUBLIC SURFACE.
 *
 * Human-use instructions do not belong in NEOGEN's content model at all —
 * there is no dose field, no administration field, no protocol field — and
 * this list is the second line of defence: a sentence that smuggles the same
 * idea into free text is refused at render time and fails
 * `npm run check:content`.
 *
 * Matched on word STEMS, case- and accent-insensitively, in both locales.
 * Deliberately broad: a false positive costs an editor a rewrite; a false
 * negative publishes a dosing instruction.
 */
export const FORBIDDEN_PUBLIC_TERMS: readonly string[] = [
  "dose",
  "dosage",
  "dosing",
  "dosis",
  "posologia",
  "administer",
  "administration",
  "administrar",
  "administracion",
  "inject",
  /* "inyec", not "inyect": inyección is spelled with a double c, and the
     longer stem matched inyectar but silently missed the noun. */
  "inyec",
  "subcutane",
  "intramuscular",
  "intravenous",
  "intravenos",
  "cycle",
  "ciclo",
  "protocol",
  "protocolo",
  "frequency",
  "frecuencia",
  "reconstitut",
  "reconstitu",
  "mg/kg",
  "per day",
  "por dia",
  /* NOT "al dia": it matches "al día siguiente", the owner-confirmed delivery
     promise. The specific dosing forms above are kept instead. */
  "daily use",
  "uso diario",
];

function fold(text: string): string {
  return text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** The first forbidden stem the text contains, or null. */
export function forbiddenTermIn(text: string): string | null {
  const folded = fold(text);
  return FORBIDDEN_PUBLIC_TERMS.find((term) => folded.includes(term)) ?? null;
}

/**
 * May content with this provenance render publicly?
 *
 * Does not know about references — a C statement's references are checked by
 * the caller that holds the registry (`content/overview`). This answers only
 * the lifecycle half: approved, not blocked, and — for D — honest about its
 * ancestry.
 */
export function isPublishable(provenance: ContentProvenance): boolean {
  if (provenance.status !== "approved") return false;
  if (provenance.class === "blocked") return false;
  if (provenance.class === "derived-copy") {
    const from = provenance.derivedFrom ?? [];
    if (from.length === 0) return false;
    if (from.some((c) => c === "derived-copy" || c === "blocked")) return false;
  }
  return true;
}
