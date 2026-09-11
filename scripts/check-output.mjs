/**
 * PRODUCTION OUTPUT CHECKS.
 *
 * Reads what the build actually emits, because the risks here are not
 * expressible in the source: a placeholder reaches a customer through rendered
 * text, and a supplier's name reaches the public through a bundle, not through
 * a variable. Both have happened, so both are asserted.
 *
 *   node scripts/check-output.mjs            # after `next build`
 *   npm run check:output
 *
 * Set CHECK_ORIGIN to audit a running server instead of the build directory.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { publishedProducts } from "../src/data/catalog/index.ts";
import { publicEvidenceIndex, resolveEvidence } from "../src/domain/quality/index.ts";

const OUT = ".next";
const failures = [];
const fail = (what, detail) => failures.push(`${what}: ${detail}`);

/* ------------------------------------------------------------------ files */

function walk(dir, match) {
  const found = [];
  const visit = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) visit(full);
      else if (match.test(e.name)) found.push(full);
    }
  };
  visit(dir);
  return found;
}

const htmlFiles = walk(path.join(OUT, "server", "app"), /\.html$/);
const clientAssets = [
  ...walk(path.join(OUT, "static"), /\.(js|css|json|map)$/),
  ...walk(path.join(OUT, "server", "app"), /\.(html|rsc|json)$/),
];

if (htmlFiles.length === 0) fail("no prerendered HTML found", `run \`next build\` first (${OUT})`);

/* ----------------------------------------------- 1. supplier confidentiality
 *
 * The supplier document is a private internal reference. None of its
 * identifying detail — the company, its people, its channels, its codes or its
 * wholesale cost — may appear in anything the browser can fetch.
 */
const SUPPLIER_TERMS = [
  "ERP Price list",
  "10kits",
  "50kits",
  "100kits",
  "kits+",
  "Cat.No",
  "SUPPLIER_",
  "references/private",
];

/* Supplier catalogue codes: distinctive enough to prove a leak, and they are
   deliberately never emitted by the importer. */
const SUPPLIER_CODES =
  /\b(RT(?:5|10|15|20|30|40|60)|BBG70|KL80|CU(?:50|100)|CND(?:5|10)|CP(?:10|20)|ADA(?:5|10)|LC1201|B1201|FST 344|HHB)\b/;

for (const file of clientAssets) {
  const text = readFileSync(file, "utf8");
  for (const term of SUPPLIER_TERMS) {
    if (text.includes(term)) fail("supplier term in public output", `"${term}" in ${file}`);
  }
  const code = text.match(SUPPLIER_CODES);
  if (code) fail("supplier catalogue code in public output", `"${code[0]}" in ${file}`);
}

/* ------------------------------------------------- 2. prototype language
 *
 * Only what a reader can SEE: scripts, styles and attributes are stripped
 * first, so an internal marker in a comment or a class name is not a failure
 * while the same word in body text is.
 */
/*
 * Two classes of marker, matched differently.
 *
 * CODE MARKERS are conventionally upper-case and must stay case-SENSITIVE.
 * Matching /todo/i against Spanish prose is a false positive waiting to
 * happen, and it happened: "Todo el catálogo" — the catalogue's own "everything"
 * link — tripped a TODO on eight discovery-area pages.
 *
 * PROSE PHRASES are written by people and may be capitalised any way, so they
 * stay case-insensitive.
 */
const CODE_MARKERS = /\b(PLACEHOLDER|TODO|FIXME|TBD|XXX)\b/g;
const PROSE_MARKERS =
  /(COMING SOON|under construction|en construcci[oó]n|[Pp]or definir|pendientes? de verificaci[oó]n|pending verification|lorem ipsum)/gi;

/*
 * NO "PENDING" ALLOWANCE ANY MORE.
 *
 * There used to be one: a document ledger's "Estado — Pendiente de
 * verificación" and a register column headed "Documentación". Phase 11 retired
 * both — a trust surface now shows a resolved document or a deliberate
 * no-evidence state, never a pending one — so the phrase is a failure
 * everywhere a reader can see it.
 */
const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ");

for (const file of htmlFiles) {
  const text = visibleText(readFileSync(file, "utf8"));
  for (const pattern of [CODE_MARKERS, PROSE_MARKERS]) {
    for (const match of text.matchAll(pattern)) {
      const around = text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 60);
      fail(
        "prototype language visible to a reader",
        `"${match[0]}" in ${file} — …${around.trim()}…`,
      );
    }
  }
}

/* ------------------------------------------- 3. server data in the browser
 *
 * The catalogue and the price map are SERVER data. They are large, they change
 * with every import run, and nothing in the browser needs them: a client
 * island receives the handful of values it renders as props.
 *
 * This has regressed twice, both times through an innocuous-looking import —
 * a media resolver that needed the registry, and `ORDER_LIMITS` sitting in the
 * same barrel as the prices. Neither showed up in a type error or a lint
 * warning; both shipped 85 products to every visitor.
 */
const SERVER_ONLY_MARKERS = [
  /* A variant id: only ever produced by the generated catalogue. */
  "semaglutide-5mg",
  "generatedProducts",
  "generatedPrices",
  /* The discovery assignment map — server-side merchandising data. */
  "owner-confirmed",
];

for (const file of walk(path.join(OUT, "static"), /\.js$/)) {
  const text = readFileSync(file, "utf8");
  for (const marker of SERVER_ONLY_MARKERS) {
    if (text.includes(marker)) {
      fail(
        "server-only data in a client bundle",
        `"${marker}" in ${file} — a client component is importing a data barrel; ` +
          `import the leaf module (e.g. @/data/commerce/limits) instead`,
      );
    }
  }
}

/* --------------------------------------------------- 4. environment leakage
 *
 * Only `NEXT_PUBLIC_*` is meant to reach the client. Anything else in a client
 * bundle is a server value that escaped.
 */
const ENV_LEAK = /process\.env\.(?!NEXT_PUBLIC_)([A-Z][A-Z0-9_]{3,})/g;
for (const file of walk(path.join(OUT, "static"), /\.js$/)) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(ENV_LEAK)) {
    if (["NODE_ENV", "TURBOPACK", "NEXT_RUNTIME"].includes(m[1])) continue;
    fail("non-public env var referenced in a client bundle", `${m[1]} in ${file}`);
  }
}

/* ------------------------------------------- 5. checkout & policy surfaces
 *
 * Two assertions about pages that must NOT be public, both checked against
 * what the build emitted rather than against the source.
 *
 * POLICIES. Seven policy slots are declared and none is approved, so
 * `generateStaticParams` yields nothing and no policy HTML may exist. A file
 * here would mean a legal document had been published without clearing owner
 * and counsel review — the exact failure `content/policies.ts` is shaped to
 * prevent.
 *
 * CHECKOUT. The flow is `force-dynamic`, so no HTML should be emitted for it
 * either. If a future change reintroduces prerendering, the page must at
 * least carry `noindex` — a cached checkout step is a customer's address
 * served to whoever asks next.
 */
for (const file of htmlFiles) {
  if (/[\\/]politicas[\\/]/.test(file)) {
    fail(
      "a policy page was published",
      `${file} — no policy is approved, so none may render publicly`,
    );
  }
  if (/[\\/]checkout[\\/]/.test(file)) {
    const html = readFileSync(file, "utf8");
    if (!/<meta name="robots" content="[^"]*noindex/.test(html)) {
      fail("a checkout page was prerendered without noindex", file);
    }
  }
}

/* --------------------------------------------- 6. no payment SDK is loaded
 *
 * NEOGEN has no configured payment processor, so no processor's JavaScript
 * may be in the output. This is not a hypothetical: adding an SDK "ready for
 * later" is the ordinary way a site starts making third-party requests on a
 * page that has no payment to take, and on a checkout that would be sending
 * customers' presence to a provider they never chose.
 */
const PAYMENT_SDKS = [
  "js.stripe.com",
  "sdk.mercadopago.com",
  "mercadopago.min.js",
  "js.clip.mx",
  "conekta.js",
  "openpay",
  "paypal.com/sdk",
  "checkout.js",
];
for (const file of [...clientAssets, ...htmlFiles]) {
  const text = readFileSync(file, "utf8");
  for (const sdk of PAYMENT_SDKS) {
    if (text.includes(sdk)) {
      fail("a payment SDK reference is in the output", `"${sdk}" in ${file}`);
    }
  }
}

/* --------------------------------------------- 7. trust states are real
 *
 * Every visible quality state carries `data-evidence-state`, and the resolver
 * is the only thing that can produce one. So the number of those attributes in
 * the built product pages must equal the number of states the resolver
 * produces for the real registries, in both locales. Today that is zero — and
 * a badge rendered by any other means would make it non-zero.
 */
const expectedStates =
  publishedProducts.reduce((n, product) => {
    const evidence = resolveEvidence(product);
    return (
      n +
      [...evidence.product, ...evidence.presentations.flatMap((p) => p.records)].reduce(
        (m, record) => m + record.states.length,
        0,
      )
    );
  }, 0) * 2;
let renderedStates = 0;
for (const file of htmlFiles) {
  renderedStates += (readFileSync(file, "utf8").match(/data-evidence-state=/g) ?? []).length;
}
if (renderedStates !== expectedStates) {
  fail(
    "rendered quality states do not match the evidence resolver",
    `${renderedStates} rendered, ${expectedStates} resolved — a state reached a page without a document`,
  );
}

/* The documentation explorer exists only once a public document does. */
if (publicEvidenceIndex(publishedProducts).length === 0) {
  for (const file of htmlFiles) {
    if (/[\\/]investigacion[\\/]calidad/.test(file)) {
      fail("the documentation explorer was published with no public document", file);
    }
  }
}

/*
 * Private lot fields and the issuer registry stay on the server. If either
 * name appears in a browser bundle, quality data is being shipped to clients.
 */
for (const file of walk(path.join(OUT, "static"), /\.js$/)) {
  const text = readFileSync(file, "utf8");
  for (const marker of ["supplierBatchReference", "internalReference", "Janoshik Analytical"]) {
    if (text.includes(marker))
      fail("private quality data in a client bundle", `"${marker}" in ${file}`);
  }
}

/* ------------------------------------------------------------- 8. canonicals
 *
 * A build that shipped with the fallback origin would publish canonical URLs
 * pointing at a developer's machine.
 */
for (const file of htmlFiles) {
  // Error and 404 pages are not indexable destinations and carry no canonical.
  if (/_(global-error|not-found)\.html$/.test(file)) continue;
  const html = readFileSync(file, "utf8");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/);
  if (!canonical) fail("page has no canonical", file);
  else if (/localhost|127\.0\.0\.1/.test(canonical[1])) {
    fail(
      "canonical points at localhost",
      `${canonical[1]} — set NEXT_PUBLIC_SITE_URL at build time`,
    );
  }
}

/* ---------------------------------------------------------------- report */

const scanned = `${htmlFiles.length} HTML / ${clientAssets.length} client assets`;
if (failures.length) {
  console.error(`\noutput check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures.slice(0, 40)) console.error(`  ${f}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  console.error(`\n${scanned}\n`);
  process.exit(1);
}
console.log(`output check passed — ${scanned}`);
