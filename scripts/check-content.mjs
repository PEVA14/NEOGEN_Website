/**
 * CONTENT SAFETY INVARIANTS.
 *
 * NEOGEN's content rule is that nothing appears because it "sounds right".
 * These checks enforce the parts of that rule a machine can enforce:
 *
 *   a scientific statement with no public reference     → cannot render
 *   a reference that cannot be followed to its source   → invalid
 *   copy derived from nothing, or from other copy       → cannot render
 *   dosing / administration / protocol vocabulary       → cannot render, and
 *                                                         fails the build if
 *                                                         it is in any
 *                                                         dictionary string
 *   a dose field in the content model                   → does not exist
 *   the research connection                             → resolves both ways
 *   notifications                                       → provider-independent,
 *                                                         idempotent, never
 *                                                         able to fail an order
 *
 *   npm run check:content
 */
import { readFileSync } from "node:fs";

import {
  CONTENT_CLASS_LETTER,
  FORBIDDEN_PUBLIC_TERMS,
  forbiddenTermIn,
  isPublishable,
} from "../src/content/lifecycle.ts";
import {
  auditOverviews,
  citedReferenceIds,
  OVERVIEWS,
  publicOverview,
} from "../src/content/overview/index.ts";
import {
  isPublicReference,
  publicReferencesById,
  REFERENCES,
  referenceHref,
  validateReference,
} from "../src/content/references/index.ts";
import {
  referencesForArea,
  referencesForProduct,
  researchReferenceIndex,
} from "../src/content/research.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";
import { AREAS } from "../src/data/discovery/index.ts";
import { dispatch, orderPlacedMessages } from "../src/domain/notifications/index.ts";
import { noneChannel } from "../src/domain/notifications/adapters/none.ts";
import { __resetOutbox, memoryOutbox } from "../src/domain/notifications/adapters/memoryOutbox.ts";

const failures = [];
let assertions = 0;
const fail = (what, detail) => failures.push(`${what}: ${detail}`);
const eq = (actual, expected, what) => {
  assertions += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(what, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};
const ok = (condition, what, detail = "false") => {
  assertions += 1;
  if (!condition) fail(what, detail);
};

/* ---- lifecycle ---------------------------------------------------------- */

eq(Object.values(CONTENT_CLASS_LETTER), ["A", "B", "C", "D", "E"], "five content classes, A–E");
ok(!isPublishable({ class: "product-fact", status: "draft" }), "draft content does not render");
ok(
  !isPublishable({ class: "product-fact", status: "source-needed" }),
  "source-needed content does not render",
);
ok(
  !isPublishable({ class: "product-fact", status: "owner-review" }),
  "owner-review content does not render",
);
ok(isPublishable({ class: "product-fact", status: "approved" }), "approved product facts render");
ok(
  !isPublishable({ class: "blocked", status: "approved" }),
  "E never renders, even marked approved",
);
ok(
  !isPublishable({ class: "derived-copy", status: "approved" }),
  "D with no lineage does not render",
);
ok(
  !isPublishable({ class: "derived-copy", status: "approved", derivedFrom: [] }),
  "D with an empty lineage does not render",
);
ok(
  !isPublishable({ class: "derived-copy", status: "approved", derivedFrom: ["derived-copy"] }),
  "D derived from D does not render — copy cannot launder copy",
);
ok(
  !isPublishable({
    class: "derived-copy",
    status: "approved",
    derivedFrom: ["product-fact", "blocked"],
  }),
  "D derived from anything blocked does not render — E never becomes D",
);
ok(
  isPublishable({
    class: "derived-copy",
    status: "approved",
    derivedFrom: ["business-decision", "product-fact"],
  }),
  "D derived from A and B renders",
);

/* ---- forbidden vocabulary ---------------------------------------------- */

eq(
  forbiddenTermIn("Dosis recomendada para investigación"),
  "dosis",
  "Spanish dosing language is caught",
);
eq(
  forbiddenTermIn("INYECCIÓN subcutánea"),
  "inyec",
  "caught through case, accents and the double-c noun",
);
eq(forbiddenTermIn("inyectable"), "inyec", "the verb form is caught by the same stem");
eq(
  forbiddenTermIn("Al día siguiente, no el mismo día."),
  null,
  "the delivery promise is not dosing language",
);
eq(
  forbiddenTermIn("Reconstituir con agua bacteriostática"),
  "reconstitu",
  "reconstitution is caught",
);
eq(
  forbiddenTermIn("Administered daily"),
  "administer",
  "English administration language is caught",
);
eq(forbiddenTermIn("A 12-week cycle"), "cycle", "cycle language is caught");
eq(
  forbiddenTermIn("Estudiado en el contexto de la regulación metabólica."),
  null,
  "neutral research framing passes",
);
ok(FORBIDDEN_PUBLIC_TERMS.length >= 20, "the forbidden list covers both locales");

/*
 * NO DOSE FIELD EXISTS in the content model — checked in the source, because a
 * type is erased at runtime and "we did not add one" has to stay true.
 */
const overviewTypes = readFileSync("src/content/overview/types.ts", "utf8").replace(
  /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
  "",
);
for (const field of [
  "dose",
  "dosage",
  "administration",
  "injection",
  "cycle",
  "protocol",
  "frequency",
  "reconstitution",
  "route",
]) {
  ok(
    !new RegExp(`\\b${field}\\w*\\s*[?]?:`, "i").test(overviewTypes),
    `the ProductOverview model has no \`${field}\` field`,
  );
}

/*
 * EVERY DICTIONARY STRING, scanned. Comments are stripped first: the
 * dictionaries document what may NOT be written, and that documentation names
 * the forbidden words.
 */
for (const locale of ["es", "en"]) {
  const source = readFileSync(`src/i18n/dictionaries/${locale}.ts`, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const strings = [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  for (const value of strings) {
    const term = forbiddenTermIn(value);
    if (term) fail(`forbidden vocabulary in the ${locale} dictionary`, `"${term}" in "${value}"`);
  }
  assertions += 1;
  /* The specific strings Phase 11 removed must not come back. */
  for (const banned of [
    /base de datos de coa|coa database/i,
    /rutas de síntesis|synthesis routes/i,
    /por lote cuando el análisis|per lot once analysis/i,
  ]) {
    ok(!banned.test(source), `the ${locale} dictionary does not promise ${banned}`);
  }
}

/* ---- references --------------------------------------------------------- */

const ref = (overrides) => ({
  id: "ref-fixture",
  title: "A study of something",
  authors: ["Author A", "Author B"],
  publication: "Journal",
  year: 2024,
  doi: "10.1000/fixture.1",
  pmid: null,
  url: null,
  sourceType: "journal-article",
  status: "approved",
  ...overrides,
});
const codes = (r) => validateReference(r, 2026).map((i) => i.code);

eq(codes(ref({})), [], "a complete reference validates");
eq(codes(ref({ doi: null })), ["no_identifier"], "a reference with no DOI, PMID or URL is invalid");
eq(
  codes(ref({ doi: "https://doi.org/10.1000/x" })),
  ["doi_invalid"],
  "a DOI stored as a URL is invalid",
);
eq(codes(ref({ doi: null, pmid: "PMID123" })), ["pmid_invalid"], "a non-numeric PMID is invalid");
eq(
  codes(ref({ doi: null, url: "http://example.org" })),
  ["url_invalid"],
  "a non-https URL is invalid",
);
eq(codes(ref({ year: 2031 })), ["year_invalid"], "a year in the future is invalid");
eq(codes(ref({ authors: [] })), ["missing_authors"], "a reference with no authors is invalid");
eq(codes(ref({ title: " " })), ["missing_title"], "a reference with no title is invalid");
eq(
  codes(ref({ sourceType: "blog" })),
  ["source_type_unknown"],
  "an unknown source type is invalid",
);
ok(!isPublicReference(ref({ status: "draft" })), "an unapproved reference is not public");
ok(!isPublicReference(ref({ doi: null })), "an approved but invalid reference is not public");
ok(isPublicReference(ref({})), "an approved, valid reference is public");

eq(referenceHref(ref({})), "https://doi.org/10.1000/fixture.1", "a DOI links through doi.org");
eq(
  referenceHref(ref({ doi: null, pmid: "12345678" })),
  "https://pubmed.ncbi.nlm.nih.gov/12345678/",
  "a PMID links through PubMed",
);
eq(
  referenceHref(ref({ doi: null, url: "https://example.org/a" })),
  "https://example.org/a",
  "a URL is the last resort",
);

const pool = [ref({ id: "r1" }), ref({ id: "r2", status: "draft" }), ref({ id: "r3", doi: null })];
eq(
  publicReferencesById(["r1", "r1", "r2", "r3", "missing"], pool).map((r) => r.id),
  ["r1"],
  "resolving ids keeps only public references, once each",
);

/* ---- overview: unsourced science cannot render ------------------------- */

const science = (overrides) => ({
  id: "s1",
  text: { es: "Estudiado en modelos preclínicos.", en: "Studied in preclinical models." },
  references: ["r1"],
  provenance: { class: "scientific-source", status: "approved" },
  ...overrides,
});
const overview = (overrides) => ({
  slug: "alpha",
  summary: null,
  researchContext: [],
  areasOfInvestigation: [],
  mechanismNotes: [],
  keyReferences: [],
  technicalNotes: [],
  ...overrides,
});
const render = (o, locale = "es") =>
  publicOverview("alpha", locale, { overviews: { alpha: o }, references: pool });

eq(
  render(overview({ researchContext: [science({})] }))?.researchContext.length,
  1,
  "a sourced, approved statement renders",
);
eq(
  render(overview({ researchContext: [science({})] }))?.researchContext[0].references[0].id,
  "r1",
  "…with its reference",
);
eq(
  render(overview({ researchContext: [science({ references: [] })] })),
  null,
  "a statement with NO reference cannot render",
);
eq(
  render(overview({ researchContext: [science({ references: ["r2"] })] })),
  null,
  "a statement whose only reference is unapproved cannot render",
);
eq(
  render(overview({ researchContext: [science({ references: ["r3"] })] })),
  null,
  "a statement whose only reference is invalid cannot render",
);
eq(
  render(overview({ researchContext: [science({ references: ["missing"] })] })),
  null,
  "a statement citing a missing reference cannot render",
);
eq(
  render(
    overview({
      researchContext: [
        science({
          provenance: { class: "derived-copy", status: "approved", derivedFrom: ["product-fact"] },
        }),
      ],
    }),
  ),
  null,
  "a scientific statement filed as marketing copy cannot render",
);
eq(
  render(
    overview({
      mechanismNotes: [
        science({ provenance: { class: "scientific-source", status: "source-needed" } }),
      ],
    }),
  ),
  null,
  "a statement awaiting a source cannot render",
);
eq(
  render(
    overview({
      researchContext: [
        science({ text: { es: "Sin problema en español.", en: "Recommended dose per day." } }),
      ],
    }),
  ),
  null,
  "forbidden vocabulary in EITHER locale blocks the statement in both",
);
eq(
  render(
    overview({
      summary: {
        id: "sum",
        text: { es: "Resumen.", en: "Summary." },
        provenance: { class: "scientific-source", status: "approved" },
      },
    }),
  ),
  null,
  "a summary may not carry a scientific claim",
);
eq(
  render(
    overview({
      summary: {
        id: "sum",
        text: { es: "Resumen.", en: "Summary." },
        provenance: { class: "derived-copy", status: "approved" },
      },
    }),
  ),
  null,
  "a derived summary with no lineage cannot render",
);
eq(
  render(
    overview({
      summary: {
        id: "sum",
        text: { es: "Presentado en tres escalas.", en: "Offered in three strengths." },
        provenance: { class: "derived-copy", status: "approved", derivedFrom: ["product-fact"] },
      },
    }),
  )?.summary,
  "Presentado en tres escalas.",
  "a derived summary with honest lineage renders",
);
eq(
  render(overview({})),
  null,
  "an overview with nothing publishable is null — the section is omitted",
);

const issues = auditOverviews({
  overviews: {
    alpha: overview({
      researchContext: [
        science({ id: "a", references: [] }),
        science({ id: "b", references: ["r2"] }),
      ],
      mechanismNotes: [
        science({ id: "c", text: { es: "Protocolo de inyección.", en: "Protocol." } }),
      ],
    }),
  },
  references: pool,
});
const issueCodes = issues.map((i) => `${i.itemId}:${i.code}`).sort();
ok(
  issueCodes.includes("a:statement_without_reference"),
  "the audit reports an unsourced statement",
);
ok(
  issueCodes.includes("b:reference_not_public"),
  "the audit reports a statement citing an unapproved reference",
);
ok(issueCodes.includes("c:forbidden_term"), "the audit reports forbidden vocabulary");

eq(
  citedReferenceIds("alpha", {
    overviews: { alpha: overview({ researchContext: [science({})], keyReferences: ["r1", "r2"] }) },
    references: pool,
  }),
  ["r1"],
  "cited ids come only from what renders",
);

/* ---- the real registries ----------------------------------------------- */

eq(REFERENCES.length, 0, "no reference is declared until one is checked against its source");
for (const r of REFERENCES) {
  const problems = validateReference(r);
  if (problems.length)
    fail("invalid reference in the registry", `${r.id}: ${problems.map((p) => p.code).join(", ")}`);
}
eq(
  Object.keys(OVERVIEWS).length,
  0,
  "no product overview is declared until it is written against sources",
);
eq(auditOverviews().length, 0, "the declared overviews audit clean");

/* ---- research connection: one truth, both ends ------------------------- */

for (const product of publishedProducts) {
  const refs = referencesForProduct(product.slug);
  if (!refs.every(isPublicReference))
    fail("a product page would cite a non-public reference", product.slug);
}
assertions += publishedProducts.length;
for (const area of AREAS) {
  if (!referencesForArea(area.id).every(isPublicReference))
    fail("an area would cite a non-public reference", area.id);
}
assertions += AREAS.length;
const hubIndex = researchReferenceIndex();
ok(
  hubIndex.every((e) => e.products.length > 0),
  "every hub reference is cited by at least one product",
);
ok(
  hubIndex.every((e) =>
    e.products.every((slug) => referencesForProduct(slug).some((r) => r.id === e.reference.id)),
  ),
  "every hub citation resolves back to the product page that cites it",
);

/* ---- notifications ----------------------------------------------------- */

const order = {
  id: "NG-TEST-001",
  createdAt: "2026-09-10T12:00:00.000Z",
  state: "created",
  lines: [
    { name: "X", presentation: "5 mg", quantity: 2, lineTotal: { amount: 13000, currency: "MXN" } },
  ],
  totals: {
    subtotal: { amount: 13000, currency: "MXN" },
    shipping: { amount: 0, currency: "MXN" },
    total: { amount: 13000, currency: "MXN" },
  },
  delivery: { methodId: "local-priority", estimateDays: 1 },
  contact: { name: "Ana", email: "ana@example.mx", phone: "523320655447" },
  shipping: { notes: null },
};
const messages = orderPlacedMessages(order, "en", () => "Street 1, Guadalajara");
eq(
  messages.map((m) => m.kind),
  ["order.placed.customer", "order.placed.internal"],
  "an order produces a customer and an internal message",
);
eq(
  orderPlacedMessages(order, "en", () => "x").map((m) => m.id),
  messages.map((m) => m.id),
  "message ids are deterministic per order — the basis of idempotency",
);
eq(messages[0].recipient.email, "ana@example.mx", "the customer message goes to the order's email");
ok(!("fulfilment" in messages[0]), "the customer message does not repeat the address back");
ok(
  !("email" in messages[1].recipient),
  "the internal message carries no invented operations address",
);
eq(messages[1].locale, "es", "operations messages are in Spanish");
eq(messages[0].facts.paymentState, "created", "both messages state the real payment state");

__resetOutbox();
const outbox = memoryOutbox();
eq(
  (await dispatch(messages, outbox, noneChannel)).map((r) => r.status),
  ["queued", "queued"],
  "with no channel, messages are queued, not dropped",
);
eq((await outbox.pending()).length, 2, "queued messages are the emails that are owed");
eq((await outbox.enqueue(messages[0])).created, false, "enqueue is idempotent on message id");

let sends = 0;
const working = {
  id: "fake",
  isConfigured: () => true,
  send: async () => ({ ok: true, providerMessageId: `m-${++sends}` }),
};
__resetOutbox();
const outbox2 = memoryOutbox();
eq(
  (await dispatch(messages, outbox2, working)).map((r) => r.status),
  ["sent", "sent"],
  "a configured channel sends",
);
eq(
  (await dispatch(messages, outbox2, working)).map((r) => r.status),
  ["duplicate", "duplicate"],
  "re-dispatching a sent order sends nothing twice",
);
eq(sends, 2, "the provider was called exactly once per message");

const failing = {
  id: "down",
  isConfigured: () => true,
  send: async () => ({ ok: false, error: { code: "provider_error", retryable: true } }),
};
__resetOutbox();
eq(
  (await dispatch(messages, memoryOutbox(), failing)).map((r) => r.status),
  ["failed", "failed"],
  "a provider failure is recorded, not thrown",
);

const exploding = {
  enqueue: async () => {
    throw new Error("db down");
  },
};
eq(
  (await dispatch(messages, exploding, working)).map((r) => r.status),
  ["failed", "failed"],
  "an outbox failure never throws out of dispatch",
);

/* The order domain does not know notifications exist. */
const orderDomain = [
  "src/domain/order/index.ts",
  "src/domain/order/types.ts",
  "src/domain/order/events.ts",
]
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
ok(
  !/notifications|resend|sendgrid|nodemailer|@sendgrid/i.test(orderDomain),
  "the order domain has no dependency on notifications or an email provider",
);

/* ---- report ------------------------------------------------------------ */

if (failures.length) {
  console.error(`\ncontent check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `content check passed — ${assertions} assertions, ${REFERENCES.length} references / ` +
    `${Object.keys(OVERVIEWS).length} overviews declared, ${FORBIDDEN_PUBLIC_TERMS.length} forbidden stems, both dictionaries clean`,
);
