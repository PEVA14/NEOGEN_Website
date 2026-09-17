/**
 * check:atlas — NEOGEN Atlas, proved against fixtures and the live catalogue.
 *
 * What this gate guarantees, each with a negative control so it can fail:
 *
 *   ANSWERS     the questionnaire parser rejects out-of-vocabulary input, and
 *               drops a note carrying personal or health detail before it can
 *               reach a model — without dropping ordinary text like "pesos".
 *   RETRIEVAL   every candidate belongs to the reader's areas and respects the
 *               form filter, each chosen area keeps its floor, and four
 *               substantially different real profiles retrieve DIFFERENT maps.
 *   FALLBACK    the no-model composition passes the validator, in both locales,
 *               for every profile — so the degraded result is itself valid.
 *   VALIDATION  invented slugs, claims, strengths, prices, dosing vocabulary,
 *               compounds outside the candidate set and unknown destinations
 *               are all refused; owner-approved area names are not.
 */

import { parseAtlasAnswers } from "../src/domain/atlas/answers.ts";
import {
  ATLAS_CANDIDATE_LIMIT,
  ATLAS_PER_AREA_FLOOR,
  retrieveAtlas,
} from "../src/domain/atlas/retrieval.ts";
import { atlasSubjectsFrom } from "../src/domain/atlas/subjects.ts";
import { composeAtlasGeneration } from "../src/domain/atlas/compose.ts";
import { validateAtlasGeneration } from "../src/domain/atlas/validate.ts";
import { referencesForProduct } from "../src/content/research.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";
import { getPrices } from "../src/data/commerce/index.ts";
import { publicAreas, publicAreasFor } from "../src/data/discovery/index.ts";
import { relatedAreas } from "../src/domain/discovery/index.ts";
import { publicEvidenceIndex } from "../src/domain/quality/index.ts";
import es from "../src/i18n/dictionaries/es.ts";
import en from "../src/i18n/dictionaries/en.ts";

const failures = [];
const check = (condition, what, detail = "") => {
  if (!condition) failures.push(`${what}${detail ? `: ${detail}` : ""}`);
};

const areaIds = publicAreas().map((a) => a.id);
const raw = (overrides) => ({
  areas: ["metabolic"],
  depth: "orientation",
  focus: [],
  forms: [],
  includeMaterials: false,
  budget: "open",
  context: "",
  ...overrides,
});

/* ---- answers ------------------------------------------------------------ */
{
  const ok = parseAtlasAnswers(raw({}), areaIds);
  check(ok.ok, "a valid questionnaire parses");

  for (const [label, input] of [
    ["unknown area", raw({ areas: ["astrology"] })],
    ["four areas", raw({ areas: areaIds.slice(0, 4) })],
    ["repeated area", raw({ areas: ["metabolic", "metabolic"] })],
    ["no area", raw({ areas: [] })],
    ["unknown focus", raw({ focus: ["popularity"] })],
    ["three focus values", raw({ focus: ["documentation", "flagships", "value"] })],
    ["unknown form", raw({ forms: ["capsule"] })],
    ["unknown budget", raw({ budget: "unlimited" })],
    ["non-boolean materials", raw({ includeMaterials: "yes" })],
    ["body not an object", null],
  ]) {
    check(!parseAtlasAnswers(input, areaIds).ok, `the parser rejects ${label}`);
  }

  for (const note of [
    "Tengo diabetes y tomo metformina",
    "¿Qué dosis debería usar?",
    "I have high blood pressure",
    "Peso 92 kg y quiero bajar de peso",
    "for personal use before the gym",
  ]) {
    const parsed = parseAtlasAnswers(raw({ context: note }), areaIds);
    check(
      parsed.ok && parsed.answers.context === "" && parsed.answers.contextScreened,
      "a note with personal or health detail is dropped before generation",
      note,
    );
  }
  for (const note of [
    "Comparo compuestos de dos áreas para un proyecto de laboratorio",
    "Tengo un presupuesto de 20 mil pesos para el trimestre",
    "Building a reference shelf for our lab",
  ]) {
    const parsed = parseAtlasAnswers(raw({ context: note }), areaIds);
    check(
      parsed.ok && parsed.answers.context === note && !parsed.answers.contextScreened,
      "an ordinary research note is kept (negative control)",
      note,
    );
  }
}

/* ---- retrieval, against the live catalogue ------------------------------- */
const prices = await getPrices(publishedProducts.flatMap((p) => p.variants.map((v) => v.id)));
const subjects = atlasSubjectsFrom(publishedProducts, {
  price: (id) => prices.get(id)?.amount ?? null,
  areas: (slug) => publicAreasFor(slug).map((a) => a.id),
  documented: (product) => publicEvidenceIndex([product]).length > 0,
  references: (slug) => referencesForProduct(slug).map((r) => r.id),
});
const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
const deps = { relatedAreas: (id) => relatedAreas(id).map((r) => r.area.id), publicEvidence };

const PROFILES = {
  metabolicFlagships: raw({ areas: ["metabolic"], depth: "detail", focus: ["flagships"] }),
  skinNeuroValue: raw({
    areas: ["skin", "neuro"],
    focus: ["bridges", "value"],
    forms: ["solid"],
    budget: "8k",
  }),
  recoveryGrowthHormonal: raw({
    areas: ["recovery", "growth", "hormonal"],
    focus: ["documentation"],
    includeMaterials: true,
    budget: "40k",
  }),
  longevityMetabolicValue: raw({
    areas: ["longevity", "metabolic"],
    depth: "detail",
    focus: ["value"],
    forms: ["solid"],
    budget: "20k",
  }),
};

const maps = {};
for (const [name, input] of Object.entries(PROFILES)) {
  const parsed = parseAtlasAnswers(input, areaIds);
  check(parsed.ok, "every test profile parses", name);
  if (!parsed.ok) continue;
  const answers = parsed.answers;
  const retrieval = retrieveAtlas(answers, subjects, deps);
  maps[name] = { answers, retrieval };

  check(retrieval.candidates.length > 0, "a real profile retrieves candidates", name);
  check(
    retrieval.candidates.length <= ATLAS_CANDIDATE_LIMIT,
    "retrieval respects the candidate limit",
    `${name}: ${retrieval.candidates.length}`,
  );
  for (const c of retrieval.candidates) {
    check(
      c.matchedAreas.length > 0 && c.matchedAreas.every((a) => answers.areas.includes(a)),
      "every candidate is filed under a chosen area",
      `${name}: ${c.slug}`,
    );
    if (answers.forms.length > 0) {
      check(
        c.forms.some((f) => answers.forms.includes(f)),
        "every candidate respects the form filter",
        `${name}: ${c.slug}`,
      );
    }
    check(
      answers.budget === "open" ? c.withinBudget === null : typeof c.withinBudget === "boolean",
      "budget fit is null with no cap and boolean with one",
      `${name}: ${c.slug}`,
    );
  }
  for (const area of answers.areas) {
    const available = subjects.filter(
      (s) =>
        s.areas.includes(area) &&
        (answers.forms.length === 0 || s.forms.some((f) => answers.forms.includes(f))),
    ).length;
    const held = retrieval.candidates.filter((c) => c.matchedAreas.includes(area)).length;
    check(
      held >= Math.min(ATLAS_PER_AREA_FLOOR, available),
      "each chosen area keeps its floor of candidates",
      `${name}: ${area} ${held}/${available}`,
    );
    check(
      retrieval.destinations.some((d) => d.id === `area:${area}`),
      "each chosen area is a path destination",
      `${name}: ${area}`,
    );
  }
  check(
    retrieval.destinations.some((d) => d.kind === "explorer") === publicEvidence,
    "the documentation explorer is offered exactly when it renders",
    name,
  );
}

/* Flagship focus leads with a flagship when the pool has one. */
{
  const { retrieval } = maps.metabolicFlagships;
  const poolHasFlagship = subjects.some((s) => s.world !== null && s.areas.includes("metabolic"));
  check(
    !poolHasFlagship || retrieval.candidates[0]?.world !== null,
    "flagship focus puts a flagship first",
    retrieval.candidates[0]?.slug,
  );
}

/* Materials are offered separately, and only when asked for. */
{
  const materialsExist = subjects.some((s) => s.areas.includes("materials"));
  const { retrieval } = maps.recoveryGrowthHormonal;
  check(
    !materialsExist || retrieval.materials.length > 0,
    "requested laboratory materials are offered",
  );
  check(
    retrieval.materials.every((m) => !retrieval.candidates.some((c) => c.slug === m.slug)),
    "materials never duplicate a candidate",
  );
  check(
    maps.metabolicFlagships.retrieval.materials.length === 0,
    "materials are absent unless requested",
  );
}

/* DIFFERENT READERS, DIFFERENT MAPS — the property the feature exists for. */
{
  const names = Object.keys(maps);
  const slugs = (name) => new Set(maps[name].retrieval.candidates.map((c) => c.slug));
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const a = slugs(names[i]);
      const b = slugs(names[j]);
      const shared = [...a].filter((s) => b.has(s)).length;
      const jaccard = shared / new Set([...a, ...b]).size;
      check(
        jaccard < 0.6,
        "substantially different profiles retrieve substantially different compounds",
        `${names[i]} × ${names[j]}: ${jaccard.toFixed(2)}`,
      );
    }
  }
}

/* ---- the no-model composition is valid, everywhere ----------------------- */
const approvedLabels = publicAreas().flatMap((a) => [
  es.discovery.areas[a.id].short,
  es.discovery.areas[a.id].title,
  en.discovery.areas[a.id].short,
  en.discovery.areas[a.id].title,
]);
const catalogue = publishedProducts.map((p) => ({ slug: p.slug, name: p.name }));
const nameOf = new Map(publishedProducts.map((p) => [p.slug, p.name]));

function composeFor(name, dict, mode = "development") {
  const { answers, retrieval } = maps[name];
  return composeAtlasGeneration({
    answers,
    retrieval,
    areaLabel: (id) => dict.discovery.areas[id].short,
    destinationLabel: (d) =>
      d.kind === "area"
        ? dict.discovery.areas[d.ref].short
        : d.kind === "product"
          ? nameOf.get(d.ref)
          : dict.atlas.destinations[d.kind],
    copy: dict.atlas.compose,
    mode,
  });
}
const contextFor = (name) => ({ ...maps[name], catalogue, approvedLabels });

const composedCompounds = {};
for (const name of Object.keys(maps)) {
  for (const [locale, dict] of [
    ["es", es],
    ["en", en],
  ]) {
    for (const mode of ["development", "catalogue"]) {
      const generation = composeFor(name, dict, mode);
      const issues = validateAtlasGeneration(generation, contextFor(name));
      check(
        issues.length === 0,
        "the composed map passes the validator",
        `${name}/${locale}/${mode}: ${issues.map((i) => `${i.path} ${i.code} ${i.detail}`).join("; ")}`,
      );
      if (locale === "es" && mode === "development") {
        composedCompounds[name] = generation.compounds.map((c) => c.slug).join(",");
      }
    }
  }
}
check(
  new Set(Object.values(composedCompounds)).size === Object.keys(composedCompounds).length,
  "different profiles produce different composed maps",
);

/* A composed map keeps its core inside the reader's cap, and gives every area a place. */
for (const name of Object.keys(maps)) {
  const { answers, retrieval } = maps[name];
  const generation = composeFor(name, es);
  const bySlug = new Map(retrieval.candidates.map((c) => [c.slug, c]));
  const core = generation.compounds.filter((c) => c.role === "core").map((c) => bySlug.get(c.slug));
  const cap = retrieval.budgetCap;
  const anyFits =
    cap !== null && retrieval.candidates.some((c) => c.entryPrice !== null && c.entryPrice <= cap);
  if (cap !== null && anyFits) {
    const total = core.reduce((sum, c) => sum + (c?.entryPrice ?? 0), 0);
    check(
      total <= cap,
      "the composed core fits inside the reader's cap together",
      `${name}: ${total} > ${cap}`,
    );
  }
  for (const area of answers.areas) {
    const hasCandidate = retrieval.candidates.some((c) => c.matchedAreas.includes(area));
    const onMap = generation.compounds.some((c) => bySlug.get(c.slug)?.matchedAreas.includes(area));
    check(
      !hasCandidate || onMap,
      "every chosen area with a candidate appears on the composed map",
      `${name}: ${area}`,
    );
  }
}

/* ---- validation refuses what a model must not write ---------------------- */
{
  const name = "metabolicFlagships";
  const base = composeFor(name, es);
  const ctx = contextFor(name);
  const outside = publishedProducts.find(
    (p) =>
      !maps[name].retrieval.candidates.some((c) => c.slug === p.slug) &&
      p.name.length >= 5 &&
      !/\d/.test(p.name),
  );

  const clone = () => JSON.parse(JSON.stringify(base));
  const withRationale = (text) => {
    const g = clone();
    g.compounds[0].rationale = text;
    return g;
  };
  const expect = (generation, code, label) => {
    const issues = validateAtlasGeneration(generation, ctx);
    check(
      issues.some((i) => i.code === code),
      `the validator refuses ${label}`,
      issues.map((i) => i.code).join(",") || "no issues raised",
    );
  };

  {
    const g = clone();
    g.compounds[0].slug = "invented-compound";
    expect(g, "unknown_slug", "a slug outside the candidates");
  }
  {
    const g = clone();
    g.compounds[1].slug = g.compounds[0].slug;
    expect(g, "duplicate", "a repeated compound");
  }
  {
    const g = clone();
    g.compounds = g.compounds.slice(0, 1);
    expect(g, "count", "too few compounds");
  }
  expect(withRationale("Ayuda a reducir el apetito."), "claim", "an effect claim (es)");
  expect(withRationale("Known to boost recovery."), "claim", "an effect claim (en)");
  expect(
    withRationale("La presentación de 10 mg es la más común."),
    "invented_figure",
    "a strength",
  );
  expect(
    withRationale("Cuesta $4,000 en su presentación de entrada."),
    "invented_figure",
    "a price",
  );
  expect(withRationale("Pureza del 99% verificada."), "invented_figure", "a percentage");
  expect(
    withRationale("Revisa la dosis semanal recomendada."),
    "forbidden_term",
    "dosing vocabulary",
  );
  if (outside) {
    expect(
      withRationale(`Se compara con ${outside.name}.`),
      "unlisted_product",
      "a compound outside the candidates",
    );
  }
  {
    const g = clone();
    g.path[0].destinationId = "area:astrology";
    expect(g, "unknown_destination", "a destination that does not exist");
  }
  {
    const g = clone();
    g.areas = [];
    expect(g, "missing_area", "a map that drops a chosen area");
  }
  {
    const g = clone();
    g.title = "x".repeat(200);
    expect(g, "length", "an overlong title");
  }

  /* Negative control: approved area names are not claims. */
  const approved = withRationale(
    "Archivado en Desarrollo y rendimiento, junto a Growth & Performance y Longevidad y función celular.",
  );
  const approvedIssues = validateAtlasGeneration(approved, ctx);
  check(
    approvedIssues.length === 0,
    "owner-approved area names are not treated as claims (negative control)",
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

  const generation = composeFor("metabolicFlagships", es);
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
const summary = Object.entries(maps)
  .map(([name, { retrieval }]) => `${name}=${retrieval.candidates.length}/${retrieval.poolSize}`)
  .join(" ");

if (failures.length) {
  console.error(`\natlas check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${summary}\n`);
  process.exit(1);
}
console.log(`atlas check passed — ${summary}`);
