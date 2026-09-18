import type {
  AtlasAreaStat,
  AtlasCandidate,
  AtlasDestination,
  AtlasEvidenceRef,
  AtlasForm,
  AtlasReason,
  AtlasRelevance,
  AtlasRetrieval,
  AtlasSelectionSignals,
  AtlasSubject,
  AtlasSubjectVariant,
} from "./types";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * RETRIEVAL — which slice of the catalogue a model is allowed to see.
 *
 * IT READS SIGNALS, NOT A PROFILE. Every weight, filter and size here arrives
 * from `applyAtlasPolicy`; this file only applies them to registry facts. It
 * has no idea what the visitor said, and no way to be told anything the policy
 * did not release.
 *
 * TOKENS FOLLOW RELEVANCE. At most `ATLAS_CANDIDATE_LIMIT` products (plus the
 * pinned ones) are passed on, and those are the ONLY slugs the model may name.
 *
 * EVERY CANDIDATE ARRIVES EXPLAINED. Its structured reasons, its relevance and
 * its evidence (approved statement ids, the ones backing the visitor's research
 * functions first) are computed here from registry facts, so the result can
 * say why a product is there without asking a model to make that up.
 *
 * NO AREA, NO FUNCTION, NO PIN: the whole catalogue (supplies aside) is the
 * pool, ranked by the facts that need no topic — signature line,
 * documentation, value.
 *
 * PURE. Subjects arrive precomputed, so `check:atlas` drives this with the
 * live catalogue and asserts that different visitors get different results.
 */

export const ATLAS_CANDIDATE_LIMIT = 14;
export const ATLAS_SUPPLIES_LIMIT = 2;
const SUPPLIES: DiscoveryAreaId = "materials";

export interface AtlasRetrievalDeps {
  /** Public areas sharing products with the given area, strongest first. */
  relatedAreas: (area: DiscoveryAreaId) => readonly DiscoveryAreaId[];
  /** Whether the documentation explorer renders at all. */
  publicEvidence: boolean;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** The presentation to put forward: the entry one, or the largest the cap allows. */
export function suggestVariant(
  variants: readonly AtlasSubjectVariant[],
  mode: AtlasSelectionSignals["variant"],
  cap: number | null,
): AtlasSubjectVariant | null {
  const priced = variants
    .filter((v): v is AtlasSubjectVariant & { price: number } => v.price !== null)
    .sort((a, b) => a.price - b.price);
  if (priced.length === 0) return null;
  if (mode === "entry") return priced[0];
  const fitting = cap === null ? priced : priced.filter((v) => v.price <= cap);
  return fitting.length > 0 ? fitting[fitting.length - 1] : priced[0];
}

const PENDING: AtlasRelevance = { rank: 0, score: 0, tier: "supporting" };

/**
 * Statements backing a chosen research function first, then the rest in the
 * overview's own order. That ordering IS research-context retrieval: the
 * visitor's functions decide which approved finding a card leads with.
 */
function evidenceFor(
  evidence: readonly AtlasEvidenceRef[],
  functions: AtlasSelectionSignals["functions"],
): readonly AtlasEvidenceRef[] {
  const backs = (e: AtlasEvidenceRef) => e.functions.some((id) => functions.includes(id));
  return [...evidence.filter(backs), ...evidence.filter((e) => !backs(e))];
}

/** Pinned products lead; otherwise the share of the top score decides the tier. */
function relevanceOf(candidate: AtlasCandidate, index: number, top: number): AtlasRelevance {
  const share = top > 0 ? candidate.score / top : 0;
  return {
    rank: index + 1,
    score: candidate.score,
    tier: candidate.pin || share >= 0.75 ? "primary" : share >= 0.4 ? "secondary" : "supporting",
  };
}

export function retrieveAtlas(
  signals: AtlasSelectionSignals,
  subjects: readonly AtlasSubject[],
  deps: AtlasRetrievalDeps,
): AtlasRetrieval {
  const { weights } = signals;
  const cap = signals.budgetCap;
  const rankOf = new Map(signals.topics.map((id, index) => [id, index]));
  const pinOf = new Map(signals.pinned.map((pin) => [pin.slug, pin]));
  const catalogueWide =
    signals.topics.length === 0 && signals.functions.length === 0 && signals.pinned.length === 0;
  const functionsOf = (subject: AtlasSubject) =>
    signals.functions.filter((id) => subject.functions.includes(id));

  const matchesForm = (subject: AtlasSubject) =>
    signals.forms.length === 0 ||
    subject.forms.some((form) => signals.forms.includes(form as AtlasForm));

  /*
   * A pinned product is always considered, whatever its area or form. A
   * product publicly tagged with a chosen research function is considered
   * whatever its area — the function is the more specific answer.
   */
  const pool = subjects.filter(
    (subject) =>
      pinOf.has(subject.slug) ||
      ((catalogueWide
        ? subject.areas.some((area) => area !== SUPPLIES)
        : subject.areas.some((area) => rankOf.has(area)) || functionsOf(subject).length > 0) &&
        matchesForm(subject)),
  );

  const entries = pool
    .map((s) => s.entryPrice)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  const median = entries.length > 0 ? entries[Math.floor((entries.length - 1) / 2)] : null;

  const toCandidate = (subject: AtlasSubject): AtlasCandidate => {
    const matchedAreas = subject.areas
      .filter((area) => rankOf.has(area))
      .sort((a, b) => rankOf.get(a)! - rankOf.get(b)!);
    const bridges = matchedAreas.length > 1;
    const matchedFunctions = functionsOf(subject);
    const suggested = suggestVariant(subject.variants, signals.variant, cap);
    const suggestedPrice = suggested?.price ?? null;
    const withinBudget = cap === null ? null : suggestedPrice !== null && suggestedPrice <= cap;
    const available =
      suggested?.availability == null ? null : suggested.availability !== "unavailable";
    const pin = pinOf.get(subject.slug) ?? null;
    const valued = median !== null && subject.entryPrice !== null && subject.entryPrice <= median;

    let score = matchedAreas.reduce(
      (sum, area) => sum + (weights.topic[rankOf.get(area)!] ?? 0),
      0,
    );
    if (pin) score += weights.pinned;
    score += weights.function * matchedFunctions.length;
    if (bridges) score += weights.overlap;
    if (subject.world !== null) score += weights.signature;
    if (subject.documented) score += weights.documented;
    if (subject.referenceIds.length > 0) score += weights.referenced;
    if (valued) score += weights.value;
    if (withinBudget === false) score += weights.overBudget;
    if (subject.forms.length > 0 && subject.forms.every((f) => f === "blend")) {
      score += weights.blend;
    }
    score += weights.range * Math.min(Math.max(subject.presentations - 1, 0), 2);
    if (available === false) score += weights.unavailable;

    /* The same facts as the score, as reasons — heaviest first. */
    const reasons: AtlasReason[] = [
      ...(pin
        ? [
            {
              code: pin.source === "visitor" ? "named-by-visitor" : "policy-pin",
              ref: null,
            } as const,
          ]
        : []),
      ...matchedFunctions.map((id) => ({ code: "function-match" as const, ref: id })),
      ...matchedAreas.map((id) => ({ code: "area-match" as const, ref: id })),
      ...(catalogueWide ? [{ code: "catalogue-wide" as const, ref: null }] : []),
      ...(bridges ? [{ code: "spans-areas" as const, ref: null }] : []),
      ...(subject.world !== null ? [{ code: "signature" as const, ref: null }] : []),
      ...(subject.documented ? [{ code: "documented" as const, ref: null }] : []),
      ...(subject.referenceIds.length > 0 ? [{ code: "referenced" as const, ref: null }] : []),
      ...(valued ? [{ code: "value" as const, ref: null }] : []),
      ...(withinBudget === true ? [{ code: "within-budget" as const, ref: null }] : []),
      ...(withinBudget === false ? [{ code: "over-budget" as const, ref: null }] : []),
      ...(available === false ? [{ code: "unavailable" as const, ref: null }] : []),
    ];

    return {
      ...subject,
      score: round(score),
      matchedAreas,
      bridges,
      matchedFunctions,
      pin,
      reasons,
      evidence: evidenceFor(subject.evidence, signals.functions),
      relevance: PENDING,
      suggestedVariantId: suggested?.id ?? null,
      suggestedPrice,
      withinBudget,
      available,
    };
  };

  const byScore = pool.map(toCandidate).sort((a, b) => b.score - a.score || a.order - b.order);

  /*
   * Pinned products first, then each topic's floor, then the rest by score —
   * so a crowded primary topic cannot push a chosen third topic out entirely.
   */
  const chosen = new Map<string, AtlasCandidate>();
  for (const candidate of byScore) if (candidate.pin) chosen.set(candidate.slug, candidate);
  /* Every chosen research function keeps its strongest product. */
  for (const id of signals.functions) {
    if (chosen.size >= ATLAS_CANDIDATE_LIMIT) break;
    if ([...chosen.values()].some((c) => c.matchedFunctions.includes(id))) continue;
    const best = byScore.find((c) => c.matchedFunctions.includes(id));
    if (best) chosen.set(best.slug, best);
  }
  for (const area of signals.topics) {
    for (const candidate of byScore) {
      if (chosen.size >= ATLAS_CANDIDATE_LIMIT) break;
      const held = [...chosen.values()].filter((c) => c.matchedAreas.includes(area)).length;
      if (held >= signals.perTopicFloor) break;
      if (candidate.matchedAreas.includes(area)) chosen.set(candidate.slug, candidate);
    }
  }
  for (const candidate of byScore) {
    if (chosen.size >= ATLAS_CANDIDATE_LIMIT) break;
    chosen.set(candidate.slug, candidate);
  }
  const ranked = [...chosen.values()].sort((a, b) => b.score - a.score || a.order - b.order);
  const top = ranked[0]?.score ?? 0;
  const candidates = ranked.map((candidate, index) => ({
    ...candidate,
    relevance: relevanceOf(candidate, index, top),
  }));

  const supplies =
    signals.includeSupplies && !rankOf.has(SUPPLIES)
      ? subjects
          .filter((s) => s.areas.includes(SUPPLIES) && !chosen.has(s.slug))
          .sort((a, b) => a.order - b.order)
          .slice(0, ATLAS_SUPPLIES_LIMIT)
          .map((s) => {
            const suggested = suggestVariant(s.variants, "entry", cap);
            return {
              ...s,
              score: 0,
              matchedAreas: [],
              bridges: false,
              matchedFunctions: [],
              pin: null,
              reasons: [],
              evidence: [],
              relevance: { rank: 0, score: 0, tier: "supporting" as const },
              suggestedVariantId: suggested?.id ?? null,
              suggestedPrice: suggested?.price ?? null,
              withinBudget:
                cap === null ? null : suggested?.price != null && suggested.price <= cap,
              available:
                suggested?.availability == null ? null : suggested.availability !== "unavailable",
            };
          })
      : [];

  const areas: AtlasAreaStat[] = signals.topics.map((id, rank) => {
    const inArea = subjects.filter((s) => s.areas.includes(id));
    const entry = inArea
      .map((s) => s.entryPrice)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b)[0];
    return { id, rank, compounds: inArea.length, entryPrice: entry ?? null };
  });

  const destinations: AtlasDestination[] = signals.topics.map((id) => ({
    id: `area:${id}`,
    kind: "area",
    ref: id,
  }));
  const neighbours = signals.topics.length > 0 ? deps.relatedAreas(signals.topics[0]) : [];
  for (const related of neighbours.slice(0, 2)) {
    if (!rankOf.has(related)) {
      destinations.push({ id: `area:${related}`, kind: "area", ref: related });
    }
  }
  const productRefs = [
    ...candidates.filter((c) => c.pin),
    ...candidates.slice(0, 4),
    ...candidates.filter((c) => c.world !== null),
  ];
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
    supplies,
    destinations,
    referenceIds: [...new Set(candidates.flatMap((c) => c.referenceIds))],
    budgetCap: cap,
    poolSize: pool.length,
  };
}
