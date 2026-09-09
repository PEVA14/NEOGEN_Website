/**
 * Draft the NEOGEN catalog from the private supplier extraction.
 *
 * READ THIS BEFORE RUNNING IT.
 *
 * This script is a ONE-WAY DRAFTING TOOL, not a build step. It reads a
 * gitignored private document and emits a draft for human review. It must never
 * run during `next build`, and its output must never be published unreviewed —
 * the source has merged table cells, continuation lines, incomplete price rows
 * and at least one character-level typo (`lmg` for `1mg`).
 *
 * WHAT IT DELIBERATELY DOES NOT EMIT
 * ----------------------------------
 * Supplier codes and supplier cost stay OUT of the generated data. The
 * application has no use for either, and both are confidential. Cost is used
 * here only to compute a NEOGEN retail price and is then discarded; the
 * code→product mapping is written to a separate private file for internal
 * reconciliation.
 *
 * PRICING: retail MXN = supplier USD (base column) x MARKUP x FX.
 * The BASE column is used, never a volume tier — actual order volume is
 * unknown, so the conservative cost is the right basis. Buying at 50kits+ only
 * widens the margin.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "references/private/SUPPLIER_CATALOG_FULL_2026-09-08.md";
const MARKUP = 5;
const FX_MXN_PER_USD = 20;

const raw = readFileSync(SOURCE, "utf8");
const body = raw.slice(raw.indexOf("```") + 3, raw.lastIndexOf("```"));
const lines = body.split("\n").map((l) => l.replace(/\s+$/, "")).filter(Boolean);

const money = /\$\s*([\d,]+(?:\.\d+)?)/g;
const isCodeRow = /^\s*([A-Za-z0-9][A-Za-z0-9.\- ]{0,11}?)\s*\|/;

/** Parse a specification cell into a structured strength. Returns null if unrecognised. */
function parseSpec(s) {
  const t = s.replace(/\s+/g, "");
  let m;
  if ((m = t.match(/^(\d+(?:\.\d+)?)ml\/vial\*(\d+)vials?$/i)))
    return { strength: { kind: "volume", ml: +m[1] }, vials: +m[2] };
  if ((m = t.match(/^(\d+(?:\.\d+)?)mg\/(\d+(?:\.\d+)?)ml\*(\d+)vials?$/i)))
    return { strength: { kind: "solution", mg: +m[1], ml: +m[2] }, vials: +m[3] };
  if ((m = t.match(/^([\d+]+)mg\*(\d+)vials?$/i)) && m[1].includes("+"))
    return { strength: { kind: "blend", componentsMg: m[1].split("+").map(Number) }, vials: +m[2] };
  if ((m = t.match(/^(\d+(?:\.\d+)?)mg\*(\d+)vials?$/i)))
    return { strength: { kind: "solid", mg: +m[1] }, vials: +m[2] };
  if ((m = t.match(/^(\d+(?:\.\d+)?)mcg\*(\d+)vials?$/i)))
    return { strength: { kind: "solid", mg: +m[1] / 1000 }, vials: +m[2] };
  // International Units — HGH, HCG, HMG, botulinum. Not convertible to mg.
  if ((m = t.match(/^(\d+(?:\.\d+)?)iu[*/](\d+)vials?$/i)))
    return { strength: { kind: "iu", iu: +m[1] }, vials: +m[2] };
  // `10ml * 10vials` — volume per vial, written without the `/vial` suffix.
  if ((m = t.match(/^(\d+(?:\.\d+)?)ml\*(\d+)vials?$/i)))
    return { strength: { kind: "volume", ml: +m[1] }, vials: +m[2] };
  return null;
}

const rows = [];
const orphanNames = [];

for (const line of lines) {
  // `#####` are the extractor's page markers, not content. Without this they
  // matched the orphan-name rule and became a product called "PAGE 1".
  if (/^\s*#/.test(line)) continue;
  if (/^Cat\.No|^Shipping|^Except|^Additional|^express|^Orders over|^Excludes|^liquids/i.test(line)) continue;

  const prices = [...line.matchAll(money)].map((m) => Number(m[1].replace(/,/g, "")));
  const codeM = line.match(isCodeRow);

  if (codeM && prices.length > 0) {
    const fields = line.split("|").map((f) => f.trim());
    const code = fields[0];
    // The specification is whichever field parses as one.
    let specIdx = -1, spec = null;
    for (let i = 1; i < fields.length; i++) {
      const p = parseSpec(fields[i].replace(money, "").trim());
      if (p) { spec = p; specIdx = i; break; }
    }
    /*
     * A cell between the code and the spec is either a NAME or a COMPOSITION.
     * The source distinguishes them by parenthesis: `TB500` is a name,
     * `(GHK-CU 50mg+TB-500` is the opening of a composition whose remainder
     * continues on the next line. Treating the latter as a name is what made
     * GLOW come through as "(GHK-CU 50mg+TB-500".
     */
    const between = specIdx > 1 ? fields.slice(1, specIdx).join(" ").trim() : null;
    const isComposition = between !== null && /^\(/.test(between);
    rows.push({
      code,
      name: isComposition ? null : between,
      composition: isComposition ? between : null,
      spec,
      rawSpec: fields[specIdx] ?? null,
      prices,
      line,
    });
  } else if (prices.length > 0 && parseSpec(line.split("|")[0].replace(money, "").trim())) {
    /*
     * A priced row with NO code — the source drops the code cell when a product
     * continues across a page break. It belongs to the product above it.
     */
    const spec = parseSpec(line.split("|")[0].replace(money, "").trim());
    rows.push({ code: null, name: null, composition: null, spec, rawSpec: line.split("|")[0].trim(), prices, line });
  } else if (!/\$/.test(line) && /[A-Za-z]{3,}/.test(line)) {
    orphanNames.push({ at: rows.length, text: line.trim() });
  }
}

/*
 * Attach standalone lines.
 *
 * A line is a CONTINUATION when it closes a parenthesis the previous row
 * opened, or begins with a digit — `10mg+BPC-157 10mg)` completes GLOW's
 * composition. Anything else is a product name, and belongs to whichever
 * adjacent block still lacks one, preferring the rows that follow it: the
 * source prints a merged name cell against the middle of its group.
 */
for (const { at, text } of orphanNames) {
  const before = rows[at - 1];
  const after = rows[at];
  /*
   * Three kinds of standalone line, distinguished by shape:
   *
   *   ends with ":"      a blend's NAME — "SUPER Human Blend:" — and it is
   *                      printed ABOVE the row it belongs to.
   *   carries a dose     an INGREDIENT of the blend above it, never a name.
   *                      Without this, the five ingredient lines trailing the
   *                      Healthy Hair blend landed on the next product and
   *                      "Sterile water" came through as "INOSITOL10mg/10ml".
   *   opens/closes ()    a composition continuation.
   */
  const isBlendName = /:\s*$/.test(text);
  const hasDose = /\d\s*(mg|mcg|iu|ml)\b/i.test(text);
  const continuation = !isBlendName && (hasDose || /^[\d(]/.test(text) || /\)$/.test(text));

  if (isBlendName && after) {
    after.name = text.replace(/:\s*$/, "");
    continue;
  }
  if (continuation && before) {
    before.composition = [before.composition, text].filter(Boolean).join(" ");
    continue;
  }
  const target = after && !after.name ? after : before && !before.name ? before : null;
  if (target) target.name = target.name ? `${target.name} ${text}` : text;
}

/*
 * Group by the code's alphabetic core.
 *
 * The strength number sits in every possible position: suffix (`RT5`, `CU100`),
 * prefix (`5AD`, `10AM`) and middle (`G10K`, `G5K`). Stripping digits wherever
 * they appear is the only rule that groups all three. Collisions across the
 * document are harmless because grouping also requires the rows to be adjacent.
 */
const prefixOf = (c) => (c === null ? null : c.replace(/\d+/g, "").trim());

/*
 * NO cross-group name propagation. Two different products can share a code
 * prefix — `LC1201` (Lipo-C with B12) and `LC200…LC5000` (L-carnitine) both
 * reduce to "LC" — and searching all rows for a matching prefix gave the first
 * the second's name. Grouping already carries a name from any row of its own
 * group, which is what the merged name cell needs.
 */

// Group into products: same code prefix AND compatible name.
const products = [];
for (const r of rows) {
  const last = products[products.length - 1];
  if (r.code === null && last) { last.variants.push(r); continue; }
  const prefix = prefixOf(r.code);
  const sameProduct =
    last && last.prefix === prefix && (!r.name || !last.name || r.name === last.name);
  if (sameProduct) {
    last.variants.push(r);
    if (r.name && !last.name) last.name = r.name;
  } else {
    products.push({ prefix, name: r.name ?? null, variants: [r] });
  }
}

const retail = (usd) => Math.round((usd * MARKUP * FX_MXN_PER_USD) / 10) * 10;

const draft = products.map((p) => ({
  name: p.name,
  prefix: p.prefix,
  composition: p.variants.map((v) => v.composition).find(Boolean) ?? null,
  variants: p.variants.map((v) => ({
    supplierCode: v.code ?? "(continued)",
    strength: v.spec?.strength ?? null,
    vials: v.spec?.vials ?? null,
    rawSpec: v.rawSpec,
    priceMxn: v.prices.length ? retail(v.prices[0]) : null,
    tierCount: v.prices.length,
  })),
}));

writeFileSync("references/private/catalog-draft.json", JSON.stringify(draft, null, 2));

const variants = draft.flatMap((p) => p.variants);
console.log(`products:            ${draft.length}`);
console.log(`variants:            ${variants.length}`);
console.log(`unnamed products:    ${draft.filter((p) => !p.name).length}`);
console.log(`unparsed specs:      ${variants.filter((v) => !v.strength).length}`);
console.log(`incomplete tiers:    ${variants.filter((v) => v.tierCount < 4).length}`);
console.log(`\nunparsed specifications (need manual resolution):`);
for (const v of variants.filter((v) => !v.strength)) console.log(`  ${v.supplierCode.padEnd(10)} ${v.rawSpec}`);
console.log(`\nunnamed groups (need a product name):`);
for (const p of draft.filter((p) => !p.name)) console.log(`  ${p.prefix.padEnd(10)} ${p.variants.map((v) => v.supplierCode).join(", ")}`);

/* ==========================================================================
 * EMIT — turn the reviewed draft into typed catalog + commerce data.
 *
 * Everything below applies decisions that were confirmed by the owner against
 * `references/private/CATALOG_EXCEPTIONS.md`. Nothing here infers.
 * ======================================================================== */

/** Owner-confirmed resolutions for the ten source exceptions. */
const RESOLVED_NAMES = {
  "FST 344": "Follistatin 344",
  "GDF-8": "GDF-8",
  "2S10": "SS-31",
  "Lipo-C": "Lipo-C without B12",
  LC1201: "Lipo-C with B12",
};
/** `FST 344` is printed `lmg*10vials` — lowercase L. Confirmed as 1mg. */
const RESOLVED_SPECS = {
  "FST 344": { strength: { kind: "solid", mg: 1 }, vials: 10 },
  // Components are stated; the pack size is not. `vials: null` keeps them
  // unsellable until it is confirmed.
  "Lipo-C": { strength: { kind: "blend", componentsMg: [15, 50, 50, 5] }, vials: null },
  LC1201: { strength: { kind: "blend", componentsMg: [15, 50, 50, 5, 1] }, vials: null },
};
/**
 * The two Lipo-C rows state a composition but NO presentation. Composition is
 * recorded; `vials` stays null, so the commerce layer will refuse to price them
 * until the pack size is confirmed.
 */
const RESOLVED_COMPOSITION = {
  "Lipo-C": "Methionine 15mg + Choline Chloride 50mg + L-Carnitine 50mg + Dexpanthenol 5mg",
  LC1201:
    "Methionine 15mg + Choline Chloride 50mg + L-Carnitine 50mg + Dexpanthenol 5mg + B12 (Methylcobalamin) 1mg",
};

/** The three flagships keep the identity the site already publishes. */
const FLAGSHIPS = {
  RT: { id: "reta", slug: "reta", name: "Retatrutide Research", world: "reta" },
  BBG: { id: "glow", slug: "glow", name: "GLOW Peptide Series", world: "glow" },
  CU: { id: "ghk-cu", slug: "ghk-cu", name: "Copper Peptide GHK-Cu", world: "ghk-cu" },
};

const METABOLIC = /semaglutide|tirzepatide|retatrutide|cagrilintide|survodutide|mazdutide/i;
const SOLVENT = /water/i;

function categorise(name, composition, variants) {
  if (SOLVENT.test(name)) return "solvents";
  if (METABOLIC.test(name)) return "metabolic";
  if (composition || variants.some((v) => v.strength?.kind === "blend") || /\bblend\b|glow|klow|lipo-c/i.test(name))
    return "blends";
  return "peptides";
}

const slugify = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const seen = new Set();
const catalog = [];
const commerce = [];

for (const p of products) {
  const flag = FLAGSHIPS[p.prefix];
  const firstCode = p.variants.map((v) => v.code).find(Boolean)?.trim();
  const name = flag?.name ?? RESOLVED_NAMES[firstCode] ?? p.name ?? null;
  if (!name) { console.warn(`SKIPPED — still unnamed: ${p.prefix}`); continue; }

  let slug = flag?.slug ?? slugify(name);
  let n = 2;
  while (seen.has(slug)) slug = `${flag?.slug ?? slugify(name)}-${n++}`;
  seen.add(slug);

  const composition =
    RESOLVED_COMPOSITION[firstCode] ??
    (p.variants.map((v) => v.composition).find(Boolean) ?? null);

  const variants = p.variants.map((v) => {
    const fixed = RESOLVED_SPECS[v.code?.trim()];
    const strength = fixed?.strength ?? v.spec?.strength ?? null;
    const vials = fixed?.vials ?? v.spec?.vials ?? null;
    const label =
      strength?.kind === "solid" ? `${strength.mg}mg`
      : strength?.kind === "iu" ? `${strength.iu}iu`
      : strength?.kind === "solution" ? `${strength.mg}mg-${strength.ml}ml`
      : strength?.kind === "volume" ? `${strength.ml}ml`
      : strength?.kind === "blend" ? strength.componentsMg.join("-") + "mg"
      : "unspecified";
    return {
      id: `${slug}-${label}`,
      strength,
      vials,
      priceMxn: v.prices?.length ? retail(v.prices[0]) : null,
    };
  }).filter((v) => v.strength);

  if (!variants.length) { console.warn(`SKIPPED — no parsable variant: ${name}`); continue; }

  catalog.push({
    id: flag?.id ?? slug,
    slug,
    name,
    category: categorise(name, composition, variants),
    composition: composition ? composition.replace(/^\(|\)$/g, "").trim() : null,
    world: flag?.world ?? null,
    variants: variants.map(({ id, strength, vials }) => ({ id, strength, vials })),
  });

  for (const v of variants) {
    commerce.push({
      id: v.id,
      // A variant with no stated presentation cannot be priced or sold.
      price: v.vials === null ? null : v.priceMxn,
    });
  }
}

const header = (what) => `/**
 * GENERATED — do not edit by hand.
 *
 * Produced by \`scripts/import-supplier-catalog.mjs\` from a private supplier
 * document that is NOT in this repository. Re-run the script to regenerate.
 *
 * ${what}
 */\n\n`;

writeFileSync(
  "src/data/catalog/generated.ts",
  header("Contains NO supplier codes and NO supplier cost — only what NEOGEN publishes.") +
    `import type { Product } from "./types";\n\nexport const generatedProducts: Product[] = ${JSON.stringify(catalog, null, 2)};\n`,
);

writeFileSync(
  "src/data/commerce/prices.generated.ts",
  header(
    "Retail prices in MXN, computed once at authoring time. The supplier cost they\n * derive from is not in this repository and never reaches the application.",
  ) +
    `import type { Money } from "./types";\n\nexport const generatedPrices: Record<string, Money | null> = ${JSON.stringify(
      Object.fromEntries(commerce.map((c) => [c.id, c.price === null ? null : { amount: c.price, currency: "MXN" }])),
      null,
      2,
    )};\n`,
);

console.log(`\nemitted ${catalog.length} products / ${catalog.flatMap((p) => p.variants).length} variants`);
console.log("categories:", JSON.stringify(catalog.reduce((a, p) => ((a[p.category] = (a[p.category] ?? 0) + 1), a), {})));
console.log("unpriced variants:", commerce.filter((c) => c.price === null).length);
