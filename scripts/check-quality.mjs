/**
 * QUALITY / EVIDENCE INVARIANTS.
 *
 * The evidence resolver decides every trust state NEOGEN shows. These checks
 * drive it with fixture registries — lots, documents, issuers — so every rule
 * is exercised against data that does exist, while the site itself reads the
 * real registries, which are empty.
 *
 * Negative-tested throughout. The failures that matter here are not "a badge
 * is missing" but "a badge appeared that no document supports":
 *
 *   a report on one presentation shown on another     → refused
 *   a lot COA widening to its presentation's other lots → refused
 *   an analysis attached to a whole product            → refused
 *   a Janoshik state without a report id               → refused, not downgraded
 *   supplier paperwork reaching a public surface       → refused twice over
 *   an unknown issuer or document type                 → refused, reported
 *   no documents                                       → no state at all
 *
 *   npm run check:quality
 */
import { DOCUMENTS, INTERNAL_ONLY_TYPES } from "../src/content/documents.ts";
import { galleryImages, resolveStageStill, NO_MEDIA } from "../src/content/media/index.ts";
import { publishedProducts } from "../src/data/catalog/index.ts";
import { ISSUERS, LOTS, publicLot } from "../src/data/quality/index.ts";
import {
  auditDocuments,
  evaluateDocument,
  isJanoshikVerified,
  publicEvidenceIndex,
  resolveEvidence,
} from "../src/domain/quality/index.ts";

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

/* ---- fixtures ---------------------------------------------------------- */

const ALPHA = { slug: "alpha", variants: [{ id: "alpha-5mg" }, { id: "alpha-10mg" }] };
const BETA = { slug: "beta", variants: [{ id: "beta-5mg" }] };

const lot = (id, slug, variantId, publicVisibility = true) => ({
  id,
  slug,
  variantId,
  internalReference: `PO-${id}`,
  supplierBatchReference: `SUPPLIER-BATCH-${id}`,
  manufacturedOn: "2026-06-01",
  receivedOn: "2026-07-01",
  expiresOn: "2028-06-01",
  retestOn: null,
  status: "in-stock",
  publicVisibility,
});

const LOTS_FX = [
  lot("L-ALPHA-10-A", "alpha", "alpha-10mg"),
  lot("L-ALPHA-10-B", "alpha", "alpha-10mg"),
  lot("L-ALPHA-10-PRIVATE", "alpha", "alpha-10mg", false),
  lot("L-BETA-5-A", "beta", "beta-5mg"),
];

let seq = 0;
const doc = (overrides) => ({
  id: `doc-${++seq}`,
  type: "coa",
  issuer: "neogen",
  scope: { level: "variant", slug: "alpha", variantId: "alpha-10mg" },
  file: { href: "/documents/x.pdf", format: "PDF", size: "120 KB" },
  reportId: null,
  reportUrl: null,
  issuedOn: "2026-08-01",
  visibility: "public",
  status: "approved",
  ...overrides,
});

const reg = (documents, lots = LOTS_FX, issuers = ISSUERS) => ({ documents, lots, issuers });
const reason = (d, subject = ALPHA, lots = LOTS_FX) => {
  const r = evaluateDocument(d, subject, reg([d], lots));
  return r.ok ? "ok" : r.reason;
};
const states = (evidence, variantId) =>
  evidence.presentations.find((p) => p.variantId === variantId)?.states ?? [];

/* ---- empty state: no document, no state -------------------------------- */

const empty = resolveEvidence(ALPHA, reg([]));
eq(empty.hasEvidence, false, "no documents → hasEvidence is false");
eq(empty.product.length, 0, "no documents → no product-level record");
eq(empty.presentations.length, 2, "every presentation is still listed");
ok(
  empty.presentations.every((p) => p.records.length === 0 && p.states.length === 0),
  "no documents → no presentation carries any state",
);

/* ---- narrowest level: a variant report stays on its variant ------------ */

const variantCoa = resolveEvidence(ALPHA, reg([doc({})]));
eq(states(variantCoa, "alpha-10mg"), ["coa-available"], "a 10 mg COA gives the 10 mg a COA state");
eq(states(variantCoa, "alpha-5mg"), [], "a 10 mg COA gives the 5 mg NOTHING");
eq(variantCoa.product.length, 0, "a variant COA never becomes a product-level record");

/* A report for another product's presentation cannot attach here. */
eq(
  reason(doc({ scope: { level: "variant", slug: "alpha", variantId: "beta-5mg" } })),
  "scope_unknown_variant",
  "a variant scope naming another product's presentation is refused",
);
eq(
  reason(doc({ scope: { level: "variant", slug: "beta", variantId: "beta-5mg" } })),
  "scope_other_product",
  "a document for another product is refused",
);

/* ---- no analysis at product level ------------------------------------- */

for (const type of ["coa", "lot-coa", "third-party-analysis", "analytical-report"]) {
  eq(
    reason(
      doc({
        type,
        issuer: "janoshik",
        reportId: "T-1",
        scope: { level: "product", slug: "alpha" },
      }),
    ),
    type === "third-party-analysis" ||
      type === "analytical-report" ||
      type === "coa" ||
      type === "lot-coa"
      ? type === "coa" || type === "lot-coa" || type === "analytical-report"
        ? "level_not_allowed_for_type"
        : "level_not_allowed_for_type"
      : "ok",
    `an analysis of type \`${type}\` attached to the whole product is refused`,
  );
}
const productCoa = resolveEvidence(
  ALPHA,
  reg([doc({ scope: { level: "product", slug: "alpha" } })]),
);
ok(!productCoa.hasEvidence, "a product-level COA resolves to nothing at all — it cannot widen");
ok(
  productCoa.presentations.every((p) => p.states.length === 0),
  "a product-level COA gives no presentation a state",
);

/* Product-level TECHNICAL documentation is allowed — and stays at product level. */
const tech = resolveEvidence(
  ALPHA,
  reg([doc({ type: "technical-document", scope: { level: "product", slug: "alpha" } })]),
);
eq(tech.product.length, 1, "a product technical document resolves at product level");
eq(tech.product[0].states, ["documentation-available"], "…as documentation, never as an analysis");
ok(
  tech.presentations.every((p) => p.states.length === 0),
  "product documentation does NOT give presentations a state",
);

/* ---- lots: a lot COA covers that lot only ------------------------------ */

const lotCoa = resolveEvidence(
  ALPHA,
  reg([doc({ type: "lot-coa", scope: { level: "lot", lotId: "L-ALPHA-10-A" } })]),
);
const tenRecords = lotCoa.presentations.find((p) => p.variantId === "alpha-10mg").records;
eq(tenRecords.length, 1, "a lot COA appears once, on its lot's presentation");
eq(tenRecords[0].lot?.id, "L-ALPHA-10-A", "…naming its exact lot");
eq(tenRecords[0].level, "lot", "…at lot level");
eq(tenRecords[0].states, ["lot-coa"], "…as a lot COA, never a presentation-wide COA");
eq(states(lotCoa, "alpha-5mg"), [], "a 10 mg lot COA gives the 5 mg nothing");
eq(lotCoa.product.length, 0, "a lot COA never widens to the product");
ok(
  !tenRecords.some((r) => r.lot?.id === "L-ALPHA-10-B"),
  "a lot COA says nothing about a sibling lot of the same presentation",
);

eq(
  reason(
    doc({ type: "lot-coa", scope: { level: "variant", slug: "alpha", variantId: "alpha-10mg" } }),
  ),
  "level_not_allowed_for_type",
  "a lot COA without a lot is refused",
);
eq(
  reason(doc({ type: "lot-coa", scope: { level: "lot", lotId: "L-ALPHA-10-PRIVATE" } })),
  "lot_not_public",
  "evidence for a non-public lot does not render",
);
eq(
  reason(doc({ type: "lot-coa", scope: { level: "lot", lotId: "L-BETA-5-A" } })),
  "scope_other_product",
  "a lot belonging to another product is refused",
);
eq(
  reason(doc({ type: "lot-coa", scope: { level: "lot", lotId: "L-DOES-NOT-EXIST" } })),
  "scope_unknown_lot",
  "an unknown lot is refused",
);
/* A COA declared at lot level reads as a lot COA. */
eq(
  resolveEvidence(ALPHA, reg([doc({ scope: { level: "lot", lotId: "L-ALPHA-10-A" } })]))
    .presentations[1].records[0].states,
  ["lot-coa"],
  "a COA attached to a lot is a lot COA",
);

/* ---- JANOSHIK: all five conditions, or nothing ------------------------- */

const jan = (overrides) =>
  doc({
    type: "third-party-analysis",
    issuer: "janoshik",
    reportId: "JAN-TASK-0001",
    reportUrl: "https://example.org/report/JAN-TASK-0001",
    file: null,
    ...overrides,
  });

const verified = resolveEvidence(ALPHA, reg([jan({})]));
eq(
  states(verified, "alpha-10mg"),
  ["janoshik-verified", "third-party-tested"],
  "a complete Janoshik record verifies exactly its presentation",
);
eq(states(verified, "alpha-5mg"), [], "Janoshik on the 10 mg does NOT verify the 5 mg");
eq(verified.product.length, 0, "Janoshik never verifies the product as a whole");

eq(reason(jan({ reportId: null })), "janoshik_without_report_id", "no report id → refused");
eq(reason(jan({ reportId: "   " })), "janoshik_without_report_id", "blank report id → refused");
ok(
  !resolveEvidence(ALPHA, reg([jan({ reportId: null })])).hasEvidence,
  "a Janoshik record without a report id is NOT downgraded to a generic tested state",
);
eq(
  reason(jan({ scope: { level: "product", slug: "alpha" } })),
  "level_not_allowed_for_type",
  "Janoshik at product level → refused",
);
eq(
  reason(jan({ type: "coa" })),
  "janoshik_wrong_type",
  "Janoshik issuing a non-analysis type → refused",
);
eq(
  reason(jan({ visibility: "internal" })),
  "not_public",
  "Janoshik not explicitly public → refused",
);
eq(
  reason(jan({ status: "owner-review" })),
  "not_approved",
  "Janoshik record not approved → refused",
);
eq(
  reason(jan({ issuer: "Janoshik" })),
  "unknown_issuer",
  "issuer must match exactly — `Janoshik` is not `janoshik`",
);
eq(
  reason(jan({ issuer: "janoshik-analytical" })),
  "unknown_issuer",
  "a near-miss issuer id is unknown",
);

const janLot = resolveEvidence(
  ALPHA,
  reg([jan({ scope: { level: "lot", lotId: "L-ALPHA-10-A" } })]),
);
const janLotRecord = janLot.presentations[1].records[0];
eq(janLotRecord.lot?.id, "L-ALPHA-10-A", "a lot-scoped Janoshik report names its lot");
ok(janLotRecord.states.includes("janoshik-verified"), "…and verifies that lot");
eq(janLot.presentations[0].records.length, 0, "…and nothing else");

/* The predicate itself, independent of the pipeline. */
ok(
  !isJanoshikVerified(jan({ issuer: "neogen" }), "variant"),
  "another issuer with a report id is not Janoshik",
);
ok(!isJanoshikVerified(jan({}), "product"), "the predicate refuses product level");
ok(isJanoshikVerified(jan({}), "variant"), "the predicate accepts an exact presentation");
ok(isJanoshikVerified(jan({}), "lot"), "the predicate accepts an exact lot");

/* A third-party analysis from a non-independent issuer is not third-party. */
eq(
  reason(doc({ type: "third-party-analysis", issuer: "supplier" })),
  "analysis_by_non_independent_issuer",
  "a 'third-party' analysis issued by the supplier is refused",
);
eq(
  reason(doc({ type: "third-party-analysis", issuer: "neogen" })),
  "analysis_by_non_independent_issuer",
  "a 'third-party' analysis issued by NEOGEN is refused",
);
/* An analytical report from a non-independent issuer is documentation, not testing. */
eq(
  resolveEvidence(ALPHA, reg([doc({ type: "analytical-report", issuer: "neogen" })]))
    .presentations[1].states,
  ["documentation-available"],
  "an in-house analytical report is documentation, never 'independent analysis'",
);

/* ---- supplier documents never public ----------------------------------- */

ok(INTERNAL_ONLY_TYPES.has("supplier-documentation"), "supplier documentation is internal-only");
eq(
  reason(doc({ type: "supplier-documentation", issuer: "supplier", visibility: "public" })),
  "internal_type",
  "supplier documentation marked public is STILL refused",
);
ok(
  !resolveEvidence(ALPHA, reg([doc({ type: "supplier-documentation", issuer: "supplier" })]))
    .hasEvidence,
  "supplier documentation never reaches a resolution",
);
/* A supplier-issued COA may be public, but the supplier is never named. */
const supplierCoa = resolveEvidence(ALPHA, reg([doc({ issuer: "supplier" })]));
eq(
  supplierCoa.presentations[1].records[0].issuer.name,
  null,
  "a supplier issuer is never named publicly",
);
eq(supplierCoa.presentations[1].records[0].issuer.kind, "supplier", "…only its role is exposed");

/* ---- visibility, status, unknowns -------------------------------------- */

eq(reason(doc({ visibility: "internal" })), "not_public", "an internal document does not render");
for (const status of ["draft", "source-needed", "owner-review"]) {
  eq(reason(doc({ status })), "not_approved", `a \`${status}\` document does not render`);
}
eq(reason(doc({ type: "magic-seal" })), "unknown_type", "an unknown document type fails safe");
eq(reason(doc({ issuer: "some-lab" })), "unknown_issuer", "an unknown issuer fails safe");
eq(reason(doc({ issuer: "__proto__" })), "unknown_issuer", "a prototype key is not an issuer");
eq(
  reason(doc({ file: null, reportUrl: null })),
  "no_file_or_report_url",
  "a document with nothing to open does not render",
);
eq(
  reason(doc({ file: null, reportUrl: "http://insecure.example/report" })),
  "report_url_invalid",
  "a non-https report link is refused",
);

/* ---- the audit reports errors, not waiting documents ------------------- */

const audited = auditDocuments(
  [ALPHA, BETA],
  reg([
    doc({ id: "wait-draft", status: "draft" }),
    doc({ id: "wait-internal", visibility: "internal" }),
    doc({ id: "wait-supplier", type: "supplier-documentation", issuer: "supplier" }),
    jan({ id: "err-janoshik", reportId: null }),
    doc({ id: "err-issuer", issuer: "nobody" }),
    doc({ id: "err-widen", scope: { level: "product", slug: "alpha" } }),
    doc({ id: "err-orphan", scope: { level: "variant", slug: "gamma", variantId: "gamma-1mg" } }),
    doc({ id: "dup" }),
    doc({ id: "dup" }),
  ]),
);
const auditIds = audited.map((i) => `${i.documentId}:${i.reason}`).sort();
eq(
  auditIds,
  [
    "dup:duplicate_id",
    "err-issuer:unknown_issuer",
    "err-janoshik:janoshik_without_report_id",
    "err-orphan:scope_matches_no_product",
    "err-widen:level_not_allowed_for_type",
  ].sort(),
  "the audit reports every data error and none of the waiting documents",
);

/* ---- the index across products ----------------------------------------- */

const index = publicEvidenceIndex(
  [ALPHA, BETA],
  reg([
    doc({}),
    jan({ scope: { level: "lot", lotId: "L-BETA-5-A" } }),
    doc({ visibility: "internal" }),
  ]),
);
eq(index.length, 2, "the public index holds only resolved public records");
eq(index.map((r) => r.slug).sort(), ["alpha", "beta"], "each index row names its product");

/* ---- lots: the public projection strips internal fields ---------------- */

const projected = publicLot(LOTS_FX[0]);
ok(projected !== null, "a public lot projects");
ok(!("supplierBatchReference" in projected), "the supplier batch reference is not on a public lot");
ok(!("internalReference" in projected), "the internal reference is not on a public lot");
eq(publicLot(LOTS_FX[2]), null, "a non-public lot has no public projection");
const leaked = JSON.stringify(
  resolveEvidence(
    ALPHA,
    reg([doc({ type: "lot-coa", scope: { level: "lot", lotId: "L-ALPHA-10-A" } })]),
  ),
);
ok(
  !leaked.includes("SUPPLIER-BATCH"),
  "a resolved evidence record never carries a supplier batch reference",
);
ok(!leaked.includes("PO-L-"), "a resolved evidence record never carries an internal reference");

/* ---- the real registries ----------------------------------------------- */

eq(DOCUMENTS.length, 0, "no real document is declared");
eq(LOTS.length, 0, "no real lot is declared");
eq(auditDocuments(publishedProducts).length, 0, "the real registries audit clean");
for (const product of publishedProducts) {
  const evidence = resolveEvidence(product);
  if (evidence.hasEvidence)
    fail("a product resolved evidence with no documents declared", product.slug);
}
assertions += publishedProducts.length;
eq(publicEvidenceIndex(publishedProducts).length, 0, "the public documentation index is empty");

/* ---- media readiness ---------------------------------------------------- */

const img = (src) => ({ src, alt: "x", width: 800, height: 1000 });
eq(resolveStageStill(NO_MEDIA), null, "no media → no still");
eq(
  resolveStageStill({
    ...NO_MEDIA,
    model: "/models/x.glb",
    poster: img("/p.jpg"),
    primary: img("/photo.jpg"),
  })?.src,
  "/p.jpg",
  "with a model, the stage still is the model's poster — never a photograph",
);
eq(
  resolveStageStill({ ...NO_MEDIA, primary: img("/photo.jpg") })?.src,
  "/photo.jpg",
  "without a model, the stage still is the primary photograph",
);
eq(
  galleryImages({
    ...NO_MEDIA,
    alternates: [img("/a1.jpg"), img("/a2.jpg")],
    detail: img("/d.jpg"),
    packaging: img("/pk.jpg"),
  }).map((g) => `${g.role}:${g.image.src}`),
  ["alternate:/a1.jpg", "alternate:/a2.jpg", "detail:/d.jpg", "packaging:/pk.jpg"],
  "gallery images come in alternate → detail → packaging order",
);
eq(galleryImages(NO_MEDIA).length, 0, "no supplementary media → an empty gallery");

/* ---- report ------------------------------------------------------------ */

if (failures.length) {
  console.error(`\nquality check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `quality check passed — ${assertions} assertions, ${DOCUMENTS.length} documents / ${LOTS.length} lots declared, ` +
    `${Object.keys(ISSUERS).length} issuers, evidence resolves for ${publishedProducts.length} products`,
);
