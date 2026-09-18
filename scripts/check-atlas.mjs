/**
 * check:atlas — NEOGEN Atlas, proved against fixtures and the live catalogue.
 *
 * What this gate guarantees, each with a negative control so it can fail:
 *
 *   SCHEMA        the questionnaire content is answerable: unique ids, no
 *                 forward-referencing condition, sane bounds.
 *   BINDINGS      every live question is classified in `fields.ts`; a withheld
 *                 field can do nothing but be shown back; nothing the server
 *                 validates depends on an answer it never receives.
 *   BRANCHES      every conditional follow-up of the live questionnaire
 *                 appears exactly when its condition holds, blocks its step
 *                 only while visible, and is dropped when hidden.
 *   TRANSMISSION  only permitted answers leave the browser, and the server
 *                 refuses to accept any other.
 *   PROFILE       answers become a profile in the pipeline's own terms; each
 *                 permitted answer changes it, and it has no slot for a
 *                 withheld value.
 *   NO LEAKS      changing ANY withheld answer, to anything, changes nothing
 *                 the policy, retrieval, the plan or the model's input sees.
 *   LEDGER        every visible question is accounted for, in both locales,
 *                 with its permitted uses or its reason for being withheld.
 *   POLICY        is granular: a health note is withheld without weakening any
 *                 other answer; the name never reaches the model; presentation-
 *                 only fields cannot move selection, and selection fields do.
 *   PINS          a product the policy requires is carried, with its reason,
 *                 through retrieval, the model's constraints and the validator.
 *   EVIDENCE      candidates carry approved statement ids only; the chosen
 *                 research function decides which leads; the validator
 *                 refuses a statement that is not the product's own.
 *   ISOLATION     nothing downstream of the policy reads the profile.
 *   RETRIEVAL     candidates follow the signals, and substantially different
 *                 profiles retrieve DIFFERENT products.
 *   PLAN          the no-model result validates in both locales, keeps "start
 *                 here" inside the budget, includes pinned products and covers
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
  validateQuestionnaire,
  visibleGroups,
  visibleQuestions,
} from "../src/domain/atlas/questionnaire/index.ts";
import { atlasRecap, buildAtlasLedger } from "../src/domain/atlas/ledger.ts";
import {
  ATLAS_BINDINGS,
  ATLAS_FIELD_IDS,
  ATLAS_FIELDS,
  fieldSpecOf,
} from "../src/domain/atlas/fields.ts";
import { buildAtlasProfile } from "../src/domain/atlas/profile.ts";
import {
  ATLAS_PRIVACY_POLICY,
  isFieldTransmitted,
  isTransmitted,
  transmittableAnswers,
  transmittedView,
  unreachableGrants,
  unusedTransmissions,
} from "../src/domain/atlas/privacy.ts";
import {
  ATLAS_PERMISSIONS,
  AtlasPolicyViolation,
  contextEntry,
  permits,
  projectProfile,
} from "../src/domain/atlas/policy.ts";
import {
  ACTIVE_ATLAS_POLICY,
  EXPERIENCE_LEVELS,
  GOAL_AREAS,
  RESTRICTED_POLICY,
} from "../src/domain/atlas/policies/index.ts";
import { createComposerEngine } from "../src/domain/atlas/engine.ts";
import { ATLAS_QUESTIONNAIRE } from "../src/content/atlas/questionnaire.ts";
import { RESEARCH_FUNCTIONS } from "../src/content/functions.ts";
import { publicStatementRefs } from "../src/content/overview/index.ts";
import { applyAtlasPolicy as applyPolicy } from "../src/domain/atlas/policy.ts";
import { ATLAS_CANDIDATE_LIMIT, retrieveAtlas } from "../src/domain/atlas/retrieval.ts";
import { effectiveStart, planAtlas } from "../src/domain/atlas/plan.ts";
import { atlasSubjectsFrom } from "../src/domain/atlas/subjects.ts";
import { composeAtlasGeneration } from "../src/domain/atlas/compose.ts";
import { validateAtlasGeneration } from "../src/domain/atlas/validate.ts";
import { buildAtlasInput } from "../src/server/atlas/prompt.ts";
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

/*
 * THE QUESTIONNAIRE, RESOLVED THE WAY THE SERVER RESOLVES IT.
 *
 * `server/atlas/questionnaire.ts` reads prices through the commerce layer, so
 * the registry resolver is rebuilt here from the same registries. The live
 * questionnaire has only static options today; the registry sources are
 * exercised by fixtures below.
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
const viewEn = buildQuestionnaireView(ATLAS_QUESTIONNAIRE, "en", resolver([]));
const questionsOf = (v) => v.groups.flatMap((g) => g.questions);
const questionById = (id, v = view) => questionsOf(v).find((q) => q.id === id);
const optionIds = (id) => questionById(id).options.map((o) => o.id);

const LEDGER_COPY = {
  yes: es.atlas.result.ledger.yes,
  no: es.atlas.result.ledger.no,
  noteGiven: es.atlas.result.ledger.noteGiven,
};
const LEDGER_COPY_EN = {
  yes: en.atlas.result.ledger.yes,
  no: en.atlas.result.ledger.no,
  noteGiven: en.atlas.result.ledger.noteGiven,
};

/*
 * A VISITOR WHO ANSWERED EVERYTHING — the withheld answers carry canaries, so
 * a leak anywhere downstream is a string search away.
 */
const CANARY = "ZQXCANARY";
const permittedAnswers = {
  goal: "weight-loss",
  "peptide-experience": "beginner",
  "additional-notes": "Quiero empezar con la línea insignia y comparar presentaciones.",
};
const withheldAnswers = {
  "goal-weight-loss": "satiety",
  age: "36-45",
  "biological-sex": "female",
  "weight-kg": 92.5,
  "height-cm": 164,
  "physical-activity": "light",
  "sleep-quality": "poor",
  stress: "high",
  "previous-compounds": `${CANARY}-retatrutida`,
  "administration-route": "subcutaneous",
  "protocol-duration": "12-weeks",
  "health-conditions": ["diabetes", "hypertension"],
  medications: ["diabetes", "other"],
  "other-medications": `${CANARY}-metformina`,
  "current-frustrations": `${CANARY}-hambre nocturna`,
  "ninety-day-goal": `${CANARY}-bajar 8 kg`,
  "training-type": "strength",
  "injection-tolerance": "high",
  "daily-schedule": "rotating",
  "work-type": "seated",
  alcohol: "weekly",
  caffeine: "3",
  "main-priority": "aesthetics",
  injuries: `${CANARY}-rodilla`,
};
const everything = { ...initialAnswers(view), ...permittedAnswers, ...withheldAnswers };

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
  check(
    codes(q([{ id: "n", kind: "number", label: { es: "N", en: "N" }, min: 1 }])).length === 0,
    "a number question may be open-ended above its floor",
  );
}

/* ---- the resolved view, in both locales ----------------------------------- */
{
  const ids = questionsOf(view).map((question) => question.id);
  check(ids.length === new Set(ids).size, "every question appears once in the view");
  check(
    same(
      ids,
      questionsOf(viewEn).map((q) => q.id),
    ),
    "both locales resolve the same questions in the same order",
  );
  for (const question of questionsOf(view)) {
    const other = questionById(question.id, viewEn);
    check(
      question.label.length > 0 && other.label.length > 0,
      "every question has a label in both locales",
      question.id,
    );
    check(
      same(
        question.options.map((o) => o.id),
        other.options.map((o) => o.id),
      ),
      "option ids are identical across locales",
      question.id,
    );
    check(
      question.options.every((o) => o.label.length > 0) &&
        other.options.every((o) => o.label.length > 0),
      "every option has a label in both locales",
      question.id,
    );
  }
  check(questionById("goal").label !== questionById("goal", viewEn).label, "wording is localised");
  check(
    questionById("weight-kg").max === null && questionById("weight-kg").min === 1,
    "an open-ended number resolves with no ceiling",
  );
  check(
    questionsOf(view).every((q) => q.registry === null),
    "the live questionnaire's options are static (registry sources are fixture-tested)",
  );

  /* Registry sources, through a fixture. */
  const fixture = {
    version: "t",
    groups: [
      {
        id: "g",
        label: { es: "G", en: "G" },
        title: { es: "G", en: "G" },
        lede: { es: "G", en: "G" },
        questions: [
          {
            id: "areas",
            kind: "multi-select",
            label: { es: "A", en: "A" },
            options: { kind: "registry", registry: "discovery-areas" },
          },
          {
            id: "fns",
            kind: "multi-select",
            hideWithoutOptions: true,
            label: { es: "F", en: "F" },
            options: { kind: "registry", registry: "research-functions" },
          },
        ],
      },
    ],
  };
  const without = buildQuestionnaireView(fixture, "es", resolver([]));
  const withFns = buildQuestionnaireView(fixture, "es", resolver(functionOptions));
  const areas = questionsOf(without).find((q) => q.id === "areas");
  check(
    areas.registry === "discovery-areas" &&
      areas.options.length === publicAreas().length &&
      areas.options.every((o) => o.meta?.area),
    "registry options are read from the registry, with their own facts",
  );
  check(
    !questionsOf(without).some((q) => q.id === "fns") &&
      questionsOf(withFns).some((q) => q.id === "fns"),
    "a registry question with nothing to offer is dropped, and returns with options",
  );
}

/** The active policy, unless a test names another. */
const applyAtlasPolicy = (profile, policy = ACTIVE_ATLAS_POLICY) => applyPolicy(profile, policy);
const POLICY = ACTIVE_ATLAS_POLICY;

/* ---- representation, transmission, permission: three separate tables ----- */
{
  const liveIds = questionsOf(view).map((q) => q.id);
  for (const id of liveIds) {
    check(id in ATLAS_BINDINGS, "every live question is bound to a profile field", id);
  }
  for (const [question, field] of Object.entries(ATLAS_BINDINGS)) {
    check(liveIds.includes(question), "every binding names a live question", question);
    check(field in ATLAS_FIELDS, "every binding names a declared field", `${question} → ${field}`);
  }
  for (const [field, spec] of Object.entries(ATLAS_FIELDS)) {
    check(
      ["enum", "enum-list", "number", "boolean", "text"].includes(spec.kind) &&
        ["standard", "personal", "sensitive"].includes(spec.sensitivity) &&
        typeof spec.category === "string",
      "every field declares its kind, category and sensitivity",
      field,
    );
    check(
      !("uses" in spec) && !("withheld" in spec) && !("transmit" in spec),
      "the field schema grants nothing: no uses, no withholding, no transmission",
      field,
    );
    check(field in ATLAS_PRIVACY_POLICY, "every field has an explicit transmission rule", field);
    check(field in POLICY.permissions, "the active policy states every field explicitly", field);
  }
  for (const category of ["health", "body", "administration", "use-history"]) {
    for (const [field, spec] of Object.entries(ATLAS_FIELDS)) {
      if (spec.category !== category || field === "age-band" || field === "sex") continue;
      check(
        spec.sensitivity === "sensitive",
        "health, body, administration and use-history fields are sensitive",
        field,
      );
    }
  }

  /* Transmission: every sensitive field that crosses carries a written basis. */
  for (const field of ATLAS_FIELD_IDS) {
    const rule = ATLAS_PRIVACY_POLICY[field];
    if (rule.transmit && ATLAS_FIELDS[field].sensitivity === "sensitive") {
      check(rule.basis.trim().length > 20, "a transmitted sensitive field states its basis", field);
    }
  }
  check(
    unreachableGrants(POLICY).length === 0,
    "the active policy is granted no server-side use of a field that never reaches the server",
    unreachableGrants(POLICY).join(","),
  );
  check(
    unusedTransmissions(POLICY).length === 0,
    "nothing is transmitted that the active policy does not use on the server (minimisation)",
    unusedTransmissions(POLICY).join(","),
  );

  /* Permissions: the active policy's grants over the sensitive fields. */
  for (const field of ATLAS_FIELD_IDS) {
    if (ATLAS_FIELDS[field].sensitivity !== "sensitive") continue;
    check(
      !permits(POLICY, field, "ai-context") && !permits(POLICY, field, "retrieval"),
      "the active policy gives the model and retrieval no sensitive field",
      field,
    );
    if (field !== "goal") {
      check(
        !permits(POLICY, field, "candidate-selection"),
        "the active policy selects from no sensitive field but the goal (as its area)",
        field,
      );
    }
  }
  check(
    permits(POLICY, "goal", "candidate-selection") && !permits(POLICY, "goal", "ai-context"),
    "candidate selection and AI context are separate grants: the goal selects, the model never sees it",
  );
  check(
    permits(POLICY, "context-note", "ai-context") &&
      !permits(POLICY, "context-note", "candidate-selection"),
    "…and the reverse: the note reaches the model and selects nothing",
  );

  /* The server validates transmitted questions only; their visibility and
     requirements must not hang on an answer it never receives. */
  const refs = (condition) =>
    condition === null
      ? []
      : "all" in condition
        ? condition.all.flatMap(refs)
        : "any" in condition
          ? condition.any.flatMap(refs)
          : "not" in condition
            ? refs(condition.not)
            : [condition.question];
  for (const question of questionsOf(view).filter((q) => isTransmitted(q.id))) {
    for (const ref of refs(question.visibleWhen)) {
      check(
        isTransmitted(ref),
        "a transmitted question's visibility depends only on transmitted answers",
        `${question.id} ← ${ref}`,
      );
    }
  }
  for (const question of questionsOf(view).filter((q) => q.required)) {
    check(
      isTransmitted(question.id),
      "a required question is one the server receives",
      question.id,
    );
  }
  for (const option of optionIds("goal")) {
    check(
      option in GOAL_AREAS &&
        GOAL_AREAS[option].every((a) => publicAreas().some((p) => p.id === a)),
      "every goal option translates to real catalogue areas",
      option,
    );
  }
  for (const option of optionIds("peptide-experience")) {
    check(option in EXPERIENCE_LEVELS, "every experience option translates to a level", option);
  }
  const sent = liveIds.filter(isTransmitted);
  check(
    same(sent, ["goal", "peptide-experience", "additional-notes"]),
    "exactly the three permitted questions are transmitted",
    sent.join(","),
  );
  check(
    fieldSpecOf("an-unbound-question").sensitivity === "sensitive" &&
      !isTransmitted("an-unbound-question"),
    "an unbound question fails closed: sensitive, never sent (negative control)",
  );
}

/* ---- every conditional branch of the live questionnaire ------------------- */
{
  const followUps = questionsOf(view).filter(
    (q) => q.visibleWhen && "question" in q.visibleWhen && q.visibleWhen.question === "goal",
  );
  check(followUps.length === optionIds("goal").length, "every goal has its own follow-up");
  for (const goal of optionIds("goal")) {
    const answers = { ...initialAnswers(view), goal };
    const visible = visibleQuestions(view.groups[0], answers).map((q) => q.id);
    const shown = followUps.filter((q) => visible.includes(q.id)).map((q) => q.id);
    check(
      shown.length === 1 && shown[0] === `goal-${goal}`,
      "a goal shows exactly its own follow-up",
      `${goal} → ${shown.join(",")}`,
    );
    /* A follow-up is optional: the step completes without it. */
    check(groupComplete(view.groups[0], answers), "the goal step completes once a goal is chosen");
    const followUp = questionById(`goal-${goal}`);
    for (const option of followUp.options) {
      check(
        groupComplete(view.groups[0], { ...answers, [followUp.id]: option.id }),
        "every follow-up option is accepted",
        `${followUp.id}/${option.id}`,
      );
    }
    /* An answer to a DIFFERENT goal's follow-up is dropped, never stored. */
    const other = followUps.find((q) => q.id !== `goal-${goal}`);
    const parsed = parseAtlasAnswers({ goal, [other.id]: other.options[0].id }, view);
    check(
      parsed.ok && parsed.answers[other.id] === undefined,
      "an answer to a hidden goal follow-up is dropped",
      `${goal} / ${other.id}`,
    );
  }
  check(
    !groupComplete(view.groups[0], initialAnswers(view)),
    "the goal step blocks until a goal is chosen (required)",
  );
  check(
    visibleQuestions(view.groups[0], initialAnswers(view)).length === 1,
    "with no goal, no follow-up is shown",
  );

  /* previous-compounds: shown for any experience but none. */
  const you = view.groups.find((g) => g.questions.some((q) => q.id === "previous-compounds"));
  for (const level of optionIds("peptide-experience")) {
    const shown = visibleQuestions(you, { "peptide-experience": level }).some(
      (q) => q.id === "previous-compounds",
    );
    check(
      shown === (level !== "none"),
      "previous compounds are asked exactly when there is experience",
      level,
    );
  }
  check(
    !visibleQuestions(you, {}).some((q) => q.id === "previous-compounds"),
    "…and not before experience is answered",
  );

  /* other-medications: shown only while "other" is among the medications. */
  const prefs = view.groups.find((g) => g.questions.some((q) => q.id === "other-medications"));
  for (const [answer, expected] of [
    [["other"], true],
    [["diabetes", "other"], true],
    [["diabetes"], false],
    [["none"], false],
    [[], false],
  ]) {
    check(
      visibleQuestions(prefs, { medications: answer }).some((q) => q.id === "other-medications") ===
        expected,
      "the other-medications follow-up tracks the medications answer",
      JSON.stringify(answer),
    );
  }
  const hiddenOther = parseAtlasAnswers(
    { goal: "sleep", medications: ["none"], "other-medications": "x" },
    view,
  );
  check(
    hiddenOther.ok && hiddenOther.answers["other-medications"] === undefined,
    "a hidden medications follow-up is dropped",
  );

  /* Every step can be completed with only the required answers. */
  const minimal = { ...initialAnswers(view), goal: "longevity" };
  for (const group of visibleGroups(view, minimal)) {
    check(
      groupComplete(group, minimal),
      "every step completes with optional answers skipped",
      group.id,
    );
  }
  check(visibleGroups(view, minimal).length === view.groups.length, "every group is shown");

  /* The fixture the engine's combinators are proved on. */
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
        questions: [{ id: "note", kind: "long-text", maxLength: 50, label: { es: "N", en: "N" } }],
      },
    ],
  };
  check(validateQuestionnaire(conditional).length === 0, "the conditional fixture validates");
  const cView = buildQuestionnaireView(conditional, "es", resolver([]));
  const hidden = { experience: "some" };
  const shown = { experience: "new" };
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

/* ---- answers: the parser rejects what the schema does not describe -------- */
{
  const ok = parseAtlasAnswers(everything, view);
  check(ok.ok, "a complete set of answers parses", ok.ok ? "" : JSON.stringify(ok.issues));
  check(parseAtlasAnswers({ goal: "cognition" }, view).ok, "optional questions may be absent");
  for (const [label, answers] of [
    ["an unknown question", { ...everything, favouriteColour: "blue" }],
    ["an unknown option", { ...everything, goal: "astrology" }],
    ["no answer to a required question", { ...everything, goal: "" }],
    ["a single-select given a list", { ...everything, goal: ["sleep"] }],
    ["a multi-select given a string", { ...everything, "health-conditions": "diabetes" }],
    ["a repeated selection", { ...everything, medications: ["diabetes", "diabetes"] }],
    ["a number given a string", { ...everything, "weight-kg": "92" }],
    ["a number below its floor", { ...everything, "height-cm": 0 }],
    ["text over its limit", { ...everything, "additional-notes": "x".repeat(401) }],
    ["a body that is not an object", null],
  ]) {
    check(!parseAtlasAnswers(answers, view).ok, `the parser rejects ${label}`);
  }
  const numeric = questionById("weight-kg");
  check(
    answerIssues(numeric, 250).length === 0,
    "an open-ended number accepts any value above its floor",
  );
}

/* ---- transmission: only permitted answers leave the browser --------------- */
{
  const sent = transmittableAnswers(everything);
  check(
    same(Object.keys(sent).sort(), Object.keys(permittedAnswers).sort()),
    "the browser sends exactly the permitted answers",
    Object.keys(sent).join(","),
  );
  check(!JSON.stringify(sent).includes(CANARY), "no withheld text is in the request body");
  const serverView = transmittedView(view);
  check(
    same(
      questionsOf(serverView).map((q) => q.id),
      ["goal", "peptide-experience", "additional-notes"],
    ),
    "the server validates against the transmitted questions only",
  );
  /* A client that sends withheld answers anyway: the route's two steps. */
  const refused = parseAtlasAnswers(everything, serverView);
  check(!refused.ok, "the server's view refuses a withheld answer outright");
  const stripped = parseAtlasAnswers(transmittableAnswers(everything), serverView);
  check(
    stripped.ok && same(Object.keys(stripped.answers).sort(), Object.keys(permittedAnswers).sort()),
    "…and the route's strip-then-parse accepts the permitted remainder",
  );
  check(
    new TextEncoder().encode(JSON.stringify({ locale: "es", answers: sent })).length < 4096,
    "a full request fits the route's body limit",
  );
}

/* ---- the profile: the COMPLETE questionnaire, typed ---------------------- */
const deviceProfile = (answers, v = view) => buildAtlasProfile(v, answers, "device");
const serverProfile = (answers, v = view) =>
  buildAtlasProfile(v, transmittableAnswers(answers), "server");
const profileOf = serverProfile;
const baseAnswers = { ...initialAnswers(view), ...permittedAnswers };
{
  const full = deviceProfile(everything);
  check(
    same(Object.keys(full.fields).sort(), [...ATLAS_FIELD_IDS].sort()),
    "the profile has an entry for every declared field",
  );
  /* Every answer — sensitive ones included — is in the device profile, typed. */
  for (const [question, raw] of Object.entries({ ...permittedAnswers, ...withheldAnswers })) {
    const field = ATLAS_BINDINGS[question];
    const entry = full.fields[field];
    check(
      entry.source === "answer" && entry.questions.includes(question),
      "every answered question is represented in the profile",
      question,
    );
    const expected =
      typeof raw === "string" && ATLAS_FIELDS[field].kind === "text" ? raw.trim() : raw;
    check(same(entry.value, expected), "…with its value, normalised to its kind", question);
  }
  check(typeof full.fields["weight-kg"].value === "number", "a number field holds a number");
  check(Array.isArray(full.fields.conditions.value), "a list field holds a list");
  check(
    full.fields["medications-other"].value.includes(CANARY),
    "sensitive free text is kept in the device profile, not discarded",
  );
  check(
    full.fields.intent.source === "not-asked" && full.fields.intent.value === null,
    "a field no question asks for is marked not-asked, not invented",
  );
  const skipped = deviceProfile({ goal: "sleep" });
  check(
    skipped.fields.experience.source === "unanswered" && skipped.fields.experience.value === null,
    "a skipped question is marked unanswered",
  );
  check(
    deviceProfile({ ...everything, goal: "sleep" }).fields["goal-focus"].source === "unanswered",
    "an answer to a hidden follow-up is not taken as the field's value",
  );

  /* An unbound question is kept, not dropped. */
  const extended = {
    ...ATLAS_QUESTIONNAIRE,
    groups: ATLAS_QUESTIONNAIRE.groups.map((group, i) =>
      i === 0
        ? {
            ...group,
            questions: [
              ...group.questions,
              {
                id: "new-question",
                kind: "short-text",
                maxLength: 40,
                label: { es: "N", en: "N" },
              },
            ],
          }
        : group,
    ),
  };
  const xView = buildQuestionnaireView(extended, "es", resolver([]));
  const xProfile = deviceProfile({ ...everything, "new-question": "hola" }, xView);
  check(
    same(xProfile.unbound, [{ question: "new-question", value: "hola" }]),
    "an answer to an unbound question is represented in profile.unbound",
  );
  check(
    buildAtlasProfile(
      xView,
      transmittableAnswers({ ...everything, "new-question": "hola" }),
      "server",
    ).unbound.length === 0,
    "…and never transmitted",
  );

  /* The SERVER profile: same type, untransmitted fields marked, never guessed. */
  const server = serverProfile(everything);
  for (const field of ATLAS_FIELD_IDS) {
    const entry = server.fields[field];
    if (full.fields[field].source === "not-asked") continue;
    if (isFieldTransmitted(field)) {
      check(
        same(entry.value, full.fields[field].value),
        "a transmitted field arrives intact",
        field,
      );
    } else {
      check(
        entry.source === "not-received" && entry.value === null,
        "a device-only field is present on the server as not-received",
        field,
      );
    }
  }
  check(!JSON.stringify(server).includes(CANARY), "no device-only text reaches the server profile");
  check(
    same(buildAtlasProfile(view, everything, "server"), server),
    "the server profile ignores device-only answers even when they arrive (strip bypassed)",
  );

  /* Projection is a READ: applying the policy never changes the profile. */
  const snapshot = JSON.stringify(full);
  for (const permission of ATLAS_PERMISSIONS) projectProfile(full, POLICY, permission);
  applyAtlasPolicy(full);
  check(JSON.stringify(full) === snapshot, "applying a policy never modifies the profile");
  const selection = projectProfile(full, POLICY, "candidate-selection");
  const context = projectProfile(full, POLICY, "ai-context");
  check(
    "goal" in selection.fields &&
      !("goal" in context.fields) &&
      !("conditions" in selection.fields) &&
      !("conditions" in context.fields) &&
      full.fields.conditions.value !== null,
    "a projection carries only the granted fields; the profile keeps the rest",
  );
}

/* ---- the live catalogue, as retrieval sees it ----------------------------- */
const variantIds = publishedProducts.flatMap((p) => p.variants.map((v) => v.id));
const [prices, availability] = await Promise.all([
  getPrices(variantIds),
  getAvailability(variantIds),
]);
const subjectDeps = {
  price: (id) => prices.get(id)?.amount ?? null,
  availability: (id) => availability.get(id) ?? null,
  areas: (slug) => publicAreasFor(slug).map((a) => a.id),
  documented: (product) => publicEvidenceIndex([product]).length > 0,
  references: (slug) => referencesForProduct(slug).map((r) => r.id),
  evidence: (slug) => publicStatementRefs(slug),
  functions: () => [],
};
const subjects = atlasSubjectsFrom(publishedProducts, subjectDeps);
const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
const deps = { relatedAreas: (id) => relatedAreas(id).map((r) => r.area.id), publicEvidence };
const nameOf = new Map(publishedProducts.map((p) => [p.slug, p.name]));

/** Everything downstream of the answers, down to the model's exact input. */
/*
 * The pipeline from a COMPLETE DEVICE profile — every sensitive value present —
 * so what is proved below is the POLICY's boundary alone, not the privacy
 * strip's. (The server never even receives those values; that is tested above.)
 */
function pipeline(answers, locale = "es", policy = POLICY) {
  const profile = deviceProfile(answers);
  const decision = applyAtlasPolicy(profile, policy);
  const retrieval = retrieveAtlas(decision.selection, subjects, deps);
  const plan = planAtlas(retrieval, decision.constraints);
  const input = buildAtlasInput({
    context: decision.context,
    narrative: decision.narrative,
    constraints: decision.constraints,
    retrieval,
    locale,
    dict: locale === "es" ? es : en,
    productName: (slug) => nameOf.get(slug) ?? slug,
  });
  return { profile, decision, retrieval, plan, input };
}
const downstream = (run) =>
  JSON.stringify({
    selection: run.decision.selection,
    constraints: run.decision.constraints,
    narrative: run.decision.narrative,
    presentation: run.decision.presentation,
    context: run.decision.context,
    candidates: run.retrieval.candidates.map((c) => c.slug),
    plan: [run.plan.start.map((c) => c.slug), run.plan.more.map((c) => c.slug)],
    input: run.input,
  });

/* ---- no leaks: no withheld answer, whatever its value, moves anything ----- */
{
  const baseline = pipeline(baseAnswers);
  const baseDownstream = downstream(baseline);
  const variants = (question) => {
    switch (question.kind) {
      case "single-select":
        return question.options.map((o) => o.id);
      case "multi-select":
        return [
          [],
          ...question.options.map((o) => [o.id]),
          question.options.slice(0, 3).map((o) => o.id),
        ];
      case "number":
        return [question.min, question.min + 1, 250, 999];
      case "long-text":
      case "short-text":
        return [`${CANARY} diabetes, metformina, 8 kg`, `${CANARY} BPC-157 y retatrutida`, ""];
      default:
        return [];
    }
  };
  let sweeps = 0;
  for (const question of questionsOf(view)) {
    if (isTransmitted(question.id)) continue;
    for (const value of variants(question)) {
      /* Make the question visible, so a leak could not hide behind visibility. */
      const answers = {
        ...baseAnswers,
        medications: question.id === "other-medications" ? ["other"] : baseAnswers.medications,
        [question.id]: value,
      };
      if (question.id.startsWith("goal-")) answers.goal = question.id.slice("goal-".length);
      const run = pipeline(answers);
      const comparable = question.id.startsWith("goal-")
        ? downstream(pipeline({ ...baseAnswers, goal: answers.goal }))
        : baseDownstream;
      sweeps += 1;
      check(
        downstream(run) === comparable,
        "a withheld answer changes nothing downstream (selection, constraints, narrative, retrieval, plan, model input)",
        `${question.id}=${JSON.stringify(value)}`,
      );
      check(!run.input.includes(CANARY), "no withheld text reaches the model's input", question.id);
    }
  }
  check(sweeps > 100, "the leak sweep covered every withheld question and option", String(sweeps));

  /* And all of them at once, with every canary. */
  const all = pipeline(everything);
  check(downstream(all) === baseDownstream, "every withheld answer together changes nothing");
  for (const term of [
    "satiety",
    "subcutaneous",
    "12-weeks",
    "diabetes",
    "female",
    "92.5",
    CANARY,
  ]) {
    check(!all.input.includes(term), "the model's input carries no withheld value", term);
  }
}

/* ---- meaningful answers move what they are permitted to move ------------- */
{
  const run = (patch) => pipeline({ ...baseAnswers, ...patch });
  const base = run({});

  /* goal → candidate selection only (as its area); never the model's context */
  const byGoal = Object.fromEntries(optionIds("goal").map((goal) => [goal, run({ goal })]));
  for (const [goal, r] of Object.entries(byGoal)) {
    check(
      same(r.decision.selection.topics, GOAL_AREAS[goal]),
      "the goal's area drives selection",
      goal,
    );
    check(
      same(r.decision.narrative.topics, GOAL_AREAS[goal]) &&
        !r.decision.narrative.asked.includes("goal") &&
        !r.decision.context.some((e) => e.field === "goal"),
      "the model learns the selection's catalogue areas, never the goal itself",
      goal,
    );
    check(!r.input.includes(`goal [`), "no goal line in the model's context", goal);
    check(r.retrieval.candidates.length > 0, "every goal retrieves candidates", goal);
    for (const candidate of r.retrieval.candidates) {
      check(
        GOAL_AREAS[goal].length === 0 || candidate.matchedAreas.length > 0 || candidate.pin,
        "every candidate is in the goal's area",
        `${goal}: ${candidate.slug}`,
      );
    }
    /* The model is told the AREA, never the goal's own words. */
    const goalLabels = [
      questionById("goal").options.find((o) => o.id === goal).label,
      questionById("goal", viewEn).options.find((o) => o.id === goal).label,
    ];
    for (const label of goalLabels) {
      check(
        !r.input.includes(label),
        "the goal's wording never reaches the model",
        `${goal}: ${label}`,
      );
    }
  }
  const slugsOf = (r) => r.retrieval.candidates.map((c) => c.slug).join(",");
  check(
    slugsOf(byGoal["weight-loss"]) !== slugsOf(byGoal["skin-hair"]) &&
      slugsOf(byGoal["cognition"]) !== slugsOf(byGoal["longevity"]),
    "different goals retrieve different products",
  );
  check(
    slugsOf(byGoal.sleep) === slugsOf(byGoal.cognition),
    "goals that map to the same catalogue area retrieve the same products (area, not outcome)",
  );
  check(
    byGoal["daily-wellbeing"].retrieval.candidates.every((c) =>
      c.reasons.some((r) => r.code === "catalogue-wide"),
    ) && byGoal["daily-wellbeing"].input.includes("whole catalogue"),
    "a goal with no catalogue area falls back to the catalogue as a whole, and says so",
  );

  /* experience → filtering and personalization */
  const levels = optionIds("peptide-experience").map((level) =>
    run({ "peptide-experience": level }),
  );
  check(
    !same(levels[0].decision.constraints, levels[3].decision.constraints) ||
      !same(levels[0].decision.selection.weights, levels[3].decision.selection.weights),
    "experience changes the constraints or weights",
  );
  check(
    levels[0].decision.constraints.start.max <= 2 &&
      levels[0].decision.narrative.experience === "new",
    "no experience starts small, and the model is told so",
  );
  check(
    levels.every((r) => r.decision.narrative.asked.includes("experience")),
    "an answered experience is marked as answered",
  );

  /* note → personalization only */
  const noted = run({ "additional-notes": "Prefiero empezar con una sola compra." });
  const noteEntry = noted.decision.context.find((e) => e.field === "context-note");
  check(
    noteEntry?.value === "Prefiero empezar con una sola compra." &&
      noteEntry.category === "context" &&
      noted.input.includes("<visitor_text>Prefiero empezar con una sola compra.</visitor_text>") &&
      same(noted.decision.selection, base.decision.selection),
    "a clean note reaches the model as fenced text, labelled, and moves no selection",
  );
  const health = run({ "additional-notes": "Tengo diabetes y tomo metformina" });
  check(
    !health.decision.context.some((e) => e.field === "context-note") &&
      !health.input.includes("metformina") &&
      health.decision.noteDiscarded &&
      !health.decision.narrative.asked.includes("context-note"),
    "a health note is discarded before the model",
  );
  check(
    deviceProfile({ ...baseAnswers, "additional-notes": "Tengo diabetes y tomo metformina" })
      .fields["context-note"].value === "Tengo diabetes y tomo metformina",
    "…while the profile still holds it: discarding is the policy's act, not the profile's",
  );
  check(
    base.decision.context.every((e) => permits(POLICY, e.field, "ai-context")) &&
      base.decision.context.every((e) => e.sensitivity !== "sensitive"),
    "the engine context is exactly the ai-context projection, with no sensitive field",
  );

  /* Unasked fields are never described as the visitor's choice. */
  for (const line of ["wants to: not asked", "budget: not asked", "formats: not asked"]) {
    check(base.input.includes(line), "a default is labelled 'not asked' for the model", line);
  }
}

/* ---- the ledger and the recap, built in the browser ------------------------ */
{
  for (const [v, copy, locale] of [
    [view, LEDGER_COPY, "es"],
    [viewEn, LEDGER_COPY_EN, "en"],
  ]) {
    const dict = locale === "es" ? es : en;
    const ledger = buildAtlasLedger(v, everything, copy, POLICY, false);
    const visible = visibleGroups(v, everything).flatMap((g) => visibleQuestions(g, everything));
    check(ledger.length === visible.length, "every visible question appears in the ledger", locale);
    const byId = new Map(ledger.map((entry) => [entry.question, entry]));
    const goal = byId.get("goal");
    check(
      same(goal.permissions, POLICY.permissions.goal) &&
        goal.withheld === null &&
        goal.transmitted &&
        goal.sensitivity === "sensitive",
      "the goal's row reports its permissions, transmission and sensitivity separately",
      locale,
    );
    for (const id of Object.keys(withheldAnswers)) {
      const entry = byId.get(id);
      const field = ATLAS_BINDINGS[id];
      check(
        entry &&
          !entry.transmitted &&
          entry.withheld === ATLAS_FIELDS[field].category &&
          entry.sensitivity === ATLAS_FIELDS[field].sensitivity &&
          entry.permissions.every((p) => p === "recap"),
        "a device-only answer shows its category, sensitivity and no server use",
        `${locale}: ${id}`,
      );
      check(
        entry.withheld in dict.atlas.result.ledger.withheld,
        "every withholding reason has copy",
        `${locale}: ${entry.withheld}`,
      );
    }
    check(!JSON.stringify(ledger).includes(CANARY), "free text is never echoed back", locale);
    for (const permission of ATLAS_PERMISSIONS) {
      check(permission in dict.atlas.result.ledger.uses, "every permission has copy", permission);
    }
    for (const category of new Set(Object.values(ATLAS_FIELDS).map((f) => f.category))) {
      check(category in dict.atlas.result.ledger.withheld, "every category has copy", category);
    }
    const recap = atlasRecap(v, everything, copy, POLICY);
    check(
      same(
        recap.map((r) => r.question),
        ["goal", "goal-weight-loss"],
      ),
      "the recap echoes the goal and its follow-up, and nothing else",
      `${locale}: ${recap.map((r) => r.question).join(",")}`,
    );
  }
  const discarded = buildAtlasLedger(
    view,
    { ...baseAnswers, "additional-notes": "Tengo diabetes" },
    LEDGER_COPY,
    POLICY,
    true,
  ).find((e) => e.question === "additional-notes");
  check(
    discarded.withheld === "health-note" && discarded.permissions.length === 0,
    "the ledger records a discarded note",
  );
  const skipped = buildAtlasLedger(view, { goal: "sleep" }, LEDGER_COPY, POLICY, false).find(
    (e) => e.question === "peptide-experience",
  );
  check(
    !skipped.answered && skipped.permissions.length === 0,
    "a skipped question is used for nothing",
  );

  /* A recap flag in the content cannot echo what the policy does not permit. */
  const flagged = {
    ...ATLAS_QUESTIONNAIRE,
    groups: ATLAS_QUESTIONNAIRE.groups.map((group) => ({
      ...group,
      questions: group.questions.map((q) =>
        q.id === "health-conditions" ? { ...q, recap: true } : q,
      ),
    })),
  };
  const fView = buildQuestionnaireView(flagged, "es", resolver([]));
  check(
    !atlasRecap(fView, everything, LEDGER_COPY, POLICY).some(
      (r) => r.question === "health-conditions",
    ),
    "a recap flag cannot echo an answer the policy does not permit to recap",
  );
}

/** A profile with some fields set as answered — for fields v4 does not ask. */
const withFields = (profile, patch) => ({
  ...profile,
  fields: {
    ...profile.fields,
    ...Object.fromEntries(
      Object.entries(patch).map(([field, value]) => [
        field,
        { value, source: "answer", questions: [] },
      ]),
    ),
  },
});

/* ---- policy: granular, and the name stays on the page --------------------- */
{
  const start = withFields(deviceProfile(baseAnswers), { budget: 20000, priorities: ["price"] });
  const base = withFields(start, { "context-note": "" });
  const baseDecision = applyAtlasPolicy(base);
  const noteOf = (d) => d.context.find((e) => e.field === "context-note")?.value ?? null;

  for (const note of [
    "Tengo diabetes y tomo metformina",
    "¿Qué dosis debería usar?",
    "I have high blood pressure",
    "Peso 92 kg y quiero bajar de peso",
    "for personal use before the gym",
  ]) {
    const decision = applyAtlasPolicy(withFields(start, { "context-note": note }));
    check(
      decision.noteDiscarded && noteOf(decision) === null,
      "a note with health detail is withheld from the model",
      note,
    );
    check(
      same(decision.selection, baseDecision.selection) &&
        same(decision.constraints, baseDecision.constraints) &&
        same(decision.narrative, baseDecision.narrative),
      "withholding a note weakens nothing else (granular, not global)",
      note,
    );
  }
  for (const note of [
    "Quiero empezar con algo de la línea insignia y seguir después",
    "Me interesa comparar precios antes de mi primera compra",
    "Tengo un presupuesto de 20 mil pesos para el trimestre",
    "I'd like to build a set across two topics over a few orders",
  ]) {
    const decision = applyAtlasPolicy(withFields(start, { "context-note": note }));
    check(
      !decision.noteDiscarded && noteOf(decision) === note,
      "an ordinary note reaches the model (negative control)",
      note,
    );
  }

  const named = applyAtlasPolicy(withFields(base, { name: "Mariana" }));
  check(
    !JSON.stringify(named.narrative).includes("Mariana") &&
      !JSON.stringify(named.context).includes("Mariana") &&
      !JSON.stringify(named.selection).includes("Mariana"),
    "the name never reaches the model or selection",
  );
  check(named.presentation.firstName === "Mariana", "the name personalises the page");

  /* Presentation-only fields cannot move selection… */
  for (const [label, patch] of [
    ["name", { name: "Mariana" }],
    ["history", { history: "returning" }],
    ["style", { style: "detailed" }],
  ]) {
    const decision = applyAtlasPolicy(withFields(base, patch));
    check(
      same(decision.selection, baseDecision.selection) &&
        same(decision.constraints, baseDecision.constraints),
      "a presentation-only field does not change selection",
      label,
    );
  }
  /* …and every selection field does — the pipeline can take them the day a
     question asks. */
  for (const [label, patch] of [
    ["goal", { goal: "skin-hair" }],
    ["intent", { intent: "compare" }],
    ["experience", { experience: "advanced" }],
    ["priorities", { priorities: ["documentation"] }],
    ["size", { size: "largest" }],
    ["budget", { budget: 8000 }],
    ["horizon", { horizon: "over-time" }],
    ["timing", { timing: "soon" }],
    ["forms", { forms: ["solid"] }],
    ["supplies", { supplies: true }],
    ["functions", { "research-functions": ["wound-healing"] }],
    ["products", { products: [publishedProducts[0].slug] }],
  ]) {
    const decision = applyAtlasPolicy(withFields(base, patch));
    check(
      !same(decision.selection, baseDecision.selection) ||
        !same(decision.constraints, baseDecision.constraints),
      "a selection field changes selection or constraints",
      label,
    );
  }
}

/* ---- another policy: same profile, a different projection ----------------
 *
 * Two fixture policies prove the layer, not new behaviour. Neither ships, and
 * neither contains a recommendation rule: they reuse the restricted policy's
 * decisions and differ only in what they are GRANTED. Nothing about the
 * questionnaire, the profile, retrieval or the result UI changes for them.
 */
{
  const profile = deviceProfile(everything);
  /* 1. A policy granted the goal follow-up as AI context. */
  const wider = {
    ...RESTRICTED_POLICY,
    id: "fixture-wider-context",
    permissions: { ...RESTRICTED_POLICY.permissions, "goal-focus": ["ai-context", "recap"] },
    decide(input) {
      const out = RESTRICTED_POLICY.decide(input);
      const focus = input.context.fields["goal-focus"];
      return focus?.source === "answer"
        ? { ...out, context: [...out.context, contextEntry("goal-focus", focus.value)] }
        : out;
    },
  };
  const restricted = applyPolicy(profile, RESTRICTED_POLICY);
  const other = applyPolicy(profile, wider);
  check(
    other.context.some((e) => e.field === "goal-focus" && e.sensitivity === "sensitive") &&
      !restricted.context.some((e) => e.field === "goal-focus"),
    "a different policy receives a different projection of the SAME profile",
  );
  check(
    same(other.selection, restricted.selection),
    "…and an AI-context grant moves no selection: the two permissions are separate",
  );
  check(
    other.policy.id === "fixture-wider-context" && restricted.policy.id === "restricted-catalogue",
    "the decision records which policy made it",
  );
  check(
    same(unreachableGrants(wider), ["goal-focus"]),
    "…and the privacy layer flags that its new grant can never reach the server as things stand",
  );
  const run = pipeline(everything, "es", wider);
  check(
    run.input.includes("goal-focus [outcome, sensitive]: satiety"),
    "the prompt renders any granted field generically, labelled with its category and sensitivity",
  );

  /* 2. A policy that tries to pass the engine a field it was not granted. */
  const leaky = {
    ...RESTRICTED_POLICY,
    id: "fixture-leaky",
    decide(input) {
      const out = RESTRICTED_POLICY.decide(input);
      return { ...out, context: [...out.context, contextEntry("conditions", ["diabetes"])] };
    },
  };
  let refused = false;
  try {
    applyPolicy(profile, leaky);
  } catch (error) {
    refused = error instanceof AtlasPolicyViolation;
  }
  check(refused, "a policy cannot put an ungranted field in the AI context");

  /* 3. A projection cannot be read around: decide() never sees the profile. */
  let seen = null;
  applyPolicy(profile, {
    ...RESTRICTED_POLICY,
    decide(input) {
      seen = input;
      return RESTRICTED_POLICY.decide(input);
    },
  });
  check(
    !JSON.stringify(seen).includes(CANARY) &&
      !("conditions" in seen.selection.fields) &&
      !("weight-kg" in seen.context.fields),
    "decide() receives projections only — no sensitive value it was not granted",
  );
}

/* ---- engines: one interface, the same input ------------------------------- */
{
  const run = pipeline(baseAnswers);
  const composer = createComposerEngine({
    copy: es.atlas.compose,
    topicLabel: (id) => es.discovery.areas[id].short,
    destinationLabel: (d) =>
      d.kind === "area"
        ? es.discovery.areas[d.ref].short
        : d.kind === "product"
          ? nameOf.get(d.ref)
          : es.atlas.destinations[d.kind],
    mode: "catalogue",
  });
  const input = {
    locale: "es",
    policy: run.decision.policy,
    context: run.decision.context,
    narrative: run.decision.narrative,
    constraints: run.decision.constraints,
    retrieval: run.retrieval,
  };
  const out = await composer.advise(input);
  check(out.generation !== null && out.mode === "catalogue", "the composer engine advises");
  check(
    !JSON.stringify(input).includes(CANARY) &&
      input.context.every((e) => permits(POLICY, e.field, "ai-context")),
    "the engine input carries the ai-context projection and nothing more",
  );
  check(
    input.retrieval.candidates.every(
      (c) => typeof c.slug === "string" && Array.isArray(c.evidence),
    ),
    "the engine receives specific product ids with their approved evidence ids",
  );
  const empty = await composer.advise({
    ...input,
    retrieval: { ...input.retrieval, candidates: [] },
  });
  check(empty.generation === null, "an engine with no candidates writes nothing");
}

/* ---- pins: a product the policy requires travels with its reason ---------- */
{
  const profile = profileOf({ ...baseAnswers, goal: "skin-hair" });
  const decision = applyAtlasPolicy(profile);
  const target = subjects.find(
    (s) => !s.areas.includes("skin") && !s.areas.includes("materials") && s.entryPrice !== null,
  );
  const selection = {
    ...decision.selection,
    pinned: [{ slug: target.slug, source: "policy", reasons: ["policy-pin"] }],
  };
  const retrieval = retrieveAtlas(selection, subjects, deps);
  const pinned = retrieval.candidates.find((c) => c.slug === target.slug);
  check(pinned !== undefined, "a policy pin is retrieved whatever its area", target.slug);
  check(
    pinned?.pin?.source === "policy" &&
      pinned.reasons[0]?.code === "policy-pin" &&
      pinned.relevance.tier === "primary",
    "…carrying its source, its reason first, and primary relevance",
  );
  const plan = planAtlas(retrieval, decision.constraints);
  check(
    [...plan.start, ...plan.more].some((c) => c.slug === target.slug),
    "the plan includes a policy pin",
  );
  const input = buildAtlasInput({
    context: decision.context,
    narrative: { ...decision.narrative, pinned: [target.slug] },
    constraints: decision.constraints,
    retrieval,
    locale: "es",
    dict: es,
    productName: (slug) => nameOf.get(slug) ?? slug,
  });
  check(
    input.includes(`${target.slug} |`) && input.includes("| policy |"),
    "the model is told the product is pinned by policy",
  );
  const ctx = {
    retrieval,
    constraints: decision.constraints,
    catalogue: publishedProducts.map((p) => ({ slug: p.slug, name: p.name })),
    approvedLabels: publicAreas().flatMap((a) => [
      es.discovery.areas[a.id].short,
      es.discovery.areas[a.id].title,
    ]),
  };
  const generation = composeAtlasGeneration({
    narrative: decision.narrative,
    retrieval,
    plan,
    topicLabel: (id) => es.discovery.areas[id].short,
    destinationLabel: (d) =>
      d.kind === "area"
        ? es.discovery.areas[d.ref].short
        : d.kind === "product"
          ? nameOf.get(d.ref)
          : es.atlas.destinations[d.kind],
    copy: es.atlas.compose,
  });
  const issues = validateAtlasGeneration(generation, ctx);
  check(
    issues.length === 0,
    "a result carrying a policy pin validates",
    issues.map((i) => `${i.path} ${i.code} ${i.detail}`).join("; "),
  );
  const dropped = JSON.parse(JSON.stringify(generation));
  dropped.start = dropped.start.filter((p) => p.slug !== target.slug);
  dropped.more = dropped.more.filter((p) => p.slug !== target.slug);
  check(
    validateAtlasGeneration(dropped, ctx).some((i) => i.code === "missing_pinned"),
    "the validator refuses a result that drops a pinned product",
  );
}

/* ---- evidence: approved statements, by id, research functions first ------- */
{
  const withEvidence = subjects.filter((s) => s.evidence.length > 0);
  check(
    withEvidence.length > 0,
    "subjects carry approved statement ids from the overview registry",
  );
  for (const subject of withEvidence) {
    for (const e of subject.evidence) {
      check(
        e.referenceIds.length > 0 && ["mechanism", "research"].includes(e.kind),
        "every evidence id is a sourced, public statement",
        `${subject.slug}/${e.id}`,
      );
    }
  }
  /* A product with a function-tagged statement that is not its first. */
  const tagged = withEvidence.find(
    (s) => s.evidence.length > 1 && s.evidence.slice(1).some((e) => e.functions.length > 0),
  );
  if (tagged) {
    const statement = tagged.evidence.slice(1).find((e) => e.functions.length > 0);
    const fn = statement.functions[0];
    const selection = {
      ...applyAtlasPolicy(profileOf(baseAnswers)).selection,
      topics: [],
      functions: [fn],
      evidenceFocus: [fn],
      pinned: [],
    };
    const functional = subjects.map((s) =>
      s.slug === tagged.slug ? { ...s, functions: [fn] } : s,
    );
    const candidate = retrieveAtlas(selection, functional, deps).candidates.find(
      (c) => c.slug === tagged.slug,
    );
    check(
      candidate?.evidence[0]?.functions.includes(fn) &&
        candidate.reasons.some((r) => r.code === "function-match" && r.ref === fn),
      "a chosen research function leads the product's evidence (research-context retrieval)",
      `${tagged.slug}/${fn}`,
    );
  }
  check(tagged !== undefined, "the catalogue offers a product to prove evidence ordering on");

  /* The validator: a product's own statement passes, anything else does not. */
  const run = pipeline(baseAnswers);
  const ctx = {
    retrieval: run.retrieval,
    constraints: run.decision.constraints,
    catalogue: publishedProducts.map((p) => ({ slug: p.slug, name: p.name })),
    approvedLabels: publicAreas().flatMap((a) => [
      es.discovery.areas[a.id].short,
      es.discovery.areas[a.id].title,
    ]),
  };
  const generation = composeAtlasGeneration({
    narrative: run.decision.narrative,
    retrieval: run.retrieval,
    plan: run.plan,
    topicLabel: (id) => es.discovery.areas[id].short,
    destinationLabel: (d) =>
      d.kind === "area"
        ? es.discovery.areas[d.ref].short
        : d.kind === "product"
          ? nameOf.get(d.ref)
          : es.atlas.destinations[d.kind],
    copy: es.atlas.compose,
  });
  check(
    validateAtlasGeneration(generation, ctx).length === 0,
    "the composed result's evidence validates",
  );
  const lead = generation.start[0];
  const own = run.retrieval.candidates.find((c) => c.slug === lead.slug).evidence;
  const foreign = subjects
    .filter((s) => s.slug !== lead.slug)
    .flatMap((s) => s.evidence)
    .find((e) => !own.some((o) => o.id === e.id));
  for (const [label, ids] of [
    ["an invented statement id", ["invented-finding"]],
    ["another product's statement", foreign ? [foreign.id] : []],
    ["a repeated statement", own.length > 0 ? [own[0].id, own[0].id] : []],
  ]) {
    if (ids.length === 0) continue;
    const g = JSON.parse(JSON.stringify(generation));
    g.start[0].evidence = ids;
    check(
      validateAtlasGeneration(g, ctx).some((i) => i.code === "unknown_evidence"),
      `the validator refuses ${label}`,
    );
  }
  check(
    run.input.includes("EVIDENCE") && own.every((e) => run.input.includes(e.id)),
    "the model is given the lead product's statement ids",
  );
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
  "src/domain/atlas/engine.ts",
  "src/server/atlas/engines/model.ts",
  "src/domain/atlas/policies/restricted.ts",
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  check(
    !/\bAtlasProfile\b|buildAtlasProfile|projectProfile/.test(source),
    "nothing downstream of the policy layer — nor a policy itself — reads the profile",
    file,
  );
}
/* Question ids live in `fields.ts` and nowhere else downstream. */
for (const file of [
  "src/domain/atlas/policy.ts",
  "src/domain/atlas/retrieval.ts",
  "src/domain/atlas/compose.ts",
  "src/server/atlas/prompt.ts",
  "src/server/atlas/assemble.ts",
  "src/server/atlas/generate.ts",
  "src/components/atlas/AtlasResult.tsx",
  "src/components/atlas/AtlasExperience.tsx",
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const named = Object.keys(ATLAS_BINDINGS).find(
    (id) => id.length > 4 && new RegExp(`["'\`]${id}["'\`]`).test(source),
  );
  check(!named, "no downstream file names a question id", `${file}: ${named}`);
}
for (const file of [
  "src/components/atlas/AtlasExperience.tsx",
  "src/components/atlas/AtlasResult.tsx",
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  check(
    !/domain\/atlas\/(policy|policies|retrieval|plan|validate|compose|engine)/.test(source),
    "the UI contains no recommendation rule and no policy",
    file,
  );
}
check(
  /transmittableAnswers\(answers\)/.test(
    readFileSync(new URL("../src/components/atlas/AtlasExperience.tsx", import.meta.url), "utf8"),
  ),
  "the browser sends only transmittable answers",
);
check(
  /transmittableAnswers\(/.test(
    readFileSync(new URL("../src/app/api/atlas/route.ts", import.meta.url), "utf8"),
  ) &&
    /transmittedView\(/.test(
      readFileSync(new URL("../src/app/api/atlas/route.ts", import.meta.url), "utf8"),
    ),
  "the API route strips withheld answers and validates against the transmitted view",
);

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
  const skin = profileOf({ goal: "skin-hair" });
  const without = applyAtlasPolicy(skin);
  const withFn = applyAtlasPolicy(withFields(skin, { "research-functions": ["wound-healing"] }));
  check(
    same(withFn.selection.evidenceFocus, ["wound-healing"]),
    "research functions also drive retrieval, through their own permission",
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
}

/*
 * The policy's full range, exercised through profile fields that no question
 * asks for today — the capacity the pipeline keeps for a future question.
 * `areas` stands in for a decision spanning several catalogue areas, which a
 * single goal cannot produce; it is applied to the decision, as a policy with
 * a multi-area question would.
 */
const withPatch = (answers, patch) => withFields(profileOf(answers), patch);
const withAreas = (decision, areas) =>
  areas
    ? {
        ...decision,
        selection: { ...decision.selection, topics: areas },
        narrative: { ...decision.narrative, topics: areas },
      }
    : decision;
const PROFILES = {
  firstOrderNewcomer: withPatch(
    { goal: "weight-loss", "peptide-experience": "none" },
    { priorities: ["signature"], size: "smallest", budget: 8000 },
  ),
  compareSkinValue: withPatch(
    { goal: "skin-hair" },
    { intent: "compare", priorities: ["price"], forms: ["solid"], budget: 20000 },
  ),
  coverTopicsExperienced: withPatch(
    { goal: "tissue-recovery", "peptide-experience": "advanced" },
    {
      intent: "cover-topics",
      priorities: ["documentation", "overlap"],
      size: "largest",
      supplies: true,
      budget: 40000,
      horizon: "over-time",
    },
  ),
  deepenWithProductInMind: withPatch(
    { goal: "longevity" },
    {
      intent: "deepen",
      products: outsideSkin ? [outsideSkin.slug] : [],
      timing: "soon",
      style: "detailed",
    },
  ),
};
const PROFILE_AREAS = {
  compareSkinValue: ["skin", "neuro"],
  coverTopicsExperienced: ["recovery", "growth", "hormonal"],
  deepenWithProductInMind: ["longevity", "metabolic"],
};
/* And the live questionnaire as it is today, answer for answer. */
const LIVE_PROFILES = Object.fromEntries(
  optionIds("goal").map((goal) => [
    `live:${goal}`,
    profileOf({
      ...baseAnswers,
      goal,
      "peptide-experience": goal === "sleep" ? "none" : "advanced",
    }),
  ]),
);

const runs = {};
for (const [name, profile] of Object.entries({ ...PROFILES, ...LIVE_PROFILES })) {
  const decision = withAreas(applyAtlasPolicy(profile), PROFILE_AREAS[name]);
  const retrieval = retrieveAtlas(decision.selection, subjects, deps);
  const plan = planAtlas(retrieval, decision.constraints);
  runs[name] = { profile, decision, retrieval, plan };
  const { selection } = decision;

  check(retrieval.candidates.length > 0, "a real profile retrieves candidates", name);
  check(
    retrieval.candidates.length <= ATLAS_CANDIDATE_LIMIT + selection.pinned.length,
    "retrieval respects the candidate limit",
    `${name}: ${retrieval.candidates.length}`,
  );
  for (const c of retrieval.candidates) {
    check(
      c.pin ||
        selection.topics.length === 0 ||
        (c.matchedAreas.length > 0 && c.matchedAreas.every((a) => selection.topics.includes(a))),
      "every candidate is in a chosen topic or was pinned",
      `${name}: ${c.slug}`,
    );
    check(
      c.reasons.length > 0 && c.relevance.rank > 0,
      "every candidate carries structured reasons and a relevance",
      `${name}: ${c.slug}`,
    );
    if (selection.forms.length > 0 && !c.pin) {
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
  for (const { slug } of selection.pinned) {
    check(
      retrieval.candidates.some((c) => c.slug === slug),
      "a pinned product is always retrieved",
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
  const names = Object.keys(PROFILES);
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

/* Same topics, different intent → a different plan. */
{
  const planFor = (overrides) => {
    const decision = withAreas(
      applyAtlasPolicy(withPatch({ goal: "weight-loss" }, { budget: 20000, ...overrides })),
      ["metabolic", "skin"],
    );
    const retrieval = retrieveAtlas(decision.selection, subjects, deps);
    const plan = planAtlas(retrieval, decision.constraints);
    return [plan.start.map((c) => c.slug), plan.more.map((c) => c.slug)];
  };
  const first = planFor({ intent: "first-order", experience: "none" });
  const compare = planFor({ intent: "compare", experience: "advanced" });
  const documented = planFor({
    intent: "first-order",
    experience: "none",
    priorities: ["documentation"],
    size: "largest",
  });
  check(!same(first, compare), "the same topics with a different intent give a different plan");
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
  for (const c of retrieval.candidates.filter((c) => c.pin)) {
    check(
      [...plan.start, ...plan.more].includes(c),
      "the plan includes pinned products",
      `${name}: ${c.slug}`,
    );
  }
}
check(
  new Set(Object.keys(PROFILES).map((name) => composedStarts[name])).size ===
    Object.keys(PROFILES).length,
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
    g.more.push({ slug: g.start[0].slug, why: "Otra vez.", evidence: [] });
    expect(g, "duplicate", "a repeated product");
  }
  {
    const g = clone();
    const extra = retrieval.candidates.filter(
      (c) => ![...g.start, ...g.more].some((p) => p.slug === c.slug),
    );
    g.start = [
      ...g.start,
      ...extra.slice(0, 4).map((c) => ({ slug: c.slug, why: "Está en tus temas.", evidence: [] })),
    ];
    expect(g, "count", "too many start products");
  }
  {
    const g = clone();
    const supply = retrieval.supplies[0];
    if (supply) {
      g.start.push({ slug: supply.slug, why: "Insumo.", evidence: [] });
      expect(g, "misplaced_supply", "a supply in start");
    }
  }
  {
    const g = clone();
    g.start = [...retrieval.candidates]
      .sort((a, b) => (b.suggestedPrice ?? 0) - (a.suggestedPrice ?? 0))
      .slice(0, 3)
      .map((c) => ({ slug: c.slug, why: "Está en tus temas.", evidence: [] }));
    g.more = g.more.filter((p) => !g.start.some((s) => s.slug === p.slug));
    const sum = g.start.reduce(
      (t, p) => t + (retrieval.candidates.find((c) => c.slug === p.slug)?.suggestedPrice ?? 0),
      0,
    );
    if (sum > retrieval.budgetCap) expect(g, "over_budget", "a start set over the cap");
  }
  {
    const inMindName = "deepenWithProductInMind";
    const named = runs[inMindName].retrieval.candidates.find((c) => c.pin);
    if (named) {
      const g = composeFor(inMindName, es);
      g.start = g.start.filter((p) => p.slug !== named.slug);
      g.more = g.more.filter((p) => p.slug !== named.slug);
      expect(g, "missing_pinned", "a result that drops a named product", contextFor(inMindName));
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
    "missing_pinned",
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
