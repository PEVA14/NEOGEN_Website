/**
 * CATALOG INVARIANTS.
 *
 * These are the specific things that have actually gone wrong, not a general
 * schema validator: every assertion below corresponds to a defect that reached
 * the generated data at least once. The registry is imported directly — a
 * check that re-parses its own copy of the data proves nothing about the data
 * the site renders.
 *
 *   node --experimental-strip-types --import ./scripts/lib/register-ts.mjs \
 *        scripts/check-catalog.mjs
 *
 * or just `npm run check:catalog`.
 */
import {
  categories,
  CONFIRMED_TYPE,
  derivedType,
  formatStrength,
  getProduct,
  isPublishable,
  productType,
  productTypes,
  products,
  publishedProducts,
} from "../src/data/catalog/index.ts";
import {
  AREAS,
  ASSIGNMENTS,
  assignmentsFor,
  isPublic,
  publicAreas,
  publicAreasFor,
} from "../src/data/discovery/index.ts";
import { AVAILABILITY } from "../src/data/commerce/availability.ts";
import { getAvailability, getPrices, ORDER_LIMITS } from "../src/data/commerce/index.ts";
import { routes } from "../src/config/routes.ts";
import { locales } from "../src/i18n/config.ts";
import { localizePath } from "../src/i18n/routing.ts";

const failures = [];
const fail = (what, detail) => failures.push(`${what}: ${detail}`);

/* ---- identity ---------------------------------------------------------- */

const collisions = (label, key) => {
  const byKey = new Map();
  for (const p of products) byKey.set(key(p), [...(byKey.get(key(p)) ?? []), p.slug]);
  for (const [value, slugs] of byKey) {
    if (slugs.length > 1) fail(`duplicate ${label}`, `"${value}" on ${slugs.join(", ")}`);
  }
};
collisions("slug", (p) => p.slug);
collisions("product id", (p) => p.id);
collisions("name", (p) => p.name.toLocaleLowerCase());

for (const p of products) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) fail("slug is not URL-safe", p.slug);
  if (p.name.trim() !== p.name) fail("name has surrounding whitespace", JSON.stringify(p.name));
  if (!categories.includes(p.category)) fail("unknown category", `${p.slug} -> ${p.category}`);
  if (p.composition !== null && p.composition.trim() === "") fail("empty composition", p.slug);
  /* A subtitle is an alternative NAME. An empty string means someone meant to
     write one and did not, which renders as a stray blank line. */
  if (p.subtitle !== null && p.subtitle.trim() === "") fail("empty subtitle", p.slug);
  if (p.subtitle && p.subtitle.trim() === p.name.trim()) {
    fail("subtitle repeats the product name", p.slug);
  }
  if (getProduct(p.slug) !== p) fail("getProduct does not resolve its own slug", p.slug);
}

/*
 * Variant ids must be unique ACROSS the catalogue, not just within a product:
 * they are the keys of the commerce map, so a collision silently gives one
 * variant another's price. This is exactly how a $98 product came to be
 * priced at $289.
 */
const variantOwners = new Map();
for (const p of products) {
  for (const v of p.variants) {
    variantOwners.set(v.id, [...(variantOwners.get(v.id) ?? []), p.slug]);
  }
  const shapes = p.variants.map((v) => JSON.stringify(v.strength));
  const repeated = shapes.filter((s, i) => shapes.indexOf(s) !== i);
  if (repeated.length) fail("product lists the same strength twice", `${p.slug} ${repeated[0]}`);
  if (p.variants.length === 0) fail("product has no variants", p.slug);
}
for (const [id, owners] of variantOwners) {
  if (owners.length > 1) fail("duplicate variant id", `"${id}" on ${owners.join(", ")}`);
}

/* ---- publishability ---------------------------------------------------- */

for (const p of publishedProducts) {
  if (!isPublishable(p)) fail("publishedProducts contains an unpublishable product", p.slug);
}
for (const p of products.filter((p) => !isPublishable(p))) {
  if (p.variants.some((v) => v.vials !== null)) fail("publishability is inconsistent", p.slug);
}

/* ---- prices ------------------------------------------------------------ */

const prices = await getPrices(products.flatMap((p) => p.variants.map((v) => v.id)));

for (const p of products) {
  for (const v of p.variants) {
    const money = prices.get(v.id);
    if (money === undefined) fail("variant unknown to the commerce layer", v.id);
    if (money === null) {
      // Legitimate only while the presentation is unconfirmed — a variant we
      // can describe but not sell.
      if (v.vials !== null) fail("sellable variant has no price", v.id);
      continue;
    }
    if (v.vials === null) fail("unsellable variant carries a price", v.id);
    if (money.currency !== "MXN") fail("price is not in MXN", `${v.id} ${money.currency}`);
    if (!Number.isInteger(money.amount) || money.amount <= 0) {
      fail("malformed price", `${v.id} = ${JSON.stringify(money)}`);
    }
    // A sanity band, not a business rule: catches an FX or markup slip by an
    // order of magnitude, which is the way this has failed before.
    if (money.amount < 100 || money.amount > 200_000)
      fail("price out of band", `${v.id} = ${money.amount}`);
  }

  /*
   * Presentations are displayed in the order they are stored, so where they
   * share a unit they must ascend. The source listed HCG's 10,000 IU above its
   * 5,000 IU, which read backwards on the page.
   */
  const kinds = new Set(p.variants.map((v) => v.strength.kind));
  if (kinds.size === 1) {
    const size = (st) =>
      st.kind === "solid" || st.kind === "solution"
        ? st.mg
        : st.kind === "iu"
          ? st.iu
          : st.kind === "volume"
            ? st.ml
            : st.componentsMg.reduce((a, b) => a + b, 0);
    const sizes = p.variants.map((v) => size(v.strength));
    if (sizes.some((n, i) => i > 0 && n < sizes[i - 1])) {
      fail("presentations are not in ascending order", `${p.slug} -> ${sizes.join(", ")}`);
    }
  }

  /* Within one product, a larger dose must not cost less than a smaller one. */
  const solid = p.variants
    .filter((v) => v.strength.kind === "solid" && prices.get(v.id))
    .map((v) => ({ mg: v.strength.mg, amount: prices.get(v.id).amount }))
    .sort((a, b) => a.mg - b.mg);
  for (let i = 1; i < solid.length; i++) {
    if (solid[i].amount < solid[i - 1].amount) {
      fail(
        "price falls as dose rises",
        `${p.slug} ${solid[i - 1].mg}mg=${solid[i - 1].amount} ${solid[i].mg}mg=${solid[i].amount}`,
      );
    }
  }
}

/* ---- availability ------------------------------------------------------
 *
 * Hand-maintained, so the two things a hand gets wrong are checked: a key
 * that matches no variant (the entry silently does nothing) and a state
 * outside the three the UI can render.
 */

const STATES = ["in-stock", "made-to-order", "unavailable"];
const allVariantIds = new Set(products.flatMap((p) => p.variants.map((v) => v.id)));

for (const [id, state] of Object.entries(AVAILABILITY)) {
  if (!allVariantIds.has(id)) fail("availability set for an unknown variant", id);
  if (!STATES.includes(state)) fail("unknown availability state", `${id} -> "${state}"`);
}

const stock = await getAvailability([...allVariantIds]);
for (const [id, state] of stock) {
  if (state !== null && !STATES.includes(state))
    fail("unknown availability state", `${id} -> ${state}`);
}

if (!Number.isInteger(ORDER_LIMITS.min) || ORDER_LIMITS.min < 1) {
  fail("order minimum must be at least 1", String(ORDER_LIMITS.min));
}
if (!Number.isInteger(ORDER_LIMITS.max) || ORDER_LIMITS.max < ORDER_LIMITS.min) {
  fail("order maximum must not be below the minimum", `${ORDER_LIMITS.min}..${ORDER_LIMITS.max}`);
}

/* ---- presentation ------------------------------------------------------ */

for (const p of products) {
  for (const v of p.variants) {
    const label = formatStrength(v.strength);
    if (!label || /undefined|NaN|null/.test(label))
      fail("strength does not format", `${v.id} -> "${label}"`);
  }
}

/* ---- product type (factual axis) ---------------------------------------
 *
 * The default must stay non-asserting, and a confirmation must not contradict
 * something the data already proves.
 */

for (const [slug, type] of Object.entries(CONFIRMED_TYPE)) {
  const product = getProduct(slug);
  if (!product) {
    fail("product type confirmed for an unknown product", slug);
    continue;
  }
  if (!productTypes.includes(type)) fail("unknown product type", `${slug} -> "${type}"`);
  const derived = derivedType(product);
  if (derived && derived !== type) {
    fail(
      "confirmed product type contradicts the data",
      `${slug} -> confirmed "${type}", but its variants derive "${derived}"`,
    );
  }
}

for (const p of products) {
  const type = productType(p);
  if (!productTypes.includes(type))
    fail("product resolves to an unknown type", `${p.slug} -> ${type}`);
  /* A blend or a solvent is derivable, so it should never fall to the default. */
  const derived = derivedType(p);
  if (derived && type !== derived && !CONFIRMED_TYPE[p.slug]) {
    fail("derived type was not applied", `${p.slug} -> ${type} (expected ${derived})`);
  }
}

/* ---- discovery (merchandising axis) -------------------------------------
 *
 * The rules that keep an attractive taxonomy from becoming a claim.
 */

const areaIdSet = new Set(AREAS.map((a) => a.id));
const areaSlugs = new Map();

for (const area of AREAS) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(area.slug)) fail("area slug is not URL-safe", area.slug);
  if (areaSlugs.has(area.slug))
    fail("duplicate area slug", `${area.slug} on ${areaSlugs.get(area.slug)} and ${area.id}`);
  areaSlugs.set(area.slug, area.id);
  if (!Number.isInteger(area.order) || area.order < 1)
    fail("area order must be a positive integer", area.id);
}
const orders = AREAS.map((a) => a.order);
if (new Set(orders).size !== orders.length)
  fail("area display order has duplicates", orders.join(", "));

for (const [slug, assignments] of Object.entries(ASSIGNMENTS)) {
  if (!getProduct(slug)) {
    fail("discovery assignment for an unknown product", slug);
    continue;
  }
  const seenAreas = new Set();
  for (const a of assignments) {
    if (!areaIdSet.has(a.area)) fail("assignment to an unknown area", `${slug} -> ${a.area}`);
    if (seenAreas.has(a.area))
      fail("product assigned to the same area twice", `${slug} -> ${a.area}`);
    seenAreas.add(a.area);

    /*
     * EVERY ASSIGNMENT CARRIES PROVENANCE. This is the rule the whole axis
     * rests on: a public assignment must name who stands behind it, and a
     * source-backed one must actually cite something.
     */
    const prov = a.provenance;
    if (!prov || typeof prov.kind !== "string") {
      fail("assignment has no provenance", `${slug} -> ${a.area}`);
      continue;
    }
    if (!["proposed", "owner-confirmed", "source"].includes(prov.kind)) {
      fail("unknown provenance kind", `${slug} -> ${a.area} -> "${prov.kind}"`);
    }
    if (prov.kind === "owner-confirmed" && !/^\d{4}-\d{2}-\d{2}$/.test(prov.confirmedOn ?? "")) {
      fail("owner-confirmed assignment needs an ISO date", `${slug} -> ${a.area}`);
    }
    if (prov.kind === "source" && !(prov.referenceIds?.length > 0)) {
      fail("source-backed assignment cites nothing", `${slug} -> ${a.area}`);
    }
  }
}

/*
 * A draft assignment must never be publicly visible. Asserted against the
 * accessor the pages actually call, not against the data — so this catches a
 * future change that widens `publicAreasFor` as well as a bad entry.
 */
for (const p of products) {
  const drafts = assignmentsFor(p.slug).filter((a) => !isPublic(a));
  const shown = new Set(publicAreasFor(p.slug).map((a) => a.id));
  for (const draft of drafts) {
    if (shown.has(draft.area)) {
      fail("DRAFT assignment is publicly visible", `${p.slug} -> ${draft.area}`);
    }
  }
}

/* An area only appears in nav/sitemap when it has products to show. */
for (const area of publicAreas()) {
  const count = products.filter((p) => publicAreasFor(p.slug).some((a) => a.id === area.id)).length;
  if (count === 0) fail("public area has no products", area.id);
}

/* ---- routes ------------------------------------------------------------ */

/*
 * The three lists that must agree: what the catalogue publishes, what the
 * sitemap advertises, and what `generateStaticParams` prerenders. All three
 * read `publishedProducts`, and this asserts that they still do.
 */
const { default: sitemap } = await import("../src/app/sitemap.ts");
const sitemapUrls = new Set(sitemap().map((entry) => new URL(entry.url).pathname));

for (const p of publishedProducts) {
  for (const locale of locales) {
    const path = localizePath(routes.product(p.slug), locale);
    if (!sitemapUrls.has(path)) fail("published product missing from sitemap", path);
  }
}
for (const p of products.filter((p) => !isPublishable(p))) {
  for (const locale of locales) {
    const path = localizePath(routes.product(p.slug), locale);
    if (sitemapUrls.has(path)) fail("sitemap advertises an unpublishable product", path);
  }
}

/* Areas: in the sitemap exactly when they have public products. */
const shownAreas = new Set(publicAreas().map((a) => a.id));
for (const area of AREAS) {
  for (const locale of locales) {
    const path = localizePath(routes.area(area.slug), locale);
    const listed = sitemapUrls.has(path);
    if (shownAreas.has(area.id) && !listed) fail("public area missing from sitemap", path);
    if (!shownAreas.has(area.id) && listed)
      fail("sitemap advertises an empty discovery area", path);
  }
}

/* ---- report ------------------------------------------------------------ */

const counts = `${products.length} products / ${publishedProducts.length} published / ${
  products.flatMap((p) => p.variants).length
} variants / ${sitemapUrls.size} sitemap URLs`;

if (failures.length) {
  console.error(`\ncatalog check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${counts}\n`);
  process.exit(1);
}
console.log(`catalog check passed — ${counts}`);
