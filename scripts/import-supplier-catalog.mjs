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
const lines = body
  .split("\n")
  .map((l) => l.replace(/\s+$/, ""))
  .filter(Boolean);

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
  if (/^Cat\.No|^Shipping|^Except|^Additional|^express|^Orders over|^Excludes|^liquids/i.test(line))
    continue;

  const prices = [...line.matchAll(money)].map((m) => Number(m[1].replace(/,/g, "")));
  const codeM = line.match(isCodeRow);

  if (codeM && prices.length > 0) {
    const fields = line.split("|").map((f) => f.trim());
    const code = fields[0];
    // The specification is whichever field parses as one.
    let specIdx = -1,
      spec = null;
    for (let i = 1; i < fields.length; i++) {
      const p = parseSpec(fields[i].replace(money, "").trim());
      if (p) {
        spec = p;
        specIdx = i;
        break;
      }
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
    rows.push({
      code: null,
      name: null,
      composition: null,
      spec,
      rawSpec: line.split("|")[0].trim(),
      prices,
      line,
    });
  } else if (!/\$/.test(line) && /[A-Za-z]{3,}/.test(line)) {
    orphanNames.push({ at: rows.length, text: line.trim() });
  }
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
  /*
   * A MERGED NAME CELL NAMES BOTH ITS NEIGHBOURS.
   *
   * The source prints one name against the middle of its group, so the row
   * ABOVE the line belongs to it just as much as the row below:
   *
   *     G25  | 5mg*10vials     <- GHRP-2
   *     GHRP-2 Acetate
   *     G210 | 10mg*10vials    <- GHRP-2
   *     G65  | 5mg*10vials     <- GHRP-6
   *     GHRP-6 Acetate
   *     G610 | 10mg*10vials    <- GHRP-6
   *
   * Naming only the row below left G25 and G65 unnamed, and grouping then
   * swept both into GHRP-2 — which came out with a DUPLICATE 5mg variant
   * while GHRP-6 lost its 5mg entirely.
   *
   * The backward reach is deliberately narrow: only when both neighbours are
   * unnamed rows of the SAME code group, which is what "printed inside the
   * group" means. A name line sitting between two different products never
   * qualifies, so it cannot re-label the product above it.
   */
  const target = after && !after.name ? after : before && !before.name ? before : null;
  if (target) target.name = target.name ? `${target.name} ${text}` : text;

  if (
    target === after &&
    before &&
    !before.name &&
    before.code &&
    after.code &&
    prefixOf(before.code) === prefixOf(after.code)
  ) {
    before.name = text;
  }
}

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
  if (r.code === null && last) {
    last.variants.push(r);
    continue;
  }
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
for (const v of variants.filter((v) => !v.strength))
  console.log(`  ${v.supplierCode.padEnd(10)} ${v.rawSpec}`);
console.log(`\nunnamed groups (need a product name):`);
for (const p of draft.filter((p) => !p.name))
  console.log(`  ${p.prefix.padEnd(10)} ${p.variants.map((v) => v.supplierCode).join(", ")}`);

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
  /*
   * The source misspells this one: "CJC-1295 Whitout DAC". Left alone it
   * shipped as a product name AND as the URL /productos/cjc-1295-whitout-dac.
   * Correcting an English spelling error is not a change to product data.
   */
  CND5: "CJC-1295 without DAC",
  /*
   * The source then uses that SAME name for a different SKU family whose own
   * composition line reads "5mg + Ipamorelin 5mg" — a blend, not the plain
   * peptide. Two products under one name is the supplier's ambiguity, not a
   * fact about either. The partner compound is joined from the source's own
   * adjacent cell so the two are distinguishable in a catalogue listing.
   * OWNER MAY OVERRIDE.
   */
  CP10: "CJC-1295 without DAC + Ipamorelin",
};

/**
 * Presentation-only corrections to supplier names: a missing space, a word
 * the source shouted or left lowercase mid-phrase. No product fact changes —
 * these are the same class of edit as the "Whitout" spelling fix, and every
 * slug they produce is identical to the one before.
 */
const NAME_TYPOGRAPHY = {
  /*
   * The source prints "B12(Methylcobalamin) 1mg" against a spec cell reading
   * `10mg * 10vials`, so the name and the presentation contradicted each other
   * on the page. OWNER CONFIRMED 10 mg, so the dose comes off the name and is
   * stated once, by the presentation.
   */
  "B12(Methylcobalamin) 1mg": "B12 (Methylcobalamin)",
  "Healthy Hair skin nails Blend": "Healthy Hair Skin Nails Blend",
  "Sterile water": "Sterile Water",
  "Bac.water": "Bac. Water",
  "AA.water": "AA. Water",
  "Lemon bottle": "Lemon Bottle",
};
/** `FST 344` is printed `lmg*10vials` — lowercase L. Confirmed as 1mg. */
const RESOLVED_SPECS = {
  "FST 344": { strength: { kind: "solid", mg: 1 }, vials: 10 },
  // The source states components but no presentation. OWNER CONFIRMED 10
  // vials, matching every other pack in the catalogue, so both are sellable.
  "Lipo-C": { strength: { kind: "blend", componentsMg: [15, 50, 50, 5] }, vials: 10 },
  LC1201: { strength: { kind: "blend", componentsMg: [15, 50, 50, 5, 1] }, vials: 10 },
};
/** Owner-confirmed composition for the two rows whose spec cell held an
 *  ingredient line instead of a presentation. */
const RESOLVED_COMPOSITION = {
  "Lipo-C": "Methionine 15mg + Choline Chloride 50mg + L-Carnitine 50mg + Dexpanthenol 5mg",
  LC1201:
    "Methionine 15mg + Choline Chloride 50mg + L-Carnitine 50mg + Dexpanthenol 5mg + B12 (Methylcobalamin) 1mg",
};

/**
 * The only two products whose composition is printed INSIDE their own name
 * cell, as a parenthetical the extractor could not misattribute. Everything
 * else that looked like a composition was a neighbouring row's ingredient
 * line, an alternative product name, or a bare parenthetical.
 */
const TRUSTED_COMPOSITION = new Set(["BBG70", "KL80"]);

/**
 * Products the source cannot describe well enough to sell.
 *
 * Not a soft "needs review" — these are excluded from the emitted catalog
 * entirely, so the registry keeps its guarantee that every record in it is a
 * coherent product. Publishability stays derived; nothing gets a hand-set
 * "hidden" flag.
 */
const WITHHELD = {
  /*
   * OWNER DECISION — held pending product classification review. Both are
   * hormone/biologic products whose sale, shipping and payment processing in
   * Mexico is materially more restricted than the rest of the catalogue.
   * Withheld here rather than hidden in the UI, so they leave the sitemap,
   * `generateStaticParams` and the catalogue together.
   */
  "Botulinum toxin": "OWNER HOLD — pending product classification review.",
  "HGH High Quality": "OWNER HOLD — pending product classification review.",

  /*
   * The Adamax block is unparseable: the source splits its code cells across
   * lines, prints two formulations under one name, and leaves three prices
   * between them. It is dropped here and re-stated in OWNER_RESOLVED below,
   * from the owner's own reading, rather than guessed at by the parser.
   */
  Adamax: "Superseded by OWNER_RESOLVED — the source block cannot be parsed.",
};

/**
 * PRODUCTS THE SOURCE CANNOT EXPRESS, STATED BY THE OWNER.
 *
 * Every value here was supplied directly and is not inferred from the
 * document. This exists because a parser fix would be dishonest: the Adamax
 * rows are genuinely ambiguous on the page, and the only thing that resolves
 * them is someone who knows the products.
 *
 * `usd` is the supplier's base price, used for the same retail formula as
 * every other row so pricing stays consistent. It is discarded after that.
 */
const OWNER_RESOLVED = [
  {
    id: "adamax-without-adamantane",
    slug: "adamax-without-adamantane",
    name: "Adamax (without adamantane)",
    category: "peptides",
    composition: null,
    subtitle: null,
    world: null,
    variants: [{ strength: { kind: "solid", mg: 10 }, vials: 10, usd: 98 }],
  },
  {
    id: "adamax-with-adamantane",
    slug: "adamax-with-adamantane",
    name: "Adamax (with adamantane)",
    category: "peptides",
    composition: null,
    subtitle: null,
    world: null,
    variants: [
      { strength: { kind: "solid", mg: 5 }, vials: 10, usd: 154 },
      { strength: { kind: "solid", mg: 10 }, vials: 10, usd: 289 },
    ],
  },
];

/**
 * SUBTITLE — an alternative designation the source states for a product.
 *
 * Not a description and not a classification: this field only ever holds a
 * name the supplier itself printed. TB-500's row carries "Thymosin B4 Acetate"
 * in its composition cell, which is an alternative NAME rather than a
 * composition — recording it as a subtitle puts it where it belongs.
 *
 * The catalogue's other candidates — the twelve products filed under Péptidos
 * that are not peptides — are deliberately EMPTY here. Writing "vitamin" or
 * "small molecule" against a compound would be a classification claim, and
 * the source states none. Owner input fills them; see the report.
 */
const RESOLVED_SUBTITLE = {
  BT5: "Thymosin B4 Acetate",
};

/** The three flagships keep the identity the site already publishes. */
const FLAGSHIPS = {
  RT: { id: "reta", slug: "reta", name: "Retatrutide Research", world: "reta" },
  BBG: { id: "glow", slug: "glow", name: "GLOW Peptide Series", world: "glow" },
  CU: { id: "ghk-cu", slug: "ghk-cu", name: "Copper Peptide GHK-Cu", world: "ghk-cu" },
};

const METABOLIC = /semaglutide|tirzepatide|retatrutide|cagrilintide|survodutide|mazdutide/i;
const SOLVENT = /water/i;

/*
 * A product is a blend when its DOSE says so — a multi-component strength —
 * or when its name does. Presence of a composition string used to count as
 * evidence, which meant every product that picked up a stray ingredient line
 * was filed as a blend: TB500, HGH, SLU-PP-332 and Cartalax are all single
 * compounds that landed there.
 */
function categorise(name, variants) {
  if (SOLVENT.test(name)) return "solvents";
  if (METABOLIC.test(name)) return "metabolic";
  if (
    variants.some((v) => v.strength?.kind === "blend") ||
    /\bblend\b|glow|klow|lipo-c/i.test(name)
  )
    return "blends";
  return "peptides";
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Magnitude of a strength, for display ORDER only.
 *
 * The source prints rows in whatever order the page had them, which put HCG's
 * 10,000 IU above its 5,000 IU — the only product in the catalogue reading
 * backwards. Sorting is applied only when every variant shares a unit, since
 * across units there is no meaningful order: 100 IU is not more or less than
 * 10 ml.
 */
const magnitude = (st) =>
  st.kind === "solid"
    ? st.mg
    : st.kind === "iu"
      ? st.iu
      : st.kind === "volume"
        ? st.ml
        : st.kind === "solution"
          ? st.mg
          : st.componentsMg.reduce((a, b) => a + b, 0);

function ordered(variants) {
  const kinds = new Set(variants.map((v) => v.strength.kind));
  if (kinds.size !== 1) return variants;
  return [...variants].sort((a, b) => magnitude(a.strength) - magnitude(b.strength));
}

const seen = new Set();
const catalog = [];
const commerce = [];
const withheldCompositions = [];
const collisions = [];
const duplicateVariants = [];

for (const p of products) {
  const flag = FLAGSHIPS[p.prefix];
  const firstCode = p.variants
    .map((v) => v.code)
    .find(Boolean)
    ?.trim();
  const sourceName = flag?.name ?? RESOLVED_NAMES[firstCode] ?? p.name ?? null;
  if (!sourceName) {
    console.warn(`SKIPPED — still unnamed: ${p.prefix}`);
    continue;
  }
  const name = NAME_TYPOGRAPHY[sourceName.trim()] ?? sourceName;

  // Keyed by NAME, not code prefix: the rows this has to catch are exactly the
  // ones whose codes the source mangled, so their prefixes are unreliable.
  if (WITHHELD[name.trim()]) continue;

  const base = flag?.slug ?? slugify(name);
  let slug = base;
  let n = 2;
  while (seen.has(slug)) slug = `${base}-${n++}`;
  if (slug !== base) collisions.push({ name, base, slug });
  seen.add(slug);

  /*
   * COMPOSITION IS ALLOW-LISTED, NOT SCAVENGED.
   *
   * It used to be "the first composition-ish line found near this product",
   * and in a document with merged cells and ingredient lists printed between
   * rows that produced eight wrong strings out of thirteen — SLU-PP-332
   * carried Lipo-C's ingredients, Cartalax carried a neighbouring GABA row,
   * Adamax carried the parenthetical "without adamantane", and TB500 and HGH
   * carried an alternative NAME in the composition field. Three more were the
   * bleeding ingredient lists the exceptions file explicitly says not to
   * publish.
   *
   * So a composition now ships only when the source states it inside the
   * product's own cell (GLOW, KLOW) or the owner has confirmed it (Lipo-C).
   * Everything else is null — absent, which is true, rather than plausible
   * and wrong.
   */
  const scavenged = p.variants.map((v) => v.composition).find(Boolean) ?? null;
  const composition =
    RESOLVED_COMPOSITION[firstCode] ?? (TRUSTED_COMPOSITION.has(firstCode) ? scavenged : null);
  if (scavenged && composition === null) {
    withheldCompositions.push({ name: p.name ?? firstCode, code: firstCode, text: scavenged });
  }

  const variants = p.variants
    .map((v) => {
      const fixed = RESOLVED_SPECS[v.code?.trim()];
      const strength = fixed?.strength ?? v.spec?.strength ?? null;
      const vials = fixed?.vials ?? v.spec?.vials ?? null;
      const label =
        strength?.kind === "solid"
          ? `${strength.mg}mg`
          : strength?.kind === "iu"
            ? `${strength.iu}iu`
            : strength?.kind === "solution"
              ? `${strength.mg}mg-${strength.ml}ml`
              : strength?.kind === "volume"
                ? `${strength.ml}ml`
                : strength?.kind === "blend"
                  ? strength.componentsMg.join("-") + "mg"
                  : "unspecified";
      return {
        id: `${slug}-${label}`,
        strength,
        vials,
        priceMxn: v.prices?.length ? retail(v.prices[0]) : null,
      };
    })
    .filter((v) => v.strength);

  if (!variants.length) {
    console.warn(`SKIPPED — no parsable variant: ${name}`);
    continue;
  }

  /*
   * Two variants that reduce to the same id are the SAME dose listed twice —
   * always a symptom of rows grouped under the wrong product. Silently they
   * produced a repeated row in the presentation list, a duplicate React key,
   * and a price map where the last write won. Collapsing them here keeps the
   * data coherent; recording them makes the underlying grouping error visible
   * instead of absorbed.
   */
  const byId = new Map();
  for (const v of variants) {
    if (byId.has(v.id)) {
      duplicateVariants.push({
        name,
        id: v.id,
        kept: byId.get(v.id).priceMxn,
        dropped: v.priceMxn,
      });
      continue;
    }
    byId.set(v.id, v);
  }
  const unique = ordered([...byId.values()]);

  catalog.push({
    id: flag?.id ?? slug,
    slug,
    name,
    category: categorise(name, variants),
    /*
     * Strip the wrapping parenthesis and give the "+" separators room. The
     * source prints "GHK-CU 50mg+TB-500 10mg+BPC-157 10mg", which sets as one
     * unbroken string and cannot wrap on a narrow column. Spacing a separator
     * changes no value.
     */
    composition: composition
      ? composition
          .replace(/^\(|\)$/g, "")
          .replace(/\s*\+\s*/g, " + ")
          .replace(/\s+/g, " ")
          .trim()
      : null,
    /* An alternative designation the source itself printed, never a class
       we assigned. Null for all but one product today. */
    subtitle: RESOLVED_SUBTITLE[firstCode] ?? null,
    world: flag?.world ?? null,
    variants: unique.map(({ id, strength, vials }) => ({ id, strength, vials })),
  });

  for (const v of unique) {
    commerce.push({
      id: v.id,
      // A variant with no stated presentation cannot be priced or sold.
      price: v.vials === null ? null : v.priceMxn,
    });
  }
}

/*
 * The owner-stated products, appended after the parsed ones. They go through
 * the same retail formula and the same commerce push, so nothing about them is
 * priced or shaped differently — only their identity came from a person rather
 * than from the page.
 */
for (const p of OWNER_RESOLVED) {
  if (seen.has(p.slug)) {
    console.warn(`SKIPPED — owner-resolved slug already taken: ${p.slug}`);
    continue;
  }
  seen.add(p.slug);

  const variants = ordered(
    p.variants.map((v) => ({
      id: `${p.slug}-${v.strength.mg}mg`,
      strength: v.strength,
      vials: v.vials,
      priceMxn: retail(v.usd),
    })),
  );

  catalog.push({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    composition: p.composition,
    subtitle: p.subtitle,
    world: p.world,
    variants: variants.map(({ id, strength, vials }) => ({ id, strength, vials })),
  });

  for (const v of variants)
    commerce.push({ id: v.id, price: v.vials === null ? null : v.priceMxn });
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
      Object.fromEntries(
        commerce.map((c) => [c.id, c.price === null ? null : { amount: c.price, currency: "MXN" }]),
      ),
      null,
      2,
    )};\n`,
);

console.log(
  `\nemitted ${catalog.length} products / ${catalog.flatMap((p) => p.variants).length} variants`,
);
for (const [what, why] of Object.entries(WITHHELD)) console.log(`WITHHELD  ${what}: ${why}`);
for (const c of collisions)
  console.log(`SLUG COLLISION  ${c.name}: wanted /${c.base}, emitted /${c.slug}`);
for (const d of duplicateVariants)
  console.log(`DUPLICATE VARIANT  ${d.name} ${d.id} — kept ${d.kept}, dropped ${d.dropped}`);
console.log(`\ncompositions withheld as unreliable: ${withheldCompositions.length}`);
for (const w of withheldCompositions)
  console.log(`  ${String(w.name).padEnd(30)} ${w.text.slice(0, 90)}`);
console.log(
  "categories:",
  JSON.stringify(catalog.reduce((a, p) => ((a[p.category] = (a[p.category] ?? 0) + 1), a), {})),
);
console.log("unpriced variants:", commerce.filter((c) => c.price === null).length);
