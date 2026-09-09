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
const PROTOTYPE =
  /(PLACEHOLDER|\bTODO\b|\bTBD\b|COMING SOON|under construction|en construcci[oó]n|[Pp]or definir|pendientes? de verificaci[oó]n|pending verification|FIXME|lorem ipsum)/i;

/*
 * "Pending verification" against a DOCUMENT is the honest state of a
 * certificate that has not been produced, and it is the ONLY place the phrase
 * may reach a reader.
 *
 * The allowance is deliberately narrow: the phrase has to be introduced by a
 * documentation label — the ledger's "Estado — …" line, or the register column
 * headed "Documentación". Anywhere else it is describing a price, a format or
 * an availability we now actually have, which is how the bag came to tell
 * customers that prices were still pending after they were set.
 */
const ALLOWED_PENDING =
  /(Estado|State|Documentación|Documentation)\s*(—\s*)?(Pendiente de verificación|Pending verification)/;

const visibleText = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ");

for (const file of htmlFiles) {
  const text = visibleText(readFileSync(file, "utf8"));
  for (const match of text.matchAll(new RegExp(PROTOTYPE, "gi"))) {
    const around = text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 60);
    if (ALLOWED_PENDING.test(around)) continue;
    fail("prototype language visible to a reader", `"${match[0]}" in ${file} — …${around.trim()}…`);
  }
}

/* --------------------------------------------------- 3. environment leakage
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

/* ------------------------------------------------------------- 4. canonicals
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
