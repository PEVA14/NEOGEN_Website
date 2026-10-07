import { fold, forbiddenTermIn } from "@/content/lifecycle";

import type { Locale } from "@/i18n/config";
import type { SourcedStatement, StudiedFor } from "./types";

/**
 * THE RULES A PLAIN-LANGUAGE SUMMARY IS HELD TO (`StudiedFor`).
 *
 * The content checks are structural, as they are everywhere else in the
 * model: they can prove that every idea in a summary is pinned to the words of
 * an approved statement, and that nothing else got in. They cannot prove that
 * the plain words are a fair translation of the quoted ones — that is a
 * reader's job, and `PROJECT_STATE` lists the summaries that deserve one.
 */

/** A summary is one sentence, occasionally two. Past this it is a paragraph. */
export const STUDIED_FOR_MAX_WORDS = 35;

/**
 * THE FRAMING VOCABULARY — the only words a summary may use outside its
 * concepts. Function words, and the verbs that say research happened
 * ("studied", "reviewed"). Nothing here can carry a finding, a population, a
 * model or an outcome, so a summary cannot say one without a concept, and a
 * concept cannot exist without a quote. Folded (lowercase, no accents).
 *
 * Adding a word here is a scientific decision, not an editorial one: if it
 * could tell a reader something about a compound, it belongs in a concept.
 */
const FRAMING: Readonly<Record<Locale, ReadonlySet<string>>> = {
  es: new Set(
    [
      /* articles, prepositions, conjunctions, pronouns */
      "a al como con de del donde e el en es esta la las lo los o para por que se su sus sobre u un una y",
      /* that research happened, and how it is framed */
      "compuesto efecto efectos estudiada estudiado estudiaron examina examino ha investigacion",
      "investigado observo papel relacion reporta usada usado",
    ]
      .join(" ")
      .split(" "),
  ),
  en: new Set(
    [
      "a an and as by for in is it its of on or that the to where which with",
      "compound effect effects examined examines investigated observed relation reports research",
      "role studied used were",
    ]
      .join(" ")
      .split(" "),
  ),
};

/** The sentence must say research happened — never only what a compound does. */
const FRAME: Readonly<Record<Locale, RegExp>> = {
  es: /(estudi|investig|examin|evalu|revis|ensayo|combina|descri)/,
  en: /(studied|studies|study|investigated|examined|examines|evaluated|assessed|review|research|trial|combines|described)/,
};

/**
 * MARKETING, REFUSED. On top of `FORBIDDEN_PUBLIC_TERMS` (which already keeps
 * dosing and administration out): the language of promising a reader an
 * outcome. Matched whole-word, folded, in both locales. Deliberately broad —
 * a summary is the most-read sentence on a product, and the one most likely
 * to drift toward selling.
 */
const PROMOTIONAL: readonly string[] = [
  /* en */
  "help|helps|helping|burn|burns|burning|fat burning|build muscle|builds muscle|muscle building",
  "heal|heals|anti-aging|anti-ageing|antiaging|boost|boosts|boosting|perfect|ideal|best",
  "lose weight|weight loss|slimming|you|your|guaranteed|proven|miracle|recommended|should",
  "benefits|results|rejuvenating|youthful",
  /* es */
  "ayuda|ayudan|quema|quemar|quemador|adelgazar|adelgazante|bajar de peso|perder peso",
  "perdida de peso|antienvejecimiento|anti-envejecimiento|rejuvenece|rejuvenecer|potencia",
  "potenciar|perfecto|perfecta|mejor|tu|tus|usted|garantizado|comprobado|milagro|recomendado",
  "recomendada|debes|beneficios|resultados|juvenil",
]
  .join("|")
  .split("|");

const wordPattern = (phrase: string) =>
  new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^\\p{L}\\p{N}])`,
    "u",
  );

/** The first promotional phrase in the text, or null. */
export function promotionalTermIn(text: string): string | null {
  const folded = fold(text);
  return PROMOTIONAL.find((phrase) => wordPattern(phrase).test(folded)) ?? null;
}

const words = (folded: string) => folded.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const numbers = (text: string) => (text.match(/\d[\d,.]*\d|\d/g) ?? []).sort();

export type StudiedForRule =
  | "empty_text"
  | "too_long"
  | "no_research_frame"
  | "promotional_term"
  | "forbidden_term"
  | "wrong_lineage"
  | "no_concepts"
  | "concept_not_in_text"
  | "statement_unknown"
  | "quote_not_in_statement"
  | "unaccounted_words"
  | "numbers_differ";

export interface StudiedForIssue {
  rule: StudiedForRule;
  locale?: Locale;
  detail?: string;
}

/**
 * Everything wrong with one summary, judged against its own product's
 * statements (by id). Empty means it is well-formed; whether it RENDERS also
 * depends on its status and on every statement it rests on rendering — see
 * `publicStudiedFor`.
 */
export function studiedForIssues(
  entry: StudiedFor,
  statements: ReadonlyMap<string, SourcedStatement>,
): readonly StudiedForIssue[] {
  const issues: StudiedForIssue[] = [];
  const { provenance } = entry;
  if (
    provenance.class !== "derived-copy" ||
    provenance.derivedFrom?.length !== 1 ||
    provenance.derivedFrom[0] !== "scientific-source"
  ) {
    issues.push({ rule: "wrong_lineage" });
  }
  if (entry.concepts.length === 0) issues.push({ rule: "no_concepts" });

  for (const locale of ["es", "en"] as const) {
    const text = entry.text[locale]?.trim() ?? "";
    if (!text) {
      issues.push({ rule: "empty_text", locale });
      continue;
    }
    const folded = fold(text);
    if (words(folded).length > STUDIED_FOR_MAX_WORDS) {
      issues.push({ rule: "too_long", locale, detail: String(words(folded).length) });
    }
    if (!FRAME[locale].test(folded)) issues.push({ rule: "no_research_frame", locale });
    const promo = promotionalTermIn(text);
    if (promo) issues.push({ rule: "promotional_term", locale, detail: promo });
    const forbidden = forbiddenTermIn(text);
    if (forbidden) issues.push({ rule: "forbidden_term", locale, detail: forbidden });

    let rest = folded;
    /* Longest first, so a concept inside another is not taken out of it. */
    const concepts = [...entry.concepts].sort(
      (a, b) => b.says[locale].length - a.says[locale].length,
    );
    for (const concept of concepts) {
      const says = fold(concept.says[locale].trim());
      if (!says || !folded.includes(says)) {
        issues.push({ rule: "concept_not_in_text", locale, detail: concept.says[locale] });
      } else {
        rest = rest.split(says).join(" ");
      }
      const statement = statements.get(concept.statement);
      if (!statement) {
        if (locale === "es") {
          issues.push({ rule: "statement_unknown", detail: concept.statement });
        }
        continue;
      }
      const quote = fold(concept.quote[locale].trim());
      if (!quote || !fold(statement.text[locale]).includes(quote)) {
        issues.push({
          rule: "quote_not_in_statement",
          locale,
          detail: `${concept.statement}: "${concept.quote[locale]}"`,
        });
      }
    }
    const loose = words(rest).filter((w) => !FRAMING[locale].has(w));
    if (loose.length > 0) {
      issues.push({ rule: "unaccounted_words", locale, detail: [...new Set(loose)].join(", ") });
    }
  }

  if (JSON.stringify(numbers(entry.text.es)) !== JSON.stringify(numbers(entry.text.en))) {
    issues.push({ rule: "numbers_differ" });
  }
  return issues;
}
