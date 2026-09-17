/**
 * check:atlas — NEOGEN Atlas, proved against fixtures and the live catalogue.
 *
 * What this gate guarantees, each with a negative control so it can fail:
 *
 *   PROFILE       the questionnaire parser rejects out-of-vocabulary input.
 *   POLICY        is granular: a health note is withheld without weakening any
 *                 other answer; the name never reaches the model; presentation-
 *                 only answers cannot move selection, and selection answers do.
 *   ISOLATION     nothing downstream of the policy reads the profile.
 *   RETRIEVAL     candidates follow the signals (topics, forms, named products,
 *                 floors) and four substantially different real profiles
 *                 retrieve DIFFERENT products.
 *   PLAN          the no-model result validates in both locales, keeps "start
 *                 here" inside the budget, includes named products and covers
 *                 topics when the policy asks.
 *   VALIDATION    invented slugs, broken constraints, claims, suitability to a
 *                 person, figures, dosing vocabulary, unlisted products and
 *                 unknown destinations are refused; approved names are not.
 *   ADAPTER       the Anthropic request shape and every failure mode, offline.
 */

import { readFileSync } from "node:fs";

import { parseAtlasProfile } from "../src/domain/atlas/profile.ts";
import { applyAtlasPolicy } from "../src/domain/atlas/policy.ts";
import { ATLAS_CANDIDATE_LIMIT, retrieveAtlas } from "../src/domain/atlas/retrieval.ts";
import { effectiveStart, planAtlas } from "../src/domain/atlas/plan.ts";
import { atlasSubjectsFrom } from "../src/domain/atlas/subjects.ts";
import { composeAtlasGeneration } from "../src/domain/atlas/compose.ts";
import { validateAtlasGeneration } from "../src/domain/atlas/validate.ts";
import { referencesForProduct } from "../src/content/research.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";
import { getAvailability, getPrices } from "../src/data/commerce/index.ts";
import { publicAreas, publicAreasFor } from "../src/data/discovery/index.ts";
import { relatedAreas } from "../src/domain/discovery/index.ts";
import { publicEvidenceIndex } from "../src/domain/quality/index.ts";
import es from "../src/i18n/dictionaries/es.ts";
import en from "../src/i18n/dictionaries/en.ts";

const failures = [];
const check = (condition, what, detail = "") => {
  if (!condition) failures.push(`${what}${detail ? `: ${detail}` : ""}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const vocabulary = {
  topics: publicAreas().map((a) => a.id),
  products: publishedProducts.map((p) => p.slug),
};
const raw = (overrides) => ({
  topics: ["metabolic"],
  intent: "first-order",
  inMind: [],
  firstName: "",
  experience: "some",
  history: "first-time",
  priorities: [],
  style: "direct",
  forms: [],
  size: "no-preference",
  includeSupplies: false,
  budget: "open",
  horizon: "one-order",
  timing: "no-rush",
  note: "",
  ...overrides,
});
const profileOf = (overrides) => {
  const parsed = parseAtlasProfile(raw(overrides), vocabulary);
  if (!parsed.ok) throw new Error(`fixture does not parse: ${parsed.issues.join("; ")}`);
  return parsed.profile;
};

/* ---- profile ------------------------------------------------------------- */
{
  check(parseAtlasProfile(raw({}), vocabulary).ok, "a valid questionnaire parses");
  for (const [label, input] of [
    ["unknown topic", raw({ topics: ["astrology"] })],
    ["four topics", raw({ topics: vocabulary.topics.slice(0, 4) })],
    ["repeated topic", raw({ topics: ["metabolic", "metabolic"] })],
    ["no topic", raw({ topics: [] })],
    ["unknown intent", raw({ intent: "dose" })],
    ["unknown product in mind", raw({ inMind: ["invented-compound"] })],
    ["four products in mind", raw({ inMind: vocabulary.products.slice(0, 4) })],
    ["three priorities", raw({ priorities: ["documentation", "price", "signature"] })],
    ["unknown form", raw({ forms: ["capsule"] })],
    ["unknown size", raw({ size: "huge" })],
    ["unknown budget", raw({ budget: "unlimited" })],
    ["non-boolean supplies", raw({ includeSupplies: "yes" })],
    ["a non-string name", raw({ firstName: 42 })],
    ["body not an object", null],
  ]) {
    check(!parseAtlasProfile(input, vocabulary).ok, `the parser rejects ${label}`);
  }
}

/* ---- policy: granular, and the name stays on the page --------------------- */
{
  const base = profileOf({ topics: ["skin"], budget: "20k", priorities: ["price"] });
  const baseDecision = applyAtlasPolicy(base);

  for (const note of [
    "Tengo diabetes y tomo metformina",
    "¿Qué dosis debería usar?",
    "I have high blood pressure",
    "Peso 92 kg y quiero bajar de peso",
    "for personal use before the gym",
  ]) {
    const decision = applyAtlasPolicy({ ...base, note });
    const entry = decision.ledger.find((e) => e.field === "note");
    check(
      decision.noteDiscarded && decision.narrative.note === null,
      "a note with health detail is withheld from the model",
      note,
    );
    check(
      entry?.withheld === "health-note" && entry.uses.length === 0,
      "the ledger records the withheld note",
      note,
    );
    check(
      same(decision.selection, baseDecision.selection) &&
        same(decision.constraints, baseDecision.constraints) &&
        same({ ...decision.narrative, note: null }, { ...baseDecision.narrative, note: null }),
      "withholding a note weakens nothing else (granular, not global)",
      note,
    );
  }
  for (const note of [
    "Quiero empezar con algo de la línea insignia y seguir después",
    "Quiero empezar con la línea insignia y dejar lo demás para mi siguiente pedido.",
    "Me interesa comparar precios antes de mi primera compra",
    "Tengo un presupuesto de 20 mil pesos para el trimestre",
    "I'd like to build a set across two topics over a few orders",
  ]) {
    const decision = applyAtlasPolicy({ ...base, note });
    check(
      !decision.noteDiscarded && decision.narrative.note === note,
      "an ordinary note reaches the model (negative control)",
      note,
    );
  }

  const named = applyAtlasPolicy({ ...base, firstName: "Mariana" });
  check(
    !JSON.stringify(named.narrative).includes("Mariana") &&
      !JSON.stringify(named.selection).includes("Mariana"),
    "the name never reaches the model or selection",
  );
  check(named.presentation.firstName === "Mariana", "the name personalises the page");
  check(
    named.ledger.find((e) => e.field === "firstName")?.withheld === "name-private",
    "the ledger says the name stays private",
  );

  /* Presentation-only answers cannot move selection… */
  for (const [label, patch] of [
    ["name", { firstName: "Mariana" }],
    ["history", { history: "returning" }],
    ["style", { style: "detailed" }],
  ]) {
    const decision = applyAtlasPolicy({ ...base, ...patch });
    check(
      same(decision.selection, baseDecision.selection) &&
        same(decision.constraints, baseDecision.constraints),
      "a presentation-only answer does not change selection",
      label,
    );
  }
  /* …and selection answers do. */
  for (const [label, patch] of [
    ["intent", { intent: "compare" }],
    ["experience", { experience: "new" }],
    ["priorities", { priorities: ["documentation"] }],
    ["size", { size: "largest" }],
    ["budget", { budget: "8k" }],
    ["horizon", { horizon: "over-time" }],
    ["timing", { timing: "soon" }],
    ["products in mind", { inMind: [vocabulary.products[0]] }],
  ]) {
    const decision = applyAtlasPolicy({ ...base, ...patch });
    check(
      !same(decision.selection, baseDecision.selection) ||
        !same(decision.constraints, baseDecision.constraints),
      "a selection answer changes selection or constraints",
      label,
    );
  }
}

/* ---- isolation: nothing downstream reads the profile ---------------------- */
for (const file of [
  "src/domain/atlas/retrieval.ts",
  "src/domain/atlas/plan.ts",
  "src/domain/atlas/compose.ts",
  "src/domain/atlas/validate.ts",
  "src/server/atlas/prompt.ts",
  "src/server/atlas/assemble.ts",
  "src/components/atlas/AtlasResult.tsx",
  "src/components/atlas/AtlasMap.tsx",
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  check(
    !/\bAtlasProfile\b|parseAtlasProfile|from "\.\/profile"/.test(source),
    "only the policy (and the request entry points) read the profile",
    file,
  );
}
for (const file of [
  "src/components/atlas/AtlasExperience.tsx",
  "src/components/atlas/AtlasResult.tsx",
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  check(
    !/domain\/atlas\/(policy|retrieval|plan|validate|compose)/.test(source),
    "the UI contains no recommendation rule",
    file,
  );
}

/* ---- retrieval, against the live catalogue -------------------------------- */
const variantIds = publishedProducts.flatMap((p) => p.variants.map((v) => v.id));
const [prices, availability] = await Promise.all([
  getPrices(variantIds),
  getAvailability(variantIds),
]);
const subjects = atlasSubjectsFrom(publishedProducts, {
  price: (id) => prices.get(id)?.amount ?? null,
  availability: (id) => availability.get(id) ?? null,
  areas: (slug) => publicAreasFor(slug).map((a) => a.id),
  documented: (product) => publicEvidenceIndex([product]).length > 0,
  references: (slug) => referencesForProduct(slug).map((r) => r.id),
});
const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
const deps = { relatedAreas: (id) => relatedAreas(id).map((r) => r.area.id), publicEvidence };

const outsideSkin = subjects.find(
  (s) => !s.areas.includes("longevity") && !s.areas.includes("metabolic") && s.entryPrice !== null,
);

const PROFILES = {
  firstOrderNewcomer: profileOf({
    topics: ["metabolic"],
    intent: "first-order",
    experience: "new",
    priorities: ["signature"],
    size: "smallest",
    budget: "8k",
  }),
  compareSkinValue: profileOf({
    topics: ["skin", "neuro"],
    intent: "compare",
    priorities: ["price"],
    forms: ["solid"],
    budget: "20k",
  }),
  coverTopicsExperienced: profileOf({
    topics: ["recovery", "growth", "hormonal"],
    intent: "cover-topics",
    experience: "experienced",
    priorities: ["documentation", "overlap"],
    size: "largest",
    includeSupplies: true,
    budget: "40k",
    horizon: "over-time",
  }),
  deepenWithProductInMind: profileOf({
    topics: ["longevity", "metabolic"],
    intent: "deepen",
    inMind: outsideSkin ? [outsideSkin.slug] : [],
    timing: "soon",
    style: "detailed",
  }),
};

const runs = {};
for (const [name, profile] of Object.entries(PROFILES)) {
  const decision = applyAtlasPolicy(profile);
  const retrieval = retrieveAtlas(decision.selection, subjects, deps);
  const plan = planAtlas(retrieval, decision.constraints);
  runs[name] = { profile, decision, retrieval, plan };
  const { selection } = decision;

  check(retrieval.candidates.length > 0, "a real profile retrieves candidates", name);
  check(
    retrieval.candidates.length <= ATLAS_CANDIDATE_LIMIT + selection.inMind.length,
    "retrieval respects the candidate limit",
    `${name}: ${retrieval.candidates.length}`,
  );
  for (const c of retrieval.candidates) {
    check(
      c.inMind ||
        (c.matchedAreas.length > 0 && c.matchedAreas.every((a) => selection.topics.includes(a))),
      "every candidate is in a chosen topic or was named",
      `${name}: ${c.slug}`,
    );
    if (selection.forms.length > 0 && !c.inMind) {
      check(
        c.forms.some((f) => selection.forms.includes(f)),
        "candidates respect the format filter",
        `${name}: ${c.slug}`,
      );
    }
    if (
      selection.budgetCap !== null &&
      c.suggestedPrice !== null &&
      selection.variant === "largest-within-budget"
    ) {
      const entry = c.entryPrice ?? 0;
      check(
        c.suggestedPrice >= entry &&
          (c.suggestedPrice <= selection.budgetCap || c.suggestedPrice === entry),
        "the largest-within-budget presentation is chosen",
        `${name}: ${c.slug}`,
      );
    }
    if (selection.variant === "entry") {
      check(
        c.suggestedPrice === c.entryPrice,
        "the entry presentation is suggested by default",
        `${name}: ${c.slug}`,
      );
    }
  }
  for (const slug of selection.inMind) {
    check(
      retrieval.candidates.some((c) => c.slug === slug),
      "a named product is always retrieved",
      `${name}: ${slug}`,
    );
  }
  for (const topic of selection.topics) {
    check(
      retrieval.destinations.some((d) => d.id === `area:${topic}`),
      "each topic is a destination",
      `${name}: ${topic}`,
    );
  }
  check(
    retrieval.destinations.some((d) => d.kind === "explorer") === publicEvidence,
    "the documentation explorer is offered exactly when it renders",
    name,
  );
}

check(
  runs.coverTopicsExperienced.retrieval.supplies.length > 0 &&
    runs.firstOrderNewcomer.retrieval.supplies.length === 0,
  "supplies appear only when requested",
);
check(
  runs.coverTopicsExperienced.retrieval.candidates.some((c) => c.suggestedPrice !== c.entryPrice),
  "a largest-size preference changes a suggested presentation",
);

/* DIFFERENT VISITORS, DIFFERENT PRODUCTS — the property the feature exists for. */
{
  const names = Object.keys(runs);
  const slugs = (name) => new Set(runs[name].retrieval.candidates.map((c) => c.slug));
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = slugs(names[i]);
      const b = slugs(names[j]);
      const shared = [...a].filter((s) => b.has(s)).length;
      const jaccard = shared / new Set([...a, ...b]).size;
      check(
        jaccard < 0.6,
        "substantially different profiles retrieve different products",
        `${names[i]} × ${names[j]}: ${jaccard.toFixed(2)}`,
      );
    }
  }
}

/* Same topics, different goal → a different plan. */
{
  const topics = ["metabolic", "skin"];
  const planFor = (overrides) => {
    const decision = applyAtlasPolicy(profileOf({ topics, budget: "20k", ...overrides }));
    const retrieval = retrieveAtlas(decision.selection, subjects, deps);
    const plan = planAtlas(retrieval, decision.constraints);
    return [plan.start.map((c) => c.slug), plan.more.map((c) => c.slug)];
  };
  const first = planFor({ intent: "first-order", experience: "new" });
  const compare = planFor({ intent: "compare", experience: "experienced" });
  const documented = planFor({
    intent: "first-order",
    experience: "new",
    priorities: ["documentation"],
    size: "largest",
  });
  check(!same(first, compare), "the same topics with a different goal give a different plan");
  check(first[0].length <= 2, "a newcomer's first order starts small", first[0].join(","));
  check(
    !same(first, documented) || publicEvidence === false,
    "priorities change the plan when documentation exists",
  );
}

/* ---- the no-model result is valid, everywhere ------------------------------ */
const approvedLabels = publicAreas().flatMap((a) => [
  es.discovery.areas[a.id].short,
  es.discovery.areas[a.id].title,
  en.discovery.areas[a.id].short,
  en.discovery.areas[a.id].title,
]);
const catalogue = publishedProducts.map((p) => ({ slug: p.slug, name: p.name }));
const nameOf = new Map(publishedProducts.map((p) => [p.slug, p.name]));

function composeFor(name, dict) {
  const { decision, retrieval, plan } = runs[name];
  return composeAtlasGeneration({
    narrative: decision.narrative,
    retrieval,
    plan,
    topicLabel: (id) => dict.discovery.areas[id].short,
    destinationLabel: (d) =>
      d.kind === "area"
        ? dict.discovery.areas[d.ref].short
        : d.kind === "product"
          ? nameOf.get(d.ref)
          : dict.atlas.destinations[d.kind],
    copy: dict.atlas.compose,
  });
}
const contextFor = (name) => ({
  retrieval: runs[name].retrieval,
  constraints: runs[name].decision.constraints,
  catalogue,
  approvedLabels,
});

const composedStarts = {};
for (const name of Object.keys(runs)) {
  for (const [locale, dict] of [
    ["es", es],
    ["en", en],
  ]) {
    const generation = composeFor(name, dict);
    const issues = validateAtlasGeneration(generation, contextFor(name));
    check(
      issues.length === 0,
      "the composed result passes the validator",
      `${name}/${locale}: ${issues.map((i) => `${i.path} ${i.code} ${i.detail}`).join("; ")}`,
    );
    if (locale === "es")
      composedStarts[name] = JSON.stringify(
        [generation.start, generation.more].map((l) => l.map((p) => p.slug)),
      );
  }

  const { retrieval, decision, plan } = runs[name];
  const cap = retrieval.budgetCap;
  const { enforceBudget } = effectiveStart(retrieval, decision.constraints);
  if (cap !== null && enforceBudget) {
    const total = plan.start.reduce((sum, c) => sum + (c.suggestedPrice ?? 0), 0);
    check(total <= cap, "the plan's start set fits the cap together", `${name}: ${total} > ${cap}`);
  }
  for (const c of retrieval.candidates.filter((c) => c.inMind)) {
    check(
      [...plan.start, ...plan.more].includes(c),
      "the plan includes named products",
      `${name}: ${c.slug}`,
    );
  }
}
check(
  new Set(Object.values(composedStarts)).size === Object.keys(composedStarts).length,
  "different profiles produce different results",
);

/* ---- validation refuses what a model must not write ------------------------ */
const exercised = new Set();
{
  const name = "coverTopicsExperienced";
  const base = composeFor(name, es);
  const ctx = contextFor(name);
  const { retrieval } = runs[name];
  const outside = publishedProducts.find(
    (p) =>
      !retrieval.candidates.some((c) => c.slug === p.slug) &&
      !retrieval.supplies.some((c) => c.slug === p.slug) &&
      p.name.length >= 5 &&
      !/\d/.test(p.name),
  );

  const clone = () => JSON.parse(JSON.stringify(base));
  const withWhy = (text) => {
    const g = clone();
    g.start[0].why = text;
    return g;
  };
  const expect = (generation, code, label, context = ctx) => {
    exercised.add(code);
    const issues = validateAtlasGeneration(generation, context);
    check(
      issues.some((i) => i.code === code),
      `the validator refuses ${label}`,
      issues.map((i) => i.code).join(",") || "no issues raised",
    );
  };

  {
    const g = clone();
    g.start[0].slug = "invented-compound";
    expect(g, "unknown_slug", "a slug outside the candidates");
  }
  {
    const g = clone();
    g.more.push({ slug: g.start[0].slug, why: "Otra vez." });
    expect(g, "duplicate", "a repeated product");
  }
  {
    const g = clone();
    const extra = retrieval.candidates.filter(
      (c) => ![...g.start, ...g.more].some((p) => p.slug === c.slug),
    );
    g.start = [
      ...g.start,
      ...extra.slice(0, 4).map((c) => ({ slug: c.slug, why: "Está en tus temas." })),
    ];
    expect(g, "count", "too many start products");
  }
  {
    const g = clone();
    const supply = retrieval.supplies[0];
    if (supply) {
      g.start.push({ slug: supply.slug, why: "Insumo." });
      expect(g, "misplaced_supply", "a supply in start");
    }
  }
  {
    const g = clone();
    g.start = [...retrieval.candidates]
      .sort((a, b) => (b.suggestedPrice ?? 0) - (a.suggestedPrice ?? 0))
      .slice(0, 3)
      .map((c) => ({ slug: c.slug, why: "Está en tus temas." }));
    g.more = g.more.filter((p) => !g.start.some((s) => s.slug === p.slug));
    const sum = g.start.reduce(
      (t, p) => t + (retrieval.candidates.find((c) => c.slug === p.slug)?.suggestedPrice ?? 0),
      0,
    );
    if (sum > retrieval.budgetCap) expect(g, "over_budget", "a start set over the cap");
  }
  {
    const inMindName = "deepenWithProductInMind";
    const named = runs[inMindName].retrieval.candidates.find((c) => c.inMind);
    if (named) {
      const g = composeFor(inMindName, es);
      g.start = g.start.filter((p) => p.slug !== named.slug);
      g.more = g.more.filter((p) => p.slug !== named.slug);
      expect(g, "missing_in_mind", "a result that drops a named product", contextFor(inMindName));
    }
  }
  {
    const g = clone();
    const topic = retrieval.areas[2].id;
    const keep = (p) =>
      !retrieval.candidates.find((c) => c.slug === p.slug)?.matchedAreas.includes(topic);
    g.start = g.start.filter(keep);
    g.more = g.more.filter(keep);
    if (g.start.length > 0) expect(g, "missing_topic", "a result that drops a chosen topic");
  }
  expect(withWhy("Ayuda a reducir el apetito."), "claim", "an effect claim (es)");
  expect(withWhy("Known to boost recovery."), "claim", "an effect claim (en)");
  expect(withWhy("Es ideal para tu cuerpo y tu salud."), "claim", "suitability to a person (es)");
  expect(withWhy("A good match for your body."), "claim", "suitability to a person (en)");
  expect(withWhy("La presentación de 10 mg es la más común."), "invented_figure", "a strength");
  expect(withWhy("Cuesta $4,000 en su presentación de entrada."), "invented_figure", "a price");
  expect(withWhy("Entra en tus 20 mil de presupuesto."), "invented_figure", "a budget figure");
  expect(withWhy("Pureza del 99% verificada."), "invented_figure", "a percentage");
  expect(withWhy("Revisa la dosis semanal recomendada."), "forbidden_term", "dosing vocabulary");
  if (outside)
    expect(
      withWhy(`Se compara con ${outside.name}.`),
      "unlisted_product",
      "a product outside the candidates",
    );
  {
    const g = clone();
    g.nextSteps[0].destinationId = "area:astrology";
    expect(g, "unknown_destination", "a destination that does not exist");
  }
  {
    const g = clone();
    g.topics = [];
    expect(g, "missing_area", "a result that drops a topic note");
  }
  {
    const g = clone();
    g.headline = "x".repeat(200);
    expect(g, "length", "an overlong headline");
  }

  /* Every conditional control must actually have run against these fixtures. */
  for (const code of [
    "unknown_slug",
    "duplicate",
    "count",
    "misplaced_supply",
    "over_budget",
    "missing_in_mind",
    "missing_topic",
    "claim",
    "invented_figure",
    "forbidden_term",
    "unlisted_product",
    "unknown_destination",
    "missing_area",
    "length",
  ]) {
    check(exercised.has(code), "every validator control is exercised by the fixtures", code);
  }

  const approved = withWhy(
    "Está en Desarrollo y rendimiento, junto a Growth & Performance y Longevidad y función celular.",
  );
  const approvedIssues = validateAtlasGeneration(approved, ctx);
  check(
    approvedIssues.length === 0,
    "owner-approved topic names are not treated as claims (negative control)",
    approvedIssues.map((i) => `${i.code} ${i.detail}`).join("; "),
  );
}

/* ---- the Anthropic adapter, offline --------------------------------------
 *
 * No key exists in CI and no API call is made. A fake transport records the
 * exact request the adapter would send and returns canned API responses, so
 * this proves the request shape against the documented API and the handling
 * of every outcome a real call can produce.
 */
{
  const { createAnthropicAdvisor, ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_FALLBACK_BETA } =
    await import("../src/advisor/adapters/anthropic-core.ts");
  const { atlasGenerationSchema } = await import("../src/domain/atlas/schema.ts");
  const { betaZodOutputFormat } = await import("@anthropic-ai/sdk/helpers/beta/zod");

  const generation = composeFor("firstOrderNewcomer", es);
  const apiResponse = (overrides) => ({
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: ANTHROPIC_DEFAULT_MODEL,
    content: [{ type: "text", text: JSON.stringify(generation) }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 1500,
      output_tokens: 900,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 400,
    },
    ...overrides,
  });

  let captured = null;
  const transport = (status, body) => async (url, init) => {
    captured = {
      url: String(url),
      headers: new Headers(init?.headers),
      body: JSON.parse(init.body),
    };
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  const advisorWith = (status, body, apiKey = "sk-test-not-real") =>
    createAnthropicAdvisor(() => ({ apiKey, fetch: transport(status, body), maxRetries: 0 }));
  const request = {
    system: "SYSTEM",
    input: "INPUT",
    schema: atlasGenerationSchema,
    maxTokens: 16000,
  };

  check(
    !createAnthropicAdvisor(() => ({ apiKey: undefined })).isConfigured(),
    "no key, no provider",
  );
  check(
    createAnthropicAdvisor(() => ({ apiKey: "k" })).isConfigured(),
    "a key configures the provider",
  );

  /* The request, against the documented API shape. */
  const ok = await advisorWith(200, apiResponse({})).generate(request);
  check(ok.ok, "a valid API response parses", ok.ok ? "" : ok.error.message);
  check(
    captured?.url.includes("/v1/messages?beta=true"),
    "the adapter calls the beta messages endpoint",
    captured?.url,
  );
  check(
    (captured?.headers.get("anthropic-beta") ?? "").includes(ANTHROPIC_FALLBACK_BETA),
    "the server-side fallback beta header is sent",
    captured?.headers.get("anthropic-beta"),
  );
  check(
    captured?.headers.get("x-api-key") === "sk-test-not-real",
    "the key travels only in its header",
  );
  const body = captured?.body ?? {};
  check(body.model === ANTHROPIC_DEFAULT_MODEL, "the default model is Claude Opus 5", body.model);
  check(
    body.fallbacks === "default",
    "fallbacks are enabled in default mode",
    String(body.fallbacks),
  );
  check(
    body.thinking?.type === "adaptive",
    "adaptive thinking is requested",
    JSON.stringify(body.thinking),
  );
  check(
    body.output_config?.effort === "medium",
    "effort defaults to medium",
    body.output_config?.effort,
  );
  check(body.output_config?.format?.type === "json_schema", "structured JSON output is requested");
  check(body.system?.[0]?.cache_control?.type === "ephemeral", "the system prompt is cacheable");
  check(body.max_tokens === 16000, "max_tokens is passed through", String(body.max_tokens));
  check(
    body.messages?.length === 1 &&
      body.messages[0].role === "user" &&
      body.messages[0].content === "INPUT",
    "a first attempt sends one user turn",
  );
  check(
    !("temperature" in body) && !("budget_tokens" in (body.thinking ?? {})),
    "no parameters Opus 5 rejects are sent",
  );
  if (ok.ok) {
    check(
      ok.usage.inputTokens === 1900 && ok.usage.outputTokens === 900,
      "usage is mapped, cache writes included",
    );
    check(
      JSON.stringify(ok.data) === JSON.stringify(generation),
      "parsed data equals the generation",
    );
  }

  /* The correction turn. */
  await advisorWith(200, apiResponse({})).generate({
    ...request,
    correction: { previous: "PREVIOUS", issues: ["compounds[0]: unknown_slug (x)"] },
  });
  const turns = captured?.body.messages ?? [];
  check(
    turns.length === 3 &&
      turns[0].role === "user" &&
      turns[1].role === "assistant" &&
      turns[1].content === "PREVIOUS" &&
      turns[2].role === "user" &&
      String(turns[2].content).includes("unknown_slug"),
    "a correction replays the previous output and the issues",
  );

  /* Every failure maps to a stable code. */
  const outcome = async (status, body) => {
    const result = await advisorWith(status, body).generate(request);
    return result.ok ? "ok" : result.error.code;
  };
  check(
    (await outcome(200, apiResponse({ content: [], stop_reason: "refusal" }))) === "refused",
    "a refusal is reported as refused",
  );
  check(
    (await outcome(
      200,
      apiResponse({ content: [{ type: "text", text: '{"title":' }], stop_reason: "max_tokens" }),
    )) === "truncated",
    "a truncated response is reported as truncated",
  );
  check(
    (await outcome(200, apiResponse({ content: [{ type: "text", text: "not json" }] }))) ===
      "invalid_output",
    "non-JSON output is reported as invalid",
  );
  check(
    (await outcome(200, apiResponse({ content: [{ type: "text", text: '{"foo":1}' }] }))) ===
      "invalid_output",
    "schema-mismatched JSON is reported as invalid",
  );
  check(
    (await outcome(401, {
      type: "error",
      error: { type: "authentication_error", message: "bad key" },
    })) === "provider_error",
    "an authentication failure is a provider error",
  );

  /* The schema the model receives meets the structured-output constraints. */
  const walk = (node, path, issues) => {
    if (node && typeof node === "object") {
      if (node.type === "object" && node.properties) {
        if (node.additionalProperties !== false) issues.push(`${path}: additionalProperties`);
        const required = new Set(node.required ?? []);
        for (const key of Object.keys(node.properties)) {
          if (!required.has(key)) issues.push(`${path}.${key}: not required`);
        }
      }
      for (const [key, value] of Object.entries(node)) walk(value, `${path}.${key}`, issues);
    }
    return issues;
  };
  const schemaIssues = walk(betaZodOutputFormat(atlasGenerationSchema).schema, "$", []);
  check(
    schemaIssues.length === 0,
    "every object in the output schema is closed and fully required",
    schemaIssues.join("; "),
  );
}

/* ---- report --------------------------------------------------------------- */
const summary = Object.entries(runs)
  .map(
    ([name, { retrieval, plan }]) =>
      `${name}=${plan.start.length}+${plan.more.length}/${retrieval.candidates.length}/${retrieval.poolSize}`,
  )
  .join(" ");

if (failures.length) {
  console.error(`\natlas check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${summary}\n`);
  process.exit(1);
}
console.log(`atlas check passed — ${summary}`);
