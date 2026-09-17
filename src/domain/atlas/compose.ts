import type { AtlasGeneration } from "./schema";
import type { AtlasAnswers, AtlasCandidate, AtlasDestination, AtlasRetrieval } from "./types";

/**
 * A MAP WITHOUT A MODEL — composed from the registry alone.
 *
 * Two jobs, both honest about what they are:
 *
 *   development — no API key on a local machine. The whole experience still
 *                 renders end to end, and the result is LABELLED as a
 *                 development composition wherever it appears.
 *   catalogue   — production with no key, or a model whose output failed
 *                 validation twice. The reader still gets a real map from real
 *                 data, labelled as the catalogue view, never dressed up as AI.
 *
 * It produces the same `AtlasGeneration` the model does and passes through the
 * same validator, so the result page has exactly one shape to render and
 * `check:atlas` can prove the fallback is itself valid.
 */

export interface AtlasComposeCopy {
  and: string;
  title: string;
  summary: string;
  area: string;
  areaBridges: string;
  compoundFiled: string;
  compoundFlagship: string;
  compoundDocumented: string;
  compoundUndocumented: string;
  compoundWithinBudget: string;
  compoundOverBudget: string;
  path: Readonly<Record<AtlasDestination["kind"], string>>;
  noteDevelopment: string;
  noteCatalogue: string;
}

export interface AtlasComposeInput {
  answers: AtlasAnswers;
  retrieval: AtlasRetrieval;
  areaLabel: (id: string) => string;
  destinationLabel: (destination: AtlasDestination) => string;
  copy: AtlasComposeCopy;
  mode: "development" | "catalogue";
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

function list(items: readonly string[], and: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

const MAP_SIZE = 6;
const CORE_SIZE = 3;

/**
 * Which compounds the composed map leads with.
 *
 * WITHIN THE READER'S CAP. With a budget set, the core is filled in score order
 * only while the running total of entry presentations stays inside it — a map
 * whose three core compounds cost more than the reader said they would spend
 * is not a budget-aware map, even if each one fits on its own. If nothing fits,
 * the best-scoring compounds lead anyway and the budget block says so.
 *
 * EVERY CHOSEN AREA APPEARS. Score order can crowd a third-ranked area out of
 * six places; each area the reader chose keeps at least one compound when it
 * has a candidate.
 */
function selectMap(retrieval: AtlasRetrieval, areas: readonly string[]) {
  const ordered = retrieval.candidates;
  const cap = retrieval.budgetCap;

  const core: AtlasCandidate[] = [];
  if (cap === null) {
    core.push(...ordered.slice(0, CORE_SIZE));
  } else {
    let total = 0;
    for (const candidate of ordered) {
      if (core.length >= CORE_SIZE) break;
      if (candidate.entryPrice !== null && total + candidate.entryPrice <= cap) {
        core.push(candidate);
        total += candidate.entryPrice;
      }
    }
    if (core.length === 0) core.push(...ordered.slice(0, Math.min(CORE_SIZE, ordered.length)));
  }

  const rest = ordered.filter((c) => !core.includes(c));
  const chosen = [...core, ...rest.slice(0, MAP_SIZE - core.length)];

  const covers = (c: AtlasCandidate, area: string) => c.matchedAreas.includes(area as never);
  for (const area of areas) {
    if (chosen.some((c) => covers(c, area))) continue;
    const best = rest.find((c) => covers(c, area) && !chosen.includes(c));
    if (!best) continue;
    // Give up the lowest-placed complement that is not some other chosen
    // area's only compound on the map; with none to give up, the map grows.
    let swapAt = -1;
    for (let i = chosen.length - 1; i >= core.length; i--) {
      const sole = areas.some(
        (other) => covers(chosen[i], other) && chosen.filter((c) => covers(c, other)).length === 1,
      );
      if (!sole) {
        swapAt = i;
        break;
      }
    }
    if (swapAt >= 0) chosen[swapAt] = best;
    else chosen.push(best);
  }

  return { chosen, coreCount: core.length };
}

export function composeAtlasGeneration(input: AtlasComposeInput): AtlasGeneration {
  const { answers, retrieval, copy, areaLabel, destinationLabel } = input;
  const areaNames = answers.areas.map(areaLabel);
  const { chosen, coreCount } = selectMap(retrieval, answers.areas);

  const compoundRationale = (candidate: AtlasCandidate) =>
    [
      fill(copy.compoundFiled, { areas: list(candidate.matchedAreas.map(areaLabel), copy.and) }),
      candidate.world !== null ? copy.compoundFlagship : null,
      candidate.documented ? copy.compoundDocumented : copy.compoundUndocumented,
      candidate.withinBudget === true
        ? copy.compoundWithinBudget
        : candidate.withinBudget === false
          ? copy.compoundOverBudget
          : null,
    ]
      .filter((part): part is string => part !== null)
      .join(" ");

  const pathOrder: AtlasDestination["kind"][] = [
    "area",
    "product",
    "research-index",
    "quality-model",
    "catalogue",
  ];
  const path = pathOrder
    .map((kind) => retrieval.destinations.find((d) => d.kind === kind))
    .filter((d): d is AtlasDestination => d !== undefined)
    .slice(0, 4)
    .map((destination) => ({
      destinationId: destination.id,
      note: fill(copy.path[destination.kind], { label: destinationLabel(destination) }),
    }));

  return {
    title: fill(copy.title, { area: areaNames[0] ?? "" }),
    summary: fill(copy.summary, {
      areas: list(areaNames, copy.and),
      pool: retrieval.poolSize,
      count: chosen.length,
    }),
    areas: retrieval.areas.map((stat) => {
      const bridging = retrieval.candidates.filter(
        (c) => c.bridges && c.matchedAreas.includes(stat.id),
      ).length;
      return {
        areaId: stat.id,
        rationale: [
          fill(copy.area, { count: stat.compounds, area: areaLabel(stat.id) }),
          bridging > 0 ? fill(copy.areaBridges, { count: bridging }) : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" "),
      };
    }),
    compounds: chosen.map((candidate, index) => ({
      slug: candidate.slug,
      role: index < coreCount ? ("core" as const) : ("complement" as const),
      rationale: compoundRationale(candidate),
    })),
    path,
    notes: [input.mode === "development" ? copy.noteDevelopment : copy.noteCatalogue],
    contextMentionsHealth: false,
  };
}
