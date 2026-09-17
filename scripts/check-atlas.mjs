/**
 * check:atlas — NEOGEN Atlas, proved against fixtures and the live catalogue.
 *
 * What this gate guarantees, each with a negative control so it can fail:
 *
 *   SCHEMA        the questionnaire content is answerable: unique ids, one
 *                 question per role, no forward-referencing condition.
 *   ANSWERS       the parser rejects anything the schema does not describe,
 *                 conditional questions appear and disappear, and answers to
 *                 hidden questions are dropped.
 *   ROLES         answers reach the profile by role, and a role no question
 *                 fills falls back to its documented default.
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

import {
  answerIssues,
  buildQuestionnaireView,
  conditionHolds,
  groupComplete,
  initialAnswers,
  parseAtlasAnswers,
  profileFromAnswers,
  validateQuestionnaire,
  visibleGroups,
  visibleQuestions,
} from "../src/domain/atlas/questionnaire/index.ts";
import { atlasRecap, buildAtlasLedger } from "../src/domain/atlas/ledger.ts";
import { ATLAS_QUESTIONNAIRE } from "../src/content/atlas/questionnaire.ts";
import { RESEARCH_FUNCTIONS } from "../src/content/functions.ts";
import {
  atlasExperienceLevels,
  atlasForms,
  atlasHistories,
  atlasHorizons,
  atlasIntents,
  atlasPriorities,
  atlasSizes,
  atlasStyles,
  atlasTimings,
} from "../src/domain/atlas/types.ts";
import { applyAtlasPolicy } from "../src/domain/atlas/policy.ts";
import { ATLAS_CANDIDATE_LIMIT, retrieveAtlas } from "../src/domain/atlas/retrieval.ts";
import { effectiveStart, planAtlas } from "../src/domain/atlas/plan.ts";
import { atlasSubjectsFrom } from "../src/domain/atlas/subjects.ts";
import { composeAtlasGeneration } from "../src/domain/atlas/compose.ts";
import { validateAtlasGeneration } from "../src/domain/atlas/validate.ts";
import { referencesForProduct } from "../src/content/research.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";
import { getAvailability, getPrices } from "../src/data/commerce/index.ts";
import { productsInArea, publicAreas, publicAreasFor } from "../src/data/discovery/index.ts";
import { relatedAreas } from "../src/domain/discovery/index.ts";
import { publicEvidenceIndex } from "../src/domain/quality/index.ts";
import es from "../src/i18n/dictionaries/es.ts";
import en from "../src/i18n/dictionaries/en.ts";

const failures = [];
const check = (condition, what, detail = "") => {
  if (!condition) failures.push(`${what}${detail ? `: ${detail}` : ""}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const VOCABULARIES = {
  intents: atlasIntents,
  experience: atlasExperienceLevels,
  histories: atlasHistories,
  priorities: atlasPriorities,
  styles: atlasStyles,
  forms: atlasForms,
  sizes: atlasSizes,
  horizons: atlasHorizons,
  timings: atlasTimings,
};

/*
 * THE QUESTIONNAIRE, RESOLVED THE WAY THE SERVER RESOLVES IT.
 *
 * `server/atlas/questionnaire.ts` cannot be imported here (it is `server-only`),
 * so the registry resolver is rebuilt from the same registries. Two views:
 * `view` is the live one, and `viewWithFunctions` pretends a sourced overview
 * has been approved, which is the only way to exercise the research-function
 * question before the first approval.
 */
const areaOptions = publicAreas().map((area) => ({
  id: area.id,
  label: es.discovery.areas[area.id].short,
  hint: null,
  meta: {
    area: area.id,
    framing: es.discovery.areas[area.id].title,
    compounds: productsInArea(area.id).length,
  },
}));
const productOptions = publishedProducts.map((product) => ({
  id: product.slug,
  label: product.name,
  hint: null,
  meta: { areas: publicAreasFor(product.slug).map((a) => a.id) },
}));
const FIXTURE_FUNCTIONS = ["wound-healing", "extracellular-matrix", "gene-expression"];
const functionOptions = RESEARCH_FUNCTIONS.filter((fn) => FIXTURE_FUNCTIONS.includes(fn.id)).map(
  (fn) => ({
    id: fn.id,
    label: fn.label.es,
    hint: fn.hint.es,
    meta: { compounds: 1, group: fn.group, groupLabel: fn.group },
  }),
);
const resolver = (functions) => (registry) =>
  registry === "discovery-areas"
    ? areaOptions
    : registry === "published-products"
      ? productOptions
      : functions;

const view = buildQuestionnaireView(ATLAS_QUESTIONNAIRE, "es", resolver([]));
const viewWithFunctions = buildQuestionnaireView(
  ATLAS_QUESTIONNAIRE,
  "es",
  resolver(functionOptions),
);
const viewEn = buildQuestionnaireView(ATLAS_QUESTIONNAIRE, "en", resolver([]));

const answersOf = (overrides = {}, v = view) => ({
  ...initialAnswers(v),
  topics: ["metabolic"],
  ...overrides,
});
const profileOf = (overrides = {}, v = view) =>
  profileFromAnswers(v, answersOf(overrides, v), VOCABULARIES);
const LEDGER_COPY = {
  yes: es.atlas.result.ledger.yes,
  no: es.atlas.result.ledger.no,
  noteGiven: es.atlas.result.ledger.noteGiven,
};
const ledgerOf = (overrides = {}, v = view) => {
  const answers = answersOf(overrides, v);
  const decision = applyAtlasPolicy(profileFromAnswers(v, answers, VOCABULARIES));
  return buildAtlasLedger(v, answers, LEDGER_COPY, decision.noteDiscarded);
};

/* ---- schema: the questionnaire content is answerable --------------------- */
{
  check(
    validateQuestionnaire(ATLAS_QUESTIONNAIRE).length === 0,
    "the live questionnaire validates",
    validateQuestionnaire(ATLAS_QUESTIONNAIRE)
      .map((i) => `${i.code} at ${i.where}`)
      .join("; "),
  );
  const q = (extra) => ({
    version: "t",
    groups: [
      {
        id: "g",
        label: { es: "G", en: "G" },
        title: { es: "G", en: "G" },
        lede: { es: "G", en: "G" },
        questions: [
          {
            id: "topics",
            kind: "multi-select",
            role: "topics",
            required: true,
            label: { es: "T", en: "T" },
            options: { kind: "registry", registry: "discovery-areas" },
          },
          ...extra,
        ],
      },
    ],
  });
  const codes = (questionnaire) => validateQuestionnaire(questionnaire).map((i) => i.code);
  const single = (overrides) => ({
    id: "x",
    kind: "single-select",
    label: { es: "X", en: "X" },
    options: {
      kind: "static",
      items: [{ id: "a", label: { es: "A", en: "A" } }],
    },
    ...overrides,
  });
  for (const [label, questionnaire, code] of [
    ["a duplicate question id", q([single({ id: "topics" })]), "duplicate_question_id"],
    ["two questions on one role", q([single({ role: "topics" })]), "duplicate_role"],
    ["a default that is not an option", q([single({ default: "zzz" })]), "default_not_an_option"],
    [
      "a condition on a later question",
      q([single({ visibleWhen: { question: "later", equals: "a" } }), single({ id: "later" })]),
      "condition_forward_reference",
    ],
    [
      "a self-referencing condition",
      q([single({ visibleWhen: { question: "x", equals: "a" } })]),
      "condition_forward_reference",
    ],
    [
      "an unknown registry",
      q([{ ...single({}), kind: "multi-select", options: { kind: "registry", registry: "moon" } }]),
      "registry_source_unknown",
    ],
    [
      "a number question with inverted bounds",
      q([{ id: "n", kind: "number", label: { es: "N", en: "N" }, min: 10, max: 2 }]),
      "bad_bounds",
    ],
    [
      "a free note that is not long text",
      q([single({ id: "note", role: "free-note" })]),
      "role_kind_mismatch",
    ],
    [
      "a duplicate option id",
      q([
        single({
          options: {
            kind: "static",
            items: [
              { id: "a", label: { es: "A", en: "A" } },
              { id: "a", label: { es: "B", en: "B" } },
            ],
          },
        }),
      ]),
      "duplicate_option_id",
    ],
  ]) {
    check(codes(questionnaire).includes(code), `the schema check rejects ${label}`, code);
  }
  check(
    codes(q([single({})])).length === 0,
    "a well-formed questionnaire passes (negative control)",
  );

  /* The advisor cannot work without topics, and every role it knows is either
     filled by a question or documented as defaulted. */
  const roles = view.groups.flatMap((g) => g.questions.map((question) => question.role));
  check(roles.includes("topics"), "a question fills the topics role");
  check(
    new Set(roles.filter(Boolean)).size === roles.filter(Boolean).length,
    "each role is filled at most once",
  );
}

/* ---- the resolved view: content in, registries read ---------------------- */
{
  const ids = view.groups.flatMap((g) => g.questions.map((question) => question.id));
  check(ids.length === new Set(ids).size, "every question appears once in the view");
  const topics = view.groups[0].questions.find((question) => question.id === "topics");
  check(
    topics.options.length === publicAreas().length && topics.options.every((o) => o.meta?.area),
    "registry options are read from the registry, with their own facts",
  );
  check(
    topics.label === es.atlas.field.optional || topics.label.length > 0,
    "a question's label is resolved for the locale",
  );
  const topicsEn = viewEn.groups[0].questions.find((question) => question.id === "topics");
  check(topics.label !== topicsEn.label, "both locales resolve their own wording");
  check(
    !view.groups.some((g) => g.questions.some((question) => question.id === "research-functions")),
    "a registry question with nothing to offer is dropped (hideWithoutOptions)",
  );
  check(
    viewWithFunctions.groups.some((g) =>
      g.questions.some((question) => question.id === "research-functions"),
    ),
    "…and appears as soon as the registry has options",
  );
  /* A long registry list carries its own sections; the renderer partitions on
     them in arrival order, so the resolver's order is the visitor's order. */
  const functions = viewWithFunctions.groups
    .flatMap((g) => g.questions)
    .find((question) => question.role === "research-functions");
  check(
    functions.options.every((o) => o.meta?.group && o.meta?.groupLabel),
    "every research-function option arrives with its group",
  );
  const order = functions.options.map((o) => o.meta.group);
  check(
    order.every((g, i) => i === 0 || order.indexOf(g) >= order.lastIndexOf(order[i - 1]) - 1),
    "options of one group arrive together, never interleaved",
    order.join(","),
  );

  const budget = viewWithFunctions.groups
    .flatMap((g) => g.questions)
    .find((question) => question.role === "budget-cap");
  check(
    budget.options.some((o) => o.value === 8000) && budget.options.some((o) => o.value === null),
    "an option's numeric payload survives into the view",
  );
}

/* ---- answers: the parser rejects what the schema does not describe -------- */
{
  const ok = parseAtlasAnswers(answersOf(), view);
  check(ok.ok, "a complete set of answers parses", ok.ok ? "" : JSON.stringify(ok.issues));
  check(
    parseAtlasAnswers({ topics: ["metabolic"] }, view).ok,
    "optional questions may be absent entirely",
  );
  for (const [label, answers] of [
    ["an unknown question", answersOf({ favouriteColour: "blue" })],
    ["an unknown option", answersOf({ topics: ["astrology"] })],
    [
      "too many selections",
      answersOf({
        topics: publicAreas()
          .slice(0, 4)
          .map((a) => a.id),
      }),
    ],
    ["a repeated selection", answersOf({ topics: ["metabolic", "metabolic"] })],
    ["no answer to a required question", answersOf({ topics: [] })],
    ["a single-select given a list", answersOf({ intent: ["compare"] })],
    ["an unknown single-select option", answersOf({ intent: "dose" })],
    ["a toggle given a string", answersOf({ "include-supplies": "yes" })],
    ["a text answer given a number", answersOf({ "first-name": 42 })],
    ["text over its limit", answersOf({ note: "x".repeat(401) })],
    ["an unknown product", answersOf({ "products-in-mind": ["invented-compound"] })],
    ["too many priorities", answersOf({ priorities: ["documentation", "price", "signature"] })],
    ["an unknown form", answersOf({ forms: ["capsule"] })],
    ["a research function the registry does not offer", answersOf({ "research-functions": ["x"] })],
    ["a body that is not an object", null],
  ]) {
    check(!parseAtlasAnswers(answers, view).ok, `the parser rejects ${label}`);
  }
  /* A question the registry dropped cannot be answered at all. */
  check(
    !parseAtlasAnswers(answersOf({ "research-functions": ["wound-healing"] }), view).ok,
    "an answer to a question that is not in the view is refused",
  );
  check(
    parseAtlasAnswers(
      answersOf({ "research-functions": ["wound-healing"] }, viewWithFunctions),
      viewWithFunctions,
    ).ok,
    "…and accepted once the question exists (negative control)",
  );
}

/* ---- conditional questions ------------------------------------------------ */
{
  const conditional = {
    version: "t",
    groups: [
      {
        id: "g",
        label: { es: "G", en: "G" },
        title: { es: "G", en: "G" },
        lede: { es: "G", en: "G" },
        questions: [
          {
            id: "experience",
            kind: "single-select",
            role: "experience",
            default: "some",
            label: { es: "E", en: "E" },
            options: {
              kind: "static",
              items: [
                { id: "new", label: { es: "N", en: "N" } },
                { id: "some", label: { es: "S", en: "S" } },
              ],
            },
          },
          {
            id: "follow-up",
            kind: "short-text",
            maxLength: 20,
            required: true,
            visibleWhen: { question: "experience", equals: "new" },
            label: { es: "F", en: "F" },
          },
        ],
      },
      {
        id: "extra",
        label: { es: "X", en: "X" },
        title: { es: "X", en: "X" },
        lede: { es: "X", en: "X" },
        visibleWhen: { question: "experience", equals: "new" },
        questions: [
          {
            id: "note",
            kind: "long-text",
            role: "free-note",
            maxLength: 50,
            label: { es: "N", en: "N" },
          },
        ],
      },
    ],
  };
  check(validateQuestionnaire(conditional).length === 0, "the conditional fixture validates");
  const cView = buildQuestionnaireView(conditional, "es", resolver([]));
  const hidden = { experience: "some" };
  const shown = { experience: "new" };

  check(
    visibleQuestions(cView.groups[0], hidden).length === 1,
    "a follow-up is hidden while its condition fails",
  );
  check(
    visibleQuestions(cView.groups[0], shown).length === 2,
    "…and appears when the condition holds",
  );
  check(visibleGroups(cView, hidden).length === 1, "a conditional GROUP drops out of the rail");
  check(visibleGroups(cView, shown).length === 2, "…and joins it when its condition holds");
  check(
    groupComplete(cView.groups[0], hidden) && !groupComplete(cView.groups[0], shown),
    "a hidden required question does not block the step, a visible one does",
  );
  check(
    groupComplete(cView.groups[0], { ...shown, "follow-up": "ok" }),
    "…and stops blocking once answered",
  );
  const parsed = parseAtlasAnswers({ experience: "some", "follow-up": "smuggled" }, cView);
  check(
    parsed.ok && parsed.answers["follow-up"] === undefined,
    "an answer to a hidden question is dropped, not stored",
  );
  check(
    conditionHolds({ all: [{ question: "experience", equals: "new" }] }, shown) &&
      !conditionHolds({ not: { question: "experience", equals: "new" } }, shown) &&
      conditionHolds(
        {
          any: [
            { question: "experience", equals: "zzz" },
            { question: "experience", answered: true },
          ],
        },
        shown,
      ),
    "all / any / not / answered compose",
  );
}

/* ---- number and range kinds ---------------------------------------------- */
{
  const numeric = {
    version: "t",
    groups: [
      {
        id: "g",
        label: { es: "G", en: "G" },
        title: { es: "G", en: "G" },
        lede: { es: "G", en: "G" },
        questions: [
          {
            id: "topics",
            kind: "multi-select",
            role: "topics",
            required: true,
            label: { es: "T", en: "T" },
            options: { kind: "registry", registry: "discovery-areas" },
          },
          {
            id: "spend",
            kind: "range",
            role: "budget-cap",
            min: 2000,
            max: 40000,
            step: 1000,
            default: 8000,
            label: { es: "S", en: "S" },
          },
          { id: "vials", kind: "number", min: 1, max: 99, label: { es: "V", en: "V" } },
        ],
      },
    ],
  };
  check(validateQuestionnaire(numeric).length === 0, "the numeric fixture validates");
  const nView = buildQuestionnaireView(numeric, "es", resolver([]));
  const spend = nView.groups[0].questions[1];
  const vials = nView.groups[0].questions[2];
  check(initialAnswers(nView).spend === 8000, "a range starts at its default");
  check(answerIssues(spend, 12000).length === 0, "a value inside the range is accepted");
  check(
    answerIssues(spend, 100).some((i) => i.code === "out_of_range"),
    "below the floor is not",
  );
  check(
    answerIssues(spend, 999999).some((i) => i.code === "out_of_range"),
    "nor above the ceiling",
  );
  check(
    answerIssues(vials, "3").some((i) => i.code === "wrong_type"),
    "a number takes a number",
  );
  check(answerIssues(vials, undefined).length === 0, "an optional number may be skipped");
  /* The budget role reads a number answer directly — tiers today, a slider tomorrow. */
  const profile = profileFromAnswers(
    nView,
    { ...initialAnswers(nView), topics: ["metabolic"], spend: 15000 },
    VOCABULARIES,
  );
  check(profile.budgetCap === 15000, "a range answer becomes the budget ceiling");
}

/* ---- roles: answers → profile, and defaults when a question is gone ------- */
{
  const profile = profileOf({
    topics: ["skin", "metabolic"],
    intent: "compare",
    "products-in-mind": [publishedProducts[0].slug],
    "first-name": "Mariana",
    experience: "experienced",
    priorities: ["price"],
    forms: ["solid"],
    "presentation-size": "largest",
    "include-supplies": true,
    budget: "20k",
    "purchase-horizon": "over-time",
    timing: "soon",
    note: "Quiero comparar precios",
  });
  check(same(profile.topics, ["skin", "metabolic"]), "ranked topics reach the profile in order");
  check(profile.intent === "compare", "an enum answer reaches the profile");
  check(profile.budgetCap === 20000, "an option's payload becomes the budget ceiling");
  check(profile.includeSupplies === true, "a toggle reaches the profile");
  check(profile.firstName === "Mariana" && profile.note === "Quiero comparar precios", "text too");
  check(same(profile.inMind, [publishedProducts[0].slug]), "named products reach the profile");
  check(profile.size === "largest" && profile.timing === "soon", "preferences reach the profile");

  /* An option id the policy does not recognise falls back, rather than leaking. */
  const unknown = profileFromAnswers(view, answersOf({ intent: "party" }), VOCABULARIES);
  check(unknown.intent === "first-order", "an unrecognised option id falls back to the default");

  /* Drop a question and its role defaults — the shorter questionnaire still works. */
  const shorter = {
    ...ATLAS_QUESTIONNAIRE,
    groups: ATLAS_QUESTIONNAIRE.groups.map((group) => ({
      ...group,
      questions: group.questions.filter(
        (question) => question.role !== "timing" && question.role !== "budget-cap",
      ),
    })),
  };
  const sView = buildQuestionnaireView(shorter, "es", resolver([]));
  const sProfile = profileFromAnswers(sView, answersOf({}, sView), VOCABULARIES);
  check(
    sProfile.timing === "no-rush" && sProfile.budgetCap === null,
    "a role no question fills falls back to its documented default",
  );
  check(
    applyAtlasPolicy(sProfile).constraints.startWithinBudget === false,
    "…and the policy still decides with it",
  );
}

/* ---- the ledger and the recap are built from the questionnaire ------------ */
{
  const ledger = ledgerOf({ topics: ["skin"], priorities: [], budget: "8k" });
  const byId = new Map(ledger.map((entry) => [entry.question, entry]));
  check(
    ledger.length === view.groups.flatMap((g) => g.questions).length,
    "every visible question appears in the ledger",
  );
  check(
    byId.get("topics").label === es.discovery.areas.skin.short ||
      byId.get("topics").label.length > 0,
    "a ledger row carries the question's own wording",
  );
  check(byId.get("budget").answer !== null, "an answered question shows its answer");
  check(
    same(byId.get("topics").uses, ["selection", "ranking", "explanation", "presentation"]),
    "the ledger reports the POLICY's permitted uses for the role",
  );
  check(
    byId.get("priorities").answered === false && byId.get("priorities").uses.length === 0,
    "a skipped question shows as skipped and used for nothing",
  );
  const recap = atlasRecap(view, answersOf({ topics: ["skin"] }), LEDGER_COPY);
  check(
    recap.length > 0 && recap.every((entry) => entry.label && entry.answer),
    "the recap carries label and answer for every question marked recap",
  );
  check(
    recap.every(
      (entry) =>
        view.groups.flatMap((g) => g.questions).find((q) => q.id === entry.question)?.recap,
    ),
    "…and nothing else",
  );
}

/* ---- policy: granular, and the name stays on the page --------------------- */
{
  const base = profileOf({ topics: ["skin"], budget: "20k", priorities: ["price"] });
  const ledgerEntry = (overrides, id) =>
    ledgerOf({ topics: ["skin"], budget: "20k", priorities: ["price"], ...overrides }).find(
      (entry) => entry.question === id,
    );
  const baseDecision = applyAtlasPolicy(base);

  for (const note of [
    "Tengo diabetes y tomo metformina",
    "¿Qué dosis debería usar?",
    "I have high blood pressure",
    "Peso 92 kg y quiero bajar de peso",
    "for personal use before the gym",
  ]) {
    const decision = applyAtlasPolicy({ ...base, note });
    const entry = ledgerEntry({ note }, "note");
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
    ledgerEntry({ "first-name": "Mariana" }, "first-name")?.withheld === "name-private",
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
    ["experience", { experience: "experienced" }],
    ["priorities", { priorities: ["documentation"] }],
    ["size", { size: "largest" }],
    ["budget", { budgetCap: 8000 }],
    ["horizon", { horizon: "over-time" }],
    ["timing", { timing: "soon" }],
    ["products in mind", { inMind: [publishedProducts[0].slug] }],
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
    !/\bAtlasProfile\b|profileFromAnswers/.test(source),
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
  functions: () => [],
});
const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
const deps = { relatedAreas: (id) => relatedAreas(id).map((r) => r.area.id), publicEvidence };

const outsideSkin = subjects.find(
  (s) => !s.areas.includes("longevity") && !s.areas.includes("metabolic") && s.entryPrice !== null,
);

/* ---- research functions: selection, ranking and the floor ----------------- */
{
  /* A product outside the visitor's topics, tagged with the chosen function. */
  const target = subjects.find((s) => !s.areas.includes("skin") && s.entryPrice !== null);
  const tagged = subjects.map((s) =>
    s.slug === target.slug ? { ...s, functions: ["wound-healing"] } : s,
  );
  const without = applyAtlasPolicy(profileOf({ topics: ["skin"] }, viewWithFunctions));
  const withFn = applyAtlasPolicy(
    profileOf({ topics: ["skin"], "research-functions": ["wound-healing"] }, viewWithFunctions),
  );
  const entry = ledgerOf(
    { topics: ["skin"], "research-functions": ["wound-healing"] },
    viewWithFunctions,
  ).find((e) => e.question === "research-functions");
  check(
    same(entry?.uses, ["selection", "ranking", "explanation"]),
    "research functions may select, rank and explain — not present",
  );
  check(
    same(withFn.narrative.functions, ["wound-healing"]),
    "the chosen research functions reach the narrative",
  );
  const before = retrieveAtlas(without.selection, tagged, deps);
  const after = retrieveAtlas(withFn.selection, tagged, deps);
  check(
    !before.candidates.some((c) => c.slug === target.slug),
    "without the function, a product outside the topics is not retrieved",
  );
  const hit = after.candidates.find((c) => c.slug === target.slug);
  check(
    hit !== undefined && same(hit.matchedFunctions, ["wound-healing"]),
    "a chosen research function retrieves its tagged product, whatever its area",
    target.slug,
  );
  check(
    after.candidates.every((c) => c.slug === target.slug || c.matchedFunctions.length === 0),
    "only tagged products carry a function match",
  );
  check(
    retrieveAtlas(withFn.selection, subjects, deps).candidates.every(
      (c) => c.matchedFunctions.length === 0,
    ),
    "untagged subjects never match a function",
  );
}

const PROFILES = {
  firstOrderNewcomer: profileOf({
    topics: ["metabolic"],
    intent: "first-order",
    experience: "new",
    priorities: ["signature"],
    "presentation-size": "smallest",
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
    "presentation-size": "largest",
    "include-supplies": true,
    budget: "40k",
    "purchase-horizon": "over-time",
  }),
  deepenWithProductInMind: profileOf({
    topics: ["longevity", "metabolic"],
    intent: "deepen",
    "products-in-mind": outsideSkin ? [outsideSkin.slug] : [],
    timing: "soon",
    "explanation-style": "detailed",
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
    "presentation-size": "largest",
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
