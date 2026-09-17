import type { AtlasCandidate, AtlasConstraints, AtlasRetrieval } from "./types";

/**
 * THE DETERMINISTIC PLAN — what the policy's constraints produce with no model.
 *
 * Two uses. The composer (no key, or a model that failed validation) renders
 * this plan directly. And the validator asks one question of it: is keeping
 * the "start here" set inside the budget POSSIBLE for this retrieval? A model
 * is only held to a budget the catalogue can meet.
 */

export interface AtlasPlan {
  start: readonly AtlasCandidate[];
  more: readonly AtlasCandidate[];
}

const priceOf = (c: AtlasCandidate) => c.suggestedPrice;

/**
 * How many "start here" picks this retrieval must carry, and whether they must
 * fit the cap together.
 *
 * The policy asks for a minimum; the catalogue may not allow it inside the
 * cap. Then the minimum shrinks to what fits (never below one) and the budget
 * is still enforced. Only when not even one presentation fits is the budget
 * released — and the result's budget block says so.
 */
export function effectiveStart(
  retrieval: Pick<AtlasRetrieval, "candidates" | "budgetCap">,
  constraints: AtlasConstraints,
): { min: number; enforceBudget: boolean } {
  const n = retrieval.candidates.length;
  const cap = retrieval.budgetCap;
  if (cap === null || !constraints.startWithinBudget) {
    return { min: Math.min(constraints.start.min, n), enforceBudget: false };
  }
  const cheapest = retrieval.candidates
    .map(priceOf)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);
  let fits = 0;
  let total = 0;
  for (const price of cheapest) {
    if (fits >= constraints.start.min || total + price > cap) break;
    total += price;
    fits += 1;
  }
  return fits > 0
    ? { min: fits, enforceBudget: true }
    : { min: Math.min(1, n), enforceBudget: false };
}

/**
 * The most "more" picks a result may carry: the policy's maximum, stretched
 * only as far as required picks (named products, uncovered topics) need.
 */
export function moreAllowance(
  retrieval: Pick<AtlasRetrieval, "candidates" | "areas">,
  constraints: AtlasConstraints,
): number {
  const required =
    (constraints.includeInMind ? retrieval.candidates.filter((c) => c.inMind).length : 0) +
    (constraints.coverTopics ? retrieval.areas.length : 0);
  return Math.max(constraints.more.max, Math.min(required, constraints.total.max - 1));
}

export function planAtlas(
  retrieval: Pick<AtlasRetrieval, "candidates" | "budgetCap" | "areas">,
  constraints: AtlasConstraints,
): AtlasPlan {
  const ordered = retrieval.candidates;
  const cap = retrieval.budgetCap;
  const topics = retrieval.areas.map((a) => a.id);

  /* START: named products first, then by score, while the running total fits. */
  const { min: startMin, enforceBudget } = effectiveStart(retrieval, constraints);
  const fill = (order: readonly AtlasCandidate[]) => {
    const picked: AtlasCandidate[] = [];
    let total = 0;
    for (const candidate of order) {
      if (picked.length >= constraints.start.max) break;
      const price = priceOf(candidate);
      if (enforceBudget && (price === null || total + price > cap!)) continue;
      picked.push(candidate);
      total += price ?? 0;
    }
    return picked;
  };
  const byScore = [...ordered.filter((c) => c.inMind), ...ordered.filter((c) => !c.inMind)];
  let start = fill(byScore);
  /* An expensive first pick can crowd out the minimum: start from the cheapest instead. */
  if (start.length < startMin) {
    start = fill(
      [...ordered].sort(
        (a, b) => (priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity) || b.score - a.score,
      ),
    ).sort((a, b) => b.score - a.score);
  }
  for (const candidate of ordered) {
    if (start.length >= startMin) break;
    if (!start.includes(candidate)) start.push(candidate);
  }

  /* MORE: named products left over, uncovered topics, then by score. */
  const rest = ordered.filter((c) => !start.includes(c));
  const byPreference = constraints.moreWithinBudgetFirst
    ? [
        ...rest.filter((c) => c.withinBudget !== false),
        ...rest.filter((c) => c.withinBudget === false),
      ]
    : rest;

  const more: AtlasCandidate[] = byPreference.filter((c) => c.inMind);
  const chosen = () => [...start, ...more];
  if (constraints.coverTopics) {
    for (const topic of topics) {
      if (chosen().some((c) => c.matchedAreas.includes(topic))) continue;
      const best = byPreference.find((c) => c.matchedAreas.includes(topic) && !more.includes(c));
      if (best) more.push(best);
    }
  }
  const moreMax = moreAllowance(retrieval, constraints);
  const wanted = Math.max(constraints.total.min - start.length, constraints.more.min);
  for (const candidate of byPreference) {
    if (more.length >= moreMax) break;
    if (more.includes(candidate)) continue;
    // Stop at the minimum a result needs, unless the policy allows more and
    // the candidate is a strong one (in the top half of the scores).
    const strong = candidate.score >= (ordered[Math.floor(ordered.length / 2)]?.score ?? 0);
    if (more.length >= wanted && !strong) break;
    more.push(candidate);
  }

  return { start, more: more.slice(0, Math.min(moreMax, constraints.total.max - start.length)) };
}
