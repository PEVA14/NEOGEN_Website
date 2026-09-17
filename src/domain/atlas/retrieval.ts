import {
  ATLAS_BUDGET_CAPS,
  type AtlasAnswers,
  type AtlasAreaStat,
  type AtlasCandidate,
  type AtlasDestination,
  type AtlasForm,
  type AtlasRetrieval,
  type AtlasSubject,
} from "./types";

import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * RETRIEVAL — which slice of the catalogue a model is allowed to see.
 *
 * TOKENS FOLLOW RELEVANCE. The whole registry is ~85 compounds; sending all of
 * them to every generation would cost several times what a map needs and give
 * the model eighty ways to be wrong. Retrieval scores the reader's areas,
 * focus, forms and budget against precomputed registry facts and passes on at
 * most `ATLAS_CANDIDATE_LIMIT` compounds. Those candidates are also the ONLY
 * slugs the model may name — the validator rejects anything else.
 *
 * PURE. Subjects arrive precomputed (prices, evidence, references already
 * resolved); nothing here reads a registry, a clock or a price service, which
 * is what lets `check:atlas` drive it with fixtures and with the live
 * catalogue, and assert that different readers get different maps.
 *
 * EVERY SCORE IS A CATALOGUE FACT. Area rank, being filed under more than one
 * chosen area, having an Experience world, having public documentation, entry
 * price against the pool's median. Nothing scores what a compound DOES,
 * because the registry holds no such claim to score.
 */

export const ATLAS_CANDIDATE_LIMIT = 14;
export const ATLAS_MATERIALS_LIMIT = 2;
/** Each chosen area keeps at least this many candidates, if it has them. */
export const ATLAS_PER_AREA_FLOOR = 2;
const RANK_WEIGHT = [3, 2, 1] as const;
const MATERIALS: DiscoveryAreaId = "materials";

export interface AtlasRetrievalDeps {
  /** Public areas sharing compounds with the given area, strongest first. */
  relatedAreas: (area: DiscoveryAreaId) => readonly DiscoveryAreaId[];
  /** Whether the documentation explorer renders at all. */
  publicEvidence: boolean;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function retrieveAtlas(
  answers: AtlasAnswers,
  subjects: readonly AtlasSubject[],
  deps: AtlasRetrievalDeps,
): AtlasRetrieval {
  const cap = ATLAS_BUDGET_CAPS[answers.budget];
  const rankOf = new Map(answers.areas.map((id, index) => [id, index]));

  const pool = subjects.filter((subject) => {
    if (!subject.areas.some((area) => rankOf.has(area))) return false;
    if (answers.forms.length === 0) return true;
    return subject.forms.some((form) => answers.forms.includes(form as AtlasForm));
  });

  const prices = pool
    .map((s) => s.entryPrice)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  const median = prices.length > 0 ? prices[Math.floor((prices.length - 1) / 2)] : null;

  const toCandidate = (subject: AtlasSubject): AtlasCandidate => {
    const matchedAreas = subject.areas
      .filter((area) => rankOf.has(area))
      .sort((a, b) => rankOf.get(a)! - rankOf.get(b)!);
    const bridges = matchedAreas.length > 1;
    const withinBudget =
      cap === null ? null : subject.entryPrice !== null && subject.entryPrice <= cap;

    let score = matchedAreas.reduce((sum, area) => sum + RANK_WEIGHT[rankOf.get(area)!], 0);
    if (bridges) score += answers.focus.includes("bridges") ? 3 : 1;
    if (subject.world !== null) score += answers.focus.includes("flagships") ? 3 : 0.5;
    if (answers.focus.includes("documentation")) {
      score += (subject.documented ? 3 : 0) + (subject.referenceIds.length > 0 ? 1.5 : 0);
    }
    if (
      answers.focus.includes("value") &&
      median !== null &&
      subject.entryPrice !== null &&
      subject.entryPrice <= median
    ) {
      score += 2;
    }
    if (withinBudget === false) score -= 4;

    return { ...subject, score: round(score), matchedAreas, bridges, withinBudget };
  };

  const byScore = pool.map(toCandidate).sort((a, b) => b.score - a.score || a.order - b.order);

  /*
   * THE FLOOR. A primary area with many high-scoring compounds must not crowd
   * a third-ranked area out of the map entirely: the reader chose it. Each area
   * keeps its best few, then the remainder fills by score.
   */
  const chosen = new Map<string, AtlasCandidate>();
  for (const area of answers.areas) {
    for (const candidate of byScore) {
      if (chosen.size >= ATLAS_CANDIDATE_LIMIT) break;
      const held = [...chosen.values()].filter((c) => c.matchedAreas.includes(area)).length;
      if (held >= ATLAS_PER_AREA_FLOOR) break;
      if (candidate.matchedAreas.includes(area)) chosen.set(candidate.slug, candidate);
    }
  }
  for (const candidate of byScore) {
    if (chosen.size >= ATLAS_CANDIDATE_LIMIT) break;
    chosen.set(candidate.slug, candidate);
  }
  const candidates = [...chosen.values()].sort((a, b) => b.score - a.score || a.order - b.order);

  const materials =
    answers.includeMaterials && !rankOf.has(MATERIALS)
      ? subjects
          .filter((s) => s.areas.includes(MATERIALS) && !chosen.has(s.slug))
          .sort((a, b) => a.order - b.order)
          .slice(0, ATLAS_MATERIALS_LIMIT)
          .map((s) => ({
            ...s,
            score: 0,
            matchedAreas: [],
            bridges: false,
            withinBudget: cap === null ? null : s.entryPrice !== null && s.entryPrice <= cap,
          }))
      : [];

  const areas: AtlasAreaStat[] = answers.areas.map((id, rank) => {
    const inArea = subjects.filter((s) => s.areas.includes(id));
    const entry = inArea
      .map((s) => s.entryPrice)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)[0];
    return { id, rank, compounds: inArea.length, entryPrice: entry ?? null };
  });

  const destinations: AtlasDestination[] = answers.areas.map((id) => ({
    id: `area:${id}`,
    kind: "area",
    ref: id,
  }));
  for (const related of deps.relatedAreas(answers.areas[0]).slice(0, 2)) {
    if (!rankOf.has(related))
      destinations.push({ id: `area:${related}`, kind: "area", ref: related });
  }
  const productRefs = [...candidates.slice(0, 4), ...candidates.filter((c) => c.world !== null)];
  for (const candidate of productRefs) {
    if (destinations.filter((d) => d.kind === "product").length >= 5) break;
    if (!destinations.some((d) => d.ref === candidate.slug)) {
      destinations.push({ id: `product:${candidate.slug}`, kind: "product", ref: candidate.slug });
    }
  }
  destinations.push(
    { id: "catalogue", kind: "catalogue", ref: "" },
    { id: "research-index", kind: "research-index", ref: "" },
    { id: "quality-model", kind: "quality-model", ref: "" },
  );
  if (deps.publicEvidence) destinations.push({ id: "explorer", kind: "explorer", ref: "" });

  return {
    areas,
    candidates,
    materials,
    destinations,
    referenceIds: [...new Set(candidates.flatMap((c) => c.referenceIds))],
    budgetCap: cap,
    poolSize: pool.length,
  };
}
