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
  formatStrength,
  getProduct,
  isPublishable,
  products,
  publishedProducts,
} from "../src/data/catalog/index.ts";
import { getPrices } from "../src/data/commerce/index.ts";
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

/* ---- presentation ------------------------------------------------------ */

for (const p of products) {
  for (const v of p.variants) {
    const label = formatStrength(v.strength);
    if (!label || /undefined|NaN|null/.test(label))
      fail("strength does not format", `${v.id} -> "${label}"`);
  }
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
