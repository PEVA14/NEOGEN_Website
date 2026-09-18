import type { AtlasPlan } from "./plan";
import type { AtlasGeneration } from "./schema";
import type {
  AtlasCandidate,
  AtlasDestination,
  AtlasExperienceLevel,
  AtlasHorizon,
  AtlasIntent,
  AtlasNarrativeSignals,
  AtlasPriority,
  AtlasRetrieval,
  AtlasSize,
} from "./types";

/**
 * A RESULT WITHOUT A MODEL — composed from the plan and the registry.
 *
 *   development — no API key on a local machine. The whole experience renders
 *                 end to end, LABELLED as a development composition.
 *   catalogue   — production with no key, or a model whose output failed
 *                 validation twice. Labelled as the catalogue view, never
 *                 dressed up as AI.
 *
 * It reads the same narrative signals the model is given (so it can say why a
 * product connects to the visitor's answers) and renders the deterministic
 * plan, producing the same `AtlasGeneration` the model does. It speaks only
 * of what the visitor ANSWERED (`narrative.asked`): a default is never
 * described back to them as their choice. It passes through
 * the same validator, which `check:atlas` proves for every test profile.
 */

export interface AtlasComposeCopy {
  and: string;
  headline: Readonly<Record<AtlasIntent, string>>;
  /** When the visitor was not asked what they want to get done. */
  headlineArea: string;
  /** When no area applies and the catalogue as a whole was the pool. */
  headlineCatalogue: string;
  summary: string;
  summaryNoMore: string;
  reasons: {
    topics: string;
    catalogue: string;
    inMind: string;
    budget: string;
    priorities: Readonly<Record<AtlasPriority, string>>;
  };
  /** One sentence per answered field; only the answered ones are joined. */
  aboutYou: {
    topics: string;
    catalogue: string;
    experience: string;
    intent: string;
    budget: string;
  };
  experience: Readonly<Record<AtlasExperienceLevel, string>>;
  intent: Readonly<Record<AtlasIntent, string>>;
  budgetOpen: string;
  budgetSet: string;
  horizon: Readonly<Record<AtlasHorizon, string>>;
  why: {
    inMind: string;
    policy: string;
    catalogue: string;
    primary: string;
    secondary: string;
    outside: string;
    overlap: string;
    signature: string;
    documented: string;
    undocumented: string;
    value: string;
    fits: string;
    over: string;
    size: Readonly<Record<Exclude<AtlasSize, "no-preference">, string>>;
    supply: string;
  };
  topic: string;
  topicPicked: string;
  path: Readonly<Record<AtlasDestination["kind"], string>>;
  tips: {
    new: string;
    compare: string;
    overTime: string;
    soon: string;
    documentation: string;
    price: string;
  };
}

export interface AtlasComposeInput {
  narrative: AtlasNarrativeSignals;
  retrieval: AtlasRetrieval;
  plan: AtlasPlan;
  topicLabel: (id: string) => string;
  destinationLabel: (destination: AtlasDestination) => string;
  copy: AtlasComposeCopy;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );

function list(items: readonly string[], and: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

const sentence = (text: string) =>
  text.length > 0 ? text[0].toLocaleUpperCase() + text.slice(1) : text;

export function composeAtlasGeneration(input: AtlasComposeInput): AtlasGeneration {
  const { narrative, retrieval, plan, copy, topicLabel, destinationLabel } = input;
  const asked = (field: AtlasNarrativeSignals["asked"][number]) => narrative.asked.includes(field);
  const topicNames = narrative.topics.map(topicLabel);
  const picked = [...plan.start, ...plan.more];
  const listOf = (items: readonly string[]) => list(items, copy.and);

  const entries = retrieval.candidates
    .map((c) => c.entryPrice)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  const median = entries.length > 0 ? entries[Math.floor((entries.length - 1) / 2)] : null;

  const why = (candidate: AtlasCandidate, list: "start" | "more") => {
    const primary = candidate.matchedAreas[0];
    const parts = [
      candidate.pin?.source === "visitor"
        ? copy.why.inMind
        : candidate.pin?.source === "policy"
          ? copy.why.policy
          : null,
      primary === undefined
        ? narrative.topics.length === 0
          ? copy.why.catalogue
          : copy.why.outside
        : fill(primary === narrative.topics[0] ? copy.why.primary : copy.why.secondary, {
            topic: topicLabel(primary),
          }),
      candidate.bridges
        ? fill(copy.why.overlap, {
            topics: listOf(candidate.matchedAreas.map(topicLabel)),
          })
        : null,
      candidate.world !== null ? copy.why.signature : null,
      narrative.priorities.includes("documentation")
        ? candidate.documented
          ? copy.why.documented
          : copy.why.undocumented
        : null,
      narrative.priorities.includes("price") &&
      median !== null &&
      candidate.entryPrice !== null &&
      candidate.entryPrice <= median
        ? copy.why.value
        : null,
      candidate.withinBudget === true && list === "start" ? copy.why.fits : null,
      candidate.withinBudget === false ? copy.why.over : null,
      narrative.size !== "no-preference" && candidate.presentations > 1
        ? copy.why.size[narrative.size]
        : null,
    ];
    return parts.filter((p): p is string => p !== null).join(" ");
  };
  const reasons = [
    narrative.topics.length > 0 ? copy.reasons.topics : copy.reasons.catalogue,
    ...(narrative.pinned.length > 0 ? [copy.reasons.inMind] : []),
    ...narrative.priorities.map((p) => copy.reasons.priorities[p]),
    ...(narrative.budgetCap !== null ? [copy.reasons.budget] : []),
  ];

  const pathOrder: AtlasDestination["kind"][] = [
    "product",
    "area",
    "quality-model",
    "catalogue",
    "research-index",
  ];
  const leadSlug = plan.start[0]?.slug;
  const nextSteps = pathOrder
    .map((kind) =>
      kind === "product"
        ? (retrieval.destinations.find((d) => d.kind === "product" && d.ref === leadSlug) ??
          retrieval.destinations.find((d) => d.kind === "product"))
        : retrieval.destinations.find((d) => d.kind === kind),
    )
    .filter((d): d is AtlasDestination => d !== undefined)
    .slice(0, 4)
    .map((destination) => ({
      destinationId: destination.id,
      note: fill(copy.path[destination.kind], { label: destinationLabel(destination) }),
    }));

  const tips = [
    narrative.experience === "new" ? copy.tips.new : null,
    narrative.intent === "compare" ? copy.tips.compare : null,
    narrative.horizon === "over-time" ? copy.tips.overTime : null,
    narrative.priorities.includes("documentation") ? copy.tips.documentation : null,
    narrative.priorities.includes("price") ? copy.tips.price : null,
    narrative.timing === "soon" ? copy.tips.soon : null,
  ]
    .filter((t): t is string => t !== null)
    .slice(0, 3);

  const names = (items: readonly AtlasCandidate[]) => listOf(items.map((c) => c.name));

  return {
    headline:
      topicNames.length === 0
        ? copy.headlineCatalogue
        : fill(asked("intent") ? copy.headline[narrative.intent] : copy.headlineArea, {
            topic: topicNames[0],
            topics: listOf(topicNames),
          }),
    summary: fill(plan.more.length > 0 ? copy.summary : copy.summaryNoMore, {
      start: names(plan.start),
      more: plan.more.length,
      reasons: listOf(reasons),
    }),
    aboutYou: [
      topicNames.length > 0
        ? fill(copy.aboutYou.topics, { topics: listOf(topicNames) })
        : copy.aboutYou.catalogue,
      asked("experience")
        ? fill(copy.aboutYou.experience, { experience: copy.experience[narrative.experience] })
        : null,
      asked("intent")
        ? fill(copy.aboutYou.intent, { intent: copy.intent[narrative.intent] })
        : null,
      asked("budget")
        ? fill(copy.aboutYou.budget, {
            budget: narrative.budgetCap === null ? copy.budgetOpen : copy.budgetSet,
            horizon: copy.horizon[narrative.horizon],
          })
        : null,
    ]
      .filter((part): part is string => part !== null)
      .map(sentence)
      .join(" "),
    start: plan.start.map((c) => ({
      slug: c.slug,
      why: why(c, "start"),
      evidence: c.evidence.slice(0, 1).map((e) => e.id),
    })),
    more: [
      ...plan.more.map((c) => ({
        slug: c.slug,
        why: why(c, "more"),
        evidence: c.evidence.slice(0, 1).map((e) => e.id),
      })),
      ...retrieval.supplies.map((c) => ({ slug: c.slug, why: copy.why.supply, evidence: [] })),
    ],
    topics: retrieval.areas.map((stat) => {
      const inResult = picked.filter((c) => c.matchedAreas.includes(stat.id)).length;
      return {
        areaId: stat.id,
        note: [
          fill(copy.topic, { count: stat.compounds, topic: topicLabel(stat.id) }),
          inResult > 0 ? fill(copy.topicPicked, { count: inResult }) : null,
        ]
          .filter((p): p is string => p !== null)
          .join(" "),
      };
    }),
    nextSteps,
    tips,
    contextMentionsHealth: false,
  };
}
