/**
 * SIMPLE EFFECTS — the owner-authored layer's invariants.
 *
 *   THE EDITOR WARNS, THE OWNER DECIDES: warnings about wording are shown
 *   and never block saving, approving, rendering or importing
 *   approval needs only both languages and known tags
 *   imports never publish, and are all-or-nothing on structure
 *   the layer never touches the scientific record, and search never reads it
 *
 *   npm run check:effects
 */
import { readFileSync } from "node:fs";

import {
  applyBulkStatus,
  applyEdit,
  approvalBlockers,
  blankEntry,
  countRows,
  effectFindings,
  filterRows,
  isPublishable,
  parseEffectsFile,
  publicEffects,
  serializeEffectsFile,
  tagIdFrom,
} from "../src/content/effects/rules.ts";
import {
  applyPlan,
  exportRows,
  parseCsv,
  planImport,
  readTransfer,
  toCsv,
} from "../src/content/effects/transfer.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";

const failures = [];
let assertions = 0;
const ok = (condition, what, detail = "false") => {
  assertions += 1;
  if (!condition) failures.push(`${what}: ${detail}`);
};
const eq = (actual, expected, what) =>
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    what,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );

/* ---- fixtures ------------------------------------------------------------ */

const vocabulary = [
  { id: "apetito", label: { es: "APETITO", en: "APPETITE" } },
  { id: "peso", label: { es: "PESO", en: "WEIGHT" } },
  { id: "piel", label: { es: "PIEL", en: "SKIN" } },
];
const products = [
  { slug: "alpha", name: "Alpha" },
  { slug: "beta", name: "Beta" },
  { slug: "gamma", name: "Gamma" },
];
const at = { operator: "ana", now: "2026-10-06T12:00:00.000Z" };
const entry = (over = {}) => ({
  ...blankEntry("alpha"),
  tags: ["apetito", "peso"],
  description: { es: "Reduce el apetito.", en: "Reduces appetite." },
  revision: 3,
  updatedAt: at.now,
  updatedBy: "ana",
  ...over,
});
const file = (entries) => ({ version: 1, vocabulary, entries });
const approved = entry({ status: "approved" });

/* ---- the publication gate ---------------------------------------------- */

eq(publicEffects(file({ alpha: entry() }), "alpha", "es"), null, "a draft never renders");
eq(
  publicEffects(file({ alpha: entry({ status: "review" }) }), "alpha", "es"),
  null,
  "an entry in review never renders",
);
eq(
  publicEffects(file({ alpha: approved }), "alpha", "es"),
  { tags: ["APETITO", "PESO"], description: "Reduce el apetito." },
  "an approved entry renders, with its tags in the page's language",
);
eq(
  publicEffects(file({ alpha: approved }), "alpha", "en"),
  { tags: ["APPETITE", "WEIGHT"], description: "Reduces appetite." },
  "…and in English",
);
eq(
  publicEffects(
    file({ alpha: { ...approved, description: { es: "Reduce el apetito.", en: "" } } }),
    "alpha",
    "es",
  ),
  null,
  "approved with a missing translation renders in neither language",
);
eq(
  publicEffects(
    file({ alpha: { ...approved, description: { es: "Dosis de 2 mg.", en: "A 2 mg dose." } } }),
    "alpha",
    "es",
  ),
  { tags: ["APETITO", "PESO"], description: "Dosis de 2 mg." },
  "approved wording that triggers a dosing warning still renders: the owner decided",
);
eq(publicEffects(file({}), "alpha", "es"), null, "no entry renders nothing");

/* ---- bulk status --------------------------------------------------------- */

{
  const before = file({
    alpha: entry({ slug: "alpha", notes: "nota", source: "import" }),
    beta: entry({
      slug: "beta",
      description: { es: "Dosis de 2 mg.", en: "A 2 mg dose." },
    }),
    gamma: entry({ slug: "gamma", description: { es: "Solo español.", en: "" } }),
    delta: entry({ slug: "delta", status: "approved" }),
  });
  const snapshot = JSON.stringify(before);
  const r = applyBulkStatus(
    before,
    ["alpha", "beta", "gamma", "delta", "nobody", "alpha"],
    "approved",
    at,
  );
  eq(r.changed, ["alpha", "beta"], "bulk approval approves every complete entry");
  ok(
    r.file.entries.beta.status === "approved",
    "bulk approval ignores wording warnings: the owner decided",
  );
  eq(
    r.skipped,
    [{ slug: "gamma", blockers: ["description_en"] }],
    "bulk approval skips, and names, an entry missing a language",
  );
  eq(r.file.entries.gamma, before.entries.gamma, "a skipped entry is left exactly as it was");
  eq(r.unchanged, ["delta"], "an already approved entry is reported, not rewritten");
  eq(r.file.entries.delta, before.entries.delta, "…and left exactly as it was");
  const content = (e) => ({ ...e, status: 0, revision: 0, updatedAt: 0, updatedBy: 0 });
  eq(
    content(r.file.entries.alpha),
    content(before.entries.alpha),
    "bulk approval changes only the status: wording, tags, notes, source untouched",
  );
  const { status, revision, updatedAt, updatedBy } = r.file.entries.alpha;
  const r0 = before.entries.alpha.revision;
  ok(
    status === "approved" && revision === r0 + 1,
    "…and bumps the revision, so an open editor goes stale",
  );
  ok(updatedAt === at.now && updatedBy === at.operator, "…and records who and when");
  eq(JSON.stringify(before), snapshot, "bulk approval never mutates its input");
  ok(!("nobody" in r.file.entries), "a slug with no entry is ignored, never created");
  eq(
    publicEffects(r.file, "beta", "es"),
    { tags: ["APETITO", "PESO"], description: "Dosis de 2 mg." },
    "a bulk-approved entry renders",
  );

  const back = applyBulkStatus(r.file, ["alpha", "beta", "gamma"], "draft", at);
  eq(back.changed, ["alpha", "beta"], "bulk return to draft unpublishes the approved ones");
  eq(back.skipped, [], "returning to draft is never blocked");
  eq(back.unchanged, ["gamma"], "…and leaves drafts alone");
  eq(publicEffects(back.file, "alpha", "es"), null, "a bulk-unpublished entry no longer renders");
}

/* ---- editing ------------------------------------------------------------- */

const edit = (over = {}) => ({
  tags: approved.tags,
  description: approved.description,
  notes: "",
  status: "approved",
  ...over,
});

{
  const r = applyEdit(approved, edit({ status: "draft" }), vocabulary, { ...at, revision: 3 });
  ok(r.ok && r.entry.status === "draft", "removing approval is a save");
  eq(
    publicEffects(file({ alpha: r.entry }), "alpha", "es"),
    null,
    "…and removing approval removes it from the site",
  );
}
{
  const r = applyEdit(
    approved,
    edit({
      description: { es: "Reduce el apetito y el peso.", en: "Reduces appetite and weight." },
    }),
    vocabulary,
    { ...at, revision: 3 },
  );
  ok(r.ok, "an approved entry can be re-worded");
  eq(r.entry.status, "approved", "re-wording approved copy keeps it approved");
  eq(
    publicEffects(file({ alpha: r.entry }), "alpha", "es")?.description,
    "Reduce el apetito y el peso.",
    "…and the new wording is what renders",
  );
}
{
  const r = applyEdit(
    approved,
    edit({ description: { es: "Nuevo texto.", en: "New text." } }),
    vocabulary,
    { ...at, revision: 3 },
  );
  eq(
    [r.entry.description.es, r.entry.description.en],
    ["Nuevo texto.", "New text."],
    "ES and EN are edited independently",
  );
  eq(r.entry.revision, 4, "every save increments the revision");
  eq(r.entry.updatedBy, "ana", "…and records who saved it");
}
eq(
  applyEdit(approved, edit(), vocabulary, { ...at, revision: 2 }),
  { ok: false, reason: "stale" },
  "a save from a stale editor is refused",
);
{
  const r = applyEdit(entry({ revision: 0 }), edit(), vocabulary, { ...at, revision: 0 });
  ok(r.ok && r.entry.status === "approved", "a complete entry is approved directly from a draft");
}
{
  const r = applyEdit(
    entry({ revision: 0 }),
    edit({ status: "draft", description: { es: "Reduce el apetito.", en: "" } }),
    vocabulary,
    { ...at, revision: 0 },
  );
  ok(r.ok, "a draft may be saved with one language missing");
  ok(
    effectFindings(r.entry, vocabulary).some(
      (f) => f.code === "missing_translation" && f.locale === "en",
    ),
    "…and is flagged as missing its translation",
  );
  ok(approvalBlockers(r.entry, vocabulary).includes("description_en"), "…which blocks approval");
}

/* ---- warnings are advisory: the editor warns, the owner decides ---------- */

const RISKY = [
  [
    "Reduce el apetito y favorece la pérdida de peso.",
    "Reduces appetite and supports weight loss.",
    "strong_effect",
  ],
  ["Trata la obesidad.", "Treats obesity.", "therapeutic_claim"],
  ["Usar 2 mg por día.", "Use 2 mg per day.", "forbidden_term"],
  ["Aplicar en inyección.", "Give by injection.", "forbidden_term"],
  ["Te recomendamos este péptido.", "We recommend this peptide.", "personal_recommendation"],
  ["Ideal para ti.", "You should take it.", "personal_recommendation"],
];
for (const [es, en, code] of RISKY) {
  const description = { es, en };
  const findings = effectFindings({ tags: ["peso"], description }, vocabulary);
  ok(
    findings.some((x) => x.code === code && x.level === "warning"),
    `"${es}" produces a ${code} warning`,
  );
  ok(
    approvalBlockers({ tags: ["peso"], description }, vocabulary).length === 0,
    `"${es}" does not block approval`,
  );
  const r = applyEdit(
    entry({ revision: 0, tags: ["peso"] }),
    { tags: ["peso"], description, notes: "", status: "approved" },
    vocabulary,
    { ...at, revision: 0 },
  );
  ok(r.ok && r.entry.status === "approved", `"${es}" can be approved`);
  eq(
    publicEffects(file({ alpha: r.entry }), "alpha", "es")?.description,
    es,
    `approved "${es}" is publishable`,
  );
}

/* ---- what DOES stop approval: structure, never wording ------------------- */

ok(
  effectFindings({ tags: ["inventada"], description: { es: "", en: "" } }, vocabulary).some(
    (x) => x.code === "unknown_tag" && x.level === "error",
  ),
  "an unknown tag is a structural error",
);
{
  const r = applyEdit(
    entry({ revision: 0 }),
    {
      tags: ["inventada"],
      description: { es: "Texto.", en: "Text." },
      notes: "",
      status: "approved",
    },
    vocabulary,
    { ...at, revision: 0 },
  );
  ok(!r.ok && r.blockers?.includes("unknown_tags"), "…which blocks approval");
}
{
  const r = applyEdit(
    entry({ revision: 0 }),
    { tags: ["peso"], description: { es: "", en: "Text." }, notes: "", status: "approved" },
    vocabulary,
    { ...at, revision: 0 },
  );
  ok(
    !r.ok && r.blockers?.includes("description_es"),
    "a missing Spanish description blocks approval",
  );
}
for (const [what, raw] of [
  ["a wrong version", { version: 2, vocabulary: [], entries: {} }],
  [
    "a tag without both labels",
    { version: 1, vocabulary: [{ id: "x", label: { es: "X" } }], entries: {} },
  ],
  [
    "an entry keyed to the wrong slug",
    { version: 1, vocabulary, entries: { alpha: { ...approved, slug: "beta" } } },
  ],
  [
    "an unknown status",
    { version: 1, vocabulary, entries: { alpha: { ...approved, status: "live" } } },
  ],
]) {
  ok(!parseEffectsFile(raw).ok, `structurally invalid data fails: ${what}`);
}
eq(tagIdFrom("Salud intestinal"), "salud-intestinal", "a tag id comes from its label");

/* ---- list: filters and search -------------------------------------------- */

{
  const rows = [
    { slug: "alpha", name: "Alpha", entry: approved, findings: [] },
    {
      slug: "beta",
      name: "Beta Gamma",
      entry: entry({ slug: "beta" }),
      findings: [{ code: "no_tags", level: "warning" }],
    },
    { slug: "gamma", name: "Gamma", entry: null, findings: [] },
  ];
  eq(
    filterRows(rows, { filter: "approved", query: "" }).map((r) => r.slug),
    ["alpha"],
    "filter: approved",
  );
  eq(
    filterRows(rows, { filter: "draft", query: "" }).map((r) => r.slug),
    ["beta"],
    "filter: draft",
  );
  eq(
    filterRows(rows, { filter: "empty", query: "" }).map((r) => r.slug),
    ["gamma"],
    "filter: empty",
  );
  eq(
    filterRows(rows, { filter: "flagged", query: "" }).map((r) => r.slug),
    ["beta"],
    "filter: flagged",
  );
  eq(
    filterRows(rows, { filter: "all", query: "gamma" }).map((r) => r.slug),
    ["beta", "gamma"],
    "search matches name and slug, accent- and case-blind",
  );
  eq(countRows(rows).all, 3, "counts cover every row");
}

/* ---- export and import --------------------------------------------------- */

{
  const current = file({ alpha: approved });
  const csv = toCsv(exportRows(current, products));
  ok(csv.startsWith("﻿slug,name,status"), "the CSV export has a BOM and a header");
  const read = readTransfer(csv);
  ok(read.ok && read.rows.length === 3, "the export reads back, one row per product");
  const plan = planImport(read.rows, current, products, at);
  eq(
    plan.counts,
    { new: 0, changed: 0, unchanged: 1, empty: 2, error: 0 },
    "re-importing an export changes nothing",
  );
  eq(
    applyPlan(current, plan).entries.alpha.status,
    "approved",
    "…and an untouched approved entry stays approved",
  );

  const json = readTransfer(JSON.stringify(exportRows(current, products)));
  ok(json.ok && json.format === "json", "the JSON export reads back too");

  const draft = readTransfer(
    [
      "slug,name,status,tags_es,tags_en,description_es,description_en,notes",
      'beta,Beta,approved,APETITO | PESO,APPETITE | WEIGHT,"Reduce el apetito, dice el borrador.","Reduces appetite, says the draft.",from a model',
      'alpha,Alpha,approved,PIEL,SKIN,"Texto nuevo",New text,',
    ].join("\n"),
  );
  const p2 = planImport(draft.rows, current, products, at);
  ok(p2.ok, "a well-formed import plans cleanly", JSON.stringify(p2.rows.map((r) => r.errors)));
  const applied = applyPlan(current, p2);
  eq(
    applied.entries.beta.status,
    "draft",
    "an imported row is a draft, whatever status the file claims",
  );
  eq(applied.entries.beta.source, "import", "…marked as imported");
  eq(
    applied.entries.beta.description.es,
    "Reduce el apetito, dice el borrador.",
    "quoted CSV fields keep their commas",
  );
  eq(
    applied.entries.alpha.status,
    "draft",
    "importing new wording over approved copy unpublishes it",
  );
  eq(
    publicEffects(applied, "alpha", "es"),
    null,
    "…so an import can never silently publish or keep publishing",
  );

  for (const [what, rows] of [
    ["an unknown product", [{ slug: "nope", description_es: "x", description_en: "y" }]],
    [
      "an unknown tag",
      [{ slug: "beta", tags_es: "INVENTADA", description_es: "x", description_en: "y" }],
    ],
    [
      "tags that disagree between languages",
      [
        {
          slug: "beta",
          tags_es: "PIEL",
          tags_en: "WEIGHT",
          description_es: "x",
          description_en: "y",
        },
      ],
    ],
    [
      "a duplicate row",
      [
        { slug: "beta", description_es: "x", description_en: "y" },
        { slug: "beta", description_es: "z", description_en: "w" },
      ],
    ],
  ]) {
    const p = planImport(rows, current, products, at);
    ok(!p.ok, `an import with ${what} is refused`);
    let threw = false;
    try {
      applyPlan(current, p);
    } catch {
      threw = true;
    }
    ok(threw, `…and cannot be applied (${what})`);
  }
  {
    const risky = planImport(
      [
        {
          slug: "beta",
          tags_es: "PESO",
          description_es: "Dosis diaria.",
          description_en: "Daily dose.",
        },
      ],
      current,
      products,
      at,
    );
    ok(risky.ok, "an import with risky wording is NOT refused");
    ok(
      risky.rows[0].findings.some((f) => f.code === "forbidden_term" && f.level === "warning"),
      "…its warning is shown in the plan",
    );
    eq(applyPlan(current, risky).entries.beta.status, "draft", "…and it still lands as a draft");
  }
  ok(!readTransfer("not,a,valid\n1,2,3").ok, "a CSV without a slug column is refused");
  ok(!readTransfer("{ broken").ok, "broken JSON is refused");
  ok(!readTransfer("slug,price\nalpha,10").ok, "a CSV with unknown columns is refused");
  eq(
    parseCsv('a,b\n"x\ny","q""z"').slice(1),
    [["x\ny", 'q"z']],
    "CSV: line breaks and quotes inside fields",
  );
}

/* ---- the real file ------------------------------------------------------- */

const raw = JSON.parse(
  readFileSync(new URL("../src/content/effects/simple-effects.json", import.meta.url), "utf8"),
);
const parsed = parseEffectsFile(raw);
ok(parsed.ok, "the real simple-effects.json is well formed", parsed.problem);
if (parsed.ok) {
  const real = parsed.file;
  const published = new Set(publishedProducts.map((p) => p.slug));
  for (const slug of Object.keys(real.entries)) {
    ok(published.has(slug), `entry \`${slug}\` belongs to a published product`);
  }
  for (const [slug, e] of Object.entries(real.entries)) {
    if (e.status === "approved") {
      ok(
        isPublishable(e, real.vocabulary),
        `approved entry \`${slug}\` passes the publication gate`,
      );
    }
  }
  eq(
    serializeEffectsFile(real),
    readFileSync(new URL("../src/content/effects/simple-effects.json", import.meta.url), "utf8"),
    "the file is in its canonical form (what the editor writes)",
  );
  globalThis.__real = {
    tags: real.vocabulary.length,
    entries: Object.keys(real.entries).length,
    approved: Object.values(real.entries).filter((e) => isPublishable(e, real.vocabulary)).length,
  };
}

/* ---- separation from the scientific record ------------------------------- */

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
for (const f of ["rules.ts", "transfer.ts", "index.ts", "types.ts"]) {
  const text = source(`../src/content/effects/${f}`);
  ok(
    !/@\/content\/(overview|references|compendium|research|functions|areas)|@\/data\/discovery/.test(
      text,
    ),
    `content/effects/${f} imports nothing from the scientific record or the Areas`,
  );
}
for (const f of [
  "../src/content/overview/index.ts",
  "../src/content/overview/registry.ts",
  "../src/content/references/index.ts",
  "../src/content/compendium.ts",
  "../src/content/functions.ts",
  "../src/data/discovery/index.ts",
]) {
  ok(!source(f).includes("content/effects"), `${f.split("src/")[1]} does not read Simple Effects`);
}
{
  const filters = source("../src/components/catalog/filters.ts");
  const matches = filters.slice(filters.indexOf("export function matches"));
  ok(
    !matches.slice(0, matches.indexOf("\n}\n")).includes("simpleEffects"),
    "catalogue search never reads Simple Effects",
  );
}
ok(
  !source("../src/server/ops/effectsActions.ts").match(/content\/(overview|references|review)/),
  "the console's actions cannot write the scientific record",
);

/* ---- report -------------------------------------------------------------- */

if (failures.length) {
  console.error(`\nsimple-effects check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
const r = globalThis.__real ?? {};
console.log(
  `simple-effects check passed — ${assertions} assertions; file: ${r.tags} tags, ${r.entries} entries, ${r.approved} publishable`,
);
