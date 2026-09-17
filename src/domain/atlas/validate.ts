import { forbiddenTermIn } from "@/content/lifecycle";

import type { AtlasGeneration } from "./schema";
import type { AtlasAnswers, AtlasRetrieval } from "./types";

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
  title: 90,
  summary: 720,
  rationale: 300,
  pathNote: 200,
  note: 240,
  compoundsMin: 3,
  compoundsMax: 8,
  pathMin: 2,
  pathMax: 5,
  notesMax: 4,
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
];

export type AtlasIssueCode =
  | "unknown_area"
  | "missing_area"
  | "unknown_slug"
  | "unknown_destination"
  | "duplicate"
  | "length"
  | "count"
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
  answers: Pick<AtlasAnswers, "areas">;
  retrieval: Pick<AtlasRetrieval, "candidates" | "materials" | "destinations">;
  /** Every published compound, so a name outside the candidate set is caught. */
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
  /\d[\d.,]*\s*(?:mxn|pesos|usd|dolares|dollars)(?![a-z])/i,
];

/**
 * Screen one string. Allowed names are removed first — longest first, so a
 * compound whose name contains another's is stripped whole — and only then is
 * the remainder checked for forbidden terms, claims, figures and names of
 * compounds the model was never given.
 */
export function screenAtlasText(
  text: string,
  path: string,
  context: AtlasValidationContext,
): AtlasIssue[] {
  const issues: AtlasIssue[] = [];
  const allowedSlugs = new Set([
    ...context.retrieval.candidates.map((c) => c.slug),
    ...context.retrieval.materials.map((c) => c.slug),
  ]);
  const allowedNames = [
    ...context.retrieval.candidates.map((c) => c.name),
    ...context.retrieval.materials.map((c) => c.name),
    ...context.approvedLabels,
  ]
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
  const { answers, retrieval } = context;
  const text = (value: string, path: string, max: number) => {
    if (value.trim().length === 0 || value.length > max) {
      issues.push({ path, code: "length", detail: `1–${max} characters` });
    }
    issues.push(...screenAtlasText(value, path, context));
  };

  text(generation.title, "title", ATLAS_LIMITS.title);
  text(generation.summary, "summary", ATLAS_LIMITS.summary);

  /* Areas: exactly the reader's, each once. */
  const seenAreas = new Set<string>();
  generation.areas.forEach((area, i) => {
    const path = `areas[${i}]`;
    if (!answers.areas.includes(area.areaId as never)) {
      issues.push({ path, code: "unknown_area", detail: area.areaId });
    }
    if (seenAreas.has(area.areaId)) issues.push({ path, code: "duplicate", detail: area.areaId });
    seenAreas.add(area.areaId);
    text(area.rationale, `${path}.rationale`, ATLAS_LIMITS.rationale);
  });
  for (const id of answers.areas) {
    if (!seenAreas.has(id)) issues.push({ path: "areas", code: "missing_area", detail: id });
  }

  /* Compounds: candidates and offered materials only. */
  const allowed = new Set([
    ...retrieval.candidates.map((c) => c.slug),
    ...retrieval.materials.map((c) => c.slug),
  ]);
  const min = Math.min(ATLAS_LIMITS.compoundsMin, retrieval.candidates.length);
  if (
    generation.compounds.length < min ||
    generation.compounds.length > ATLAS_LIMITS.compoundsMax
  ) {
    issues.push({
      path: "compounds",
      code: "count",
      detail: `${min}–${ATLAS_LIMITS.compoundsMax}, got ${generation.compounds.length}`,
    });
  }
  const seenSlugs = new Set<string>();
  generation.compounds.forEach((compound, i) => {
    const path = `compounds[${i}]`;
    if (!allowed.has(compound.slug))
      issues.push({ path, code: "unknown_slug", detail: compound.slug });
    if (seenSlugs.has(compound.slug))
      issues.push({ path, code: "duplicate", detail: compound.slug });
    seenSlugs.add(compound.slug);
    text(compound.rationale, `${path}.rationale`, ATLAS_LIMITS.rationale);
  });

  /* Path: routes that exist, each once. */
  const destinations = new Set(retrieval.destinations.map((d) => d.id));
  if (
    generation.path.length < ATLAS_LIMITS.pathMin ||
    generation.path.length > ATLAS_LIMITS.pathMax
  ) {
    issues.push({
      path: "path",
      code: "count",
      detail: `${ATLAS_LIMITS.pathMin}–${ATLAS_LIMITS.pathMax}, got ${generation.path.length}`,
    });
  }
  const seenSteps = new Set<string>();
  generation.path.forEach((step, i) => {
    const path = `path[${i}]`;
    if (!destinations.has(step.destinationId)) {
      issues.push({ path, code: "unknown_destination", detail: step.destinationId });
    }
    if (seenSteps.has(step.destinationId)) {
      issues.push({ path, code: "duplicate", detail: step.destinationId });
    }
    seenSteps.add(step.destinationId);
    text(step.note, `${path}.note`, ATLAS_LIMITS.pathNote);
  });

  if (generation.notes.length > ATLAS_LIMITS.notesMax) {
    issues.push({ path: "notes", code: "count", detail: `at most ${ATLAS_LIMITS.notesMax}` });
  }
  generation.notes.forEach((note, i) => text(note, `notes[${i}]`, ATLAS_LIMITS.note));

  return issues;
}
