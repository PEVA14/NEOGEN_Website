import { forbiddenTermIn } from "@/content/lifecycle";

import { effectiveStart, moreAllowance } from "./plan";

import type { AtlasGeneration } from "./schema";
import type { AtlasConstraints, AtlasRetrieval } from "./types";

/**
 * VALIDATION — the output is checked against the catalogue, not trusted.
 *
 * A schema-valid response can still be wrong in every way that matters here: it
 * can name a compound it was not given, send a reader to a route that does not
 * exist, print a price, slip in a dose, or explain what a compound does. Each of
 * those is caught below, and each is a reason to ask the model to correct itself
 * once and, failing that, to fall back to a map composed from the registry
 * alone. Nothing unvalidated reaches a reader.
 */

export const ATLAS_LIMITS = {
  headline: 90,
  summary: 600,
  aboutYou: 420,
  why: 320,
  topicNote: 280,
  stepNote: 200,
  tip: 240,
  stepsMin: 2,
  stepsMax: 5,
  tipsMax: 4,
} as const;

/**
 * CLAIM VOCABULARY — outcomes, effects, indications, bodies, schedules.
 *
 * The public forbidden-terms list (`content/lifecycle`) already refuses dosing
 * and administration language. This extends it for an advisor specifically:
 * anything that would turn "this compound is filed under metabolic research"
 * into "this compound does something for you". Matched on word STARTS after
 * owner-approved area names and candidate names have been removed from the
 * text, so "Desarrollo y rendimiento" (an approved area title) is not a claim
 * while "mejora tu rendimiento" is.
 */
export const ATLAS_CLAIM_TERMS: readonly string[] = [
  // es
  "perdida de peso",
  "perder peso",
  "bajar de peso",
  "adelgaz",
  "quemar",
  "grasa",
  "libido",
  "fertilid",
  "antienvejec",
  "anti-envejec",
  "rejuvenec",
  "curar",
  "sanar",
  "tratar",
  "tratamient",
  "terapi",
  "terapeut",
  "diagnost",
  "enfermedad",
  "sintoma",
  "medicament",
  "receta",
  "prescri",
  "efecto secundario",
  "efectos secundarios",
  "beneficio",
  "eficacia",
  "eficaz",
  "mejora",
  "mejorar",
  "aumenta",
  "reduce",
  "reducir",
  "potencia",
  "rendimiento",
  "musculo",
  "masa muscular",
  "energia",
  "apetito",
  "saciedad",
  "insulina",
  "glucosa",
  "presion arterial",
  "cicatriz",
  "inflamac",
  "dolor",
  "lesion",
  "seguro para",
  "segura para",
  "semana",
  "dieta",
  "suplement",
  // suitability to a person, rather than to a budget or a preference
  "tu cuerpo",
  "tu organismo",
  "tu salud",
  "adecuado para ti",
  "adecuada para ti",
  // en
  "weight loss",
  "lose weight",
  "fat",
  "libido",
  "fertility",
  "anti-aging",
  "antiaging",
  "rejuven",
  "cure",
  "heal",
  "treat",
  "therap",
  "diagnos",
  "disease",
  "symptom",
  "medication",
  "prescri",
  "side effect",
  "benefit",
  "efficacy",
  "effective",
  "improve",
  "boost",
  "enhance",
  "increase",
  "reduce",
  "performance",
  "muscle",
  "energy",
  "appetite",
  "satiety",
  "insulin",
  "glucose",
  "blood pressure",
  "scar",
  "inflammat",
  "pain",
  "injur",
  "safe for",
  "week",
  "diet",
  "supplement",
  "your body",
  "your health",
  "suitable for you",
  "right for your",
];

export type AtlasIssueCode =
  | "unknown_area"
  | "missing_area"
  | "unknown_slug"
  | "unknown_destination"
  | "duplicate"
  | "length"
  | "count"
  | "over_budget"
  | "missing_in_mind"
  | "missing_topic"
  | "misplaced_supply"
  | "forbidden_term"
  | "claim"
  | "invented_figure"
  | "unlisted_product";

export interface AtlasIssue {
  path: string;
  code: AtlasIssueCode;
  detail: string;
}

export interface AtlasValidationContext {
  retrieval: Pick<
    AtlasRetrieval,
    "areas" | "candidates" | "supplies" | "destinations" | "budgetCap"
  >;
  /** The policy's rules for this visitor. */
  constraints: AtlasConstraints;
  /** Every published product, so a name outside the candidate set is caught. */
  catalogue: readonly { slug: string; name: string }[];
  /** Owner-approved area names and framings, in both locales. Never claims. */
  approvedLabels: readonly string[];
}

function fold(text: string): string {
  return text
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const startsWord = (stem: string) => new RegExp(`(^|[^a-z0-9])${escape(stem)}`);
const wholeWord = (word: string) => new RegExp(`(^|[^a-z0-9])${escape(word)}($|[^a-z0-9])`);

/** A figure a model has no business writing: a strength, a percentage, a price. */
const FIGURE_PATTERNS: readonly RegExp[] = [
  /\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|ml|iu|ui|%)(?![a-z])/i,
  /\$\s*\d/,
  /\d[\d.,]*\s*(?:mxn|pesos|usd|dolares|dollars|mil)(?![a-z])/i,
];

/**
 * Screen one string. Allowed names are removed first — longest first, so a
 * product whose name contains another's is stripped whole — and only then is
 * the remainder checked for forbidden terms, claims, figures and names of
 * products the model was never given.
 */
export function screenAtlasText(
  text: string,
  path: string,
  context: AtlasValidationContext,
): AtlasIssue[] {
  const issues: AtlasIssue[] = [];
  const offered = [...context.retrieval.candidates, ...context.retrieval.supplies];
  const allowedSlugs = new Set(offered.map((c) => c.slug));
  const allowedNames = [...offered.map((c) => c.name), ...context.approvedLabels]
    .map(fold)
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length);

  let stripped = fold(text);
  for (const name of allowedNames) stripped = stripped.split(name).join(" ");

  const forbidden = forbiddenTermIn(stripped);
  if (forbidden) issues.push({ path, code: "forbidden_term", detail: forbidden });

  const claim = ATLAS_CLAIM_TERMS.find((stem) => startsWord(fold(stem)).test(stripped));
  if (claim) issues.push({ path, code: "claim", detail: claim });

  if (FIGURE_PATTERNS.some((pattern) => pattern.test(stripped))) {
    issues.push({ path, code: "invented_figure", detail: "strength, percentage or price" });
  }

  const unlisted = context.catalogue.find(
    (product) =>
      !allowedSlugs.has(product.slug) &&
      product.name.length >= 4 &&
      wholeWord(fold(product.name)).test(stripped),
  );
  if (unlisted) issues.push({ path, code: "unlisted_product", detail: unlisted.slug });

  return issues;
}

export function validateAtlasGeneration(
  generation: AtlasGeneration,
  context: AtlasValidationContext,
): AtlasIssue[] {
  const issues: AtlasIssue[] = [];
  const { retrieval, constraints } = context;
  const text = (value: string, path: string, max: number) => {
    if (value.trim().length === 0 || value.length > max) {
      issues.push({ path, code: "length", detail: `1–${max} characters` });
    }
    issues.push(...screenAtlasText(value, path, context));
  };
  const count = (path: string, n: number, min: number, max: number) => {
    if (n < min || n > max) issues.push({ path, code: "count", detail: `${min}–${max}, got ${n}` });
  };

  text(generation.headline, "headline", ATLAS_LIMITS.headline);
  text(generation.summary, "summary", ATLAS_LIMITS.summary);
  text(generation.aboutYou, "aboutYou", ATLAS_LIMITS.aboutYou);

  /* Topics: exactly the visitor's, each once. */
  const topicIds = retrieval.areas.map((a) => a.id as string);
  const seenTopics = new Set<string>();
  generation.topics.forEach((topic, i) => {
    const path = `topics[${i}]`;
    if (!topicIds.includes(topic.areaId)) {
      issues.push({ path, code: "unknown_area", detail: topic.areaId });
    }
    if (seenTopics.has(topic.areaId)) {
      issues.push({ path, code: "duplicate", detail: topic.areaId });
    }
    seenTopics.add(topic.areaId);
    text(topic.note, `${path}.note`, ATLAS_LIMITS.topicNote);
  });
  for (const id of topicIds) {
    if (!seenTopics.has(id)) issues.push({ path: "topics", code: "missing_area", detail: id });
  }

  /* Picks: candidates only in "start"; candidates or supplies in "more"; each once. */
  const candidates = new Map(retrieval.candidates.map((c) => [c.slug, c]));
  const supplies = new Set(retrieval.supplies.map((c) => c.slug));
  const seen = new Set<string>();
  const checkPick =
    (list: "start" | "more") => (entry: { slug: string; why: string }, i: number) => {
      const path = `${list}[${i}]`;
      if (supplies.has(entry.slug)) {
        if (list === "start") issues.push({ path, code: "misplaced_supply", detail: entry.slug });
      } else if (!candidates.has(entry.slug)) {
        issues.push({ path, code: "unknown_slug", detail: entry.slug });
      }
      if (seen.has(entry.slug)) issues.push({ path, code: "duplicate", detail: entry.slug });
      seen.add(entry.slug);
      text(entry.why, `${path}.why`, ATLAS_LIMITS.why);
    };
  generation.start.forEach(checkPick("start"));
  generation.more.forEach(checkPick("more"));

  const available = retrieval.candidates.length;
  const start = effectiveStart(retrieval, constraints);
  count("start", generation.start.length, start.min, constraints.start.max);
  const products = [...generation.start, ...generation.more].filter((p) => !supplies.has(p.slug));
  count(
    "more",
    generation.more.length,
    0,
    moreAllowance(retrieval, constraints) + retrieval.supplies.length,
  );
  count(
    "total",
    products.length,
    Math.min(constraints.total.min, available),
    constraints.total.max,
  );

  /* The start set stays inside the cap, whenever the catalogue allows it. */
  if (retrieval.budgetCap !== null && start.enforceBudget) {
    const sum = generation.start.reduce(
      (total, p) => total + (candidates.get(p.slug)?.suggestedPrice ?? Infinity),
      0,
    );
    if (sum > retrieval.budgetCap) {
      issues.push({
        path: "start",
        code: "over_budget",
        detail: "start picks exceed the cap together",
      });
    }
  }

  if (constraints.includeInMind) {
    for (const c of retrieval.candidates.filter((c) => c.inMind)) {
      if (!seen.has(c.slug))
        issues.push({ path: "start", code: "missing_in_mind", detail: c.slug });
    }
  }
  if (constraints.coverTopics) {
    for (const topic of retrieval.areas) {
      const hasCandidate = retrieval.candidates.some((c) => c.matchedAreas.includes(topic.id));
      const covered = products.some((p) => candidates.get(p.slug)?.matchedAreas.includes(topic.id));
      if (hasCandidate && !covered) {
        issues.push({ path: "more", code: "missing_topic", detail: topic.id });
      }
    }
  }

  /* Next steps: routes that exist, each once. */
  const destinations = new Set(retrieval.destinations.map((d) => d.id));
  count("nextSteps", generation.nextSteps.length, ATLAS_LIMITS.stepsMin, ATLAS_LIMITS.stepsMax);
  const seenSteps = new Set<string>();
  generation.nextSteps.forEach((step, i) => {
    const path = `nextSteps[${i}]`;
    if (!destinations.has(step.destinationId)) {
      issues.push({ path, code: "unknown_destination", detail: step.destinationId });
    }
    if (seenSteps.has(step.destinationId)) {
      issues.push({ path, code: "duplicate", detail: step.destinationId });
    }
    seenSteps.add(step.destinationId);
    text(step.note, `${path}.note`, ATLAS_LIMITS.stepNote);
  });

  count("tips", generation.tips.length, 0, ATLAS_LIMITS.tipsMax);
  generation.tips.forEach((tip, i) => text(tip, `tips[${i}]`, ATLAS_LIMITS.tip));

  return issues;
}
