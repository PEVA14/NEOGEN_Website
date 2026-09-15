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
  productsInArea as productsInAreaForCheck,
  publicAreasFor,
} from "../src/data/discovery/index.ts";
import {
  continuePlan,
  entryOrder,
  featuredCount,
  featuredInArea,
  relatedAreas,
} from "../src/domain/discovery/index.ts";
import {
  activeFilterCount,
  applyFilters,
  clearFilters,
  EMPTY_FILTERS,
  facetOptions,
  facetVisible,
  flagCounts,
  flagVisible,
  matches,
  parseFilters,
  priceBounds,
  serializeFilters,
  toggleValue,
} from "../src/components/catalog/filters.ts";
import {
  logPosition,
  logTicks,
  perVial,
  presentationMatrix,
  priceBands,
  reachesThreshold,
  stackOnAxis,
} from "../src/domain/storefront/index.ts";
import { generatedPrices } from "../src/data/commerce/prices.generated.ts";
import { siteConfig } from "../src/config/site.ts";
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

/* ---- area page derivations (Phase 12.1) -------------------------------- *
 *
 * Every conditional section on a discovery area page is the output of one of
 * these functions. Driven with fixtures for the rules and with the real
 * registry for the invariants.
 */
{
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const check = (condition, what, detail = "") => {
    if (!condition) fail(what, detail);
  };

  /* featuredCount: the thresholds, including the floor. */
  for (const [total, expected] of [
    [0, 0],
    [4, 0],
    [5, 2],
    [11, 2],
    [12, 3],
    [16, 3],
  ]) {
    check(
      featuredCount(total) === expected,
      "featuredCount threshold",
      `${total} → ${featuredCount(total)}`,
    );
  }

  /* entryOrder: flagships first, catalogue order otherwise, stable. */
  const fx = [
    { slug: "a", world: null },
    { slug: "b", world: null },
    { slug: "flag-1", world: "reta" },
    { slug: "c", world: null },
    { slug: "flag-2", world: "glow" },
  ];
  check(
    same(
      entryOrder(fx).map((p) => p.slug),
      ["flag-1", "flag-2", "a", "b", "c"],
    ),
    "entryOrder puts flagships first and keeps catalogue order",
    entryOrder(fx)
      .map((p) => p.slug)
      .join(","),
  );
  check(
    featuredInArea(fx).length === 2,
    "five compounds feature two",
    String(featuredInArea(fx).length),
  );
  check(featuredInArea(fx.slice(0, 4)).length === 0, "four compounds feature none");

  /* relatedAreas: by shared compounds only, ranked, never self, never empty. */
  const areasFx = [
    { id: "metabolic", order: 1, slug: "m" },
    { id: "recovery", order: 2, slug: "r" },
    { id: "longevity", order: 3, slug: "l" },
    { id: "skin", order: 5, slug: "s" },
  ];
  const membership = {
    metabolic: ["p1", "p2", "p3"],
    recovery: ["p1"],
    longevity: ["p2", "p3"],
    skin: ["p9"],
  };
  const deps = {
    areas: () => areasFx,
    productsIn: (id) => (membership[id] ?? []).map((slug) => ({ slug, world: null })),
  };
  const rel = relatedAreas("metabolic", 4, deps);
  check(
    same(
      rel.map((r) => [r.area.id, r.shared.length]),
      [
        ["longevity", 2],
        ["recovery", 1],
      ],
    ),
    "relatedAreas ranks by shared count and omits areas sharing nothing",
    JSON.stringify(rel.map((r) => [r.area.id, r.shared.length])),
  );
  /* Negative control: a hand-written relation cannot appear — skin shares nothing. */
  check(!rel.some((r) => r.area.id === "skin"), "an area with no shared compound is never related");

  /* continuePlan: skips self, related areas and materials; wraps. */
  const areasPlan = [...areasFx, { id: "materials", order: 8, slug: "x" }];
  const plan = continuePlan("longevity", ["metabolic"], areasPlan);
  check(
    plan.nextArea?.id === "skin",
    "continuePlan picks the next unrelated area",
    plan.nextArea?.id,
  );
  check(plan.materials?.id === "materials", "continuePlan offers materials from a compound area");
  const wrap = continuePlan("skin", ["recovery", "longevity"], areasPlan);
  check(wrap.nextArea?.id === "metabolic", "continuePlan wraps past the end", wrap.nextArea?.id);
  const fromMaterials = continuePlan("materials", [], areasPlan);
  check(fromMaterials.materials === null, "materials never offers itself");
  check(
    continuePlan("metabolic", ["recovery", "longevity", "skin"], areasPlan).nextArea === null,
    "no next area when every other compound area is already related",
  );

  /* The real registry. */
  for (const area of publicAreas()) {
    const items = productsInAreaForCheck(area.id);
    const featured = featuredInArea(items);
    const slugs = new Set(items.map((p) => p.slug));
    check(
      featured.length === featuredCount(items.length),
      "featured size follows featuredCount",
      area.id,
    );
    check(
      featured.every((p) => slugs.has(p.slug)),
      "featured compounds belong to the area",
      area.id,
    );
    check(
      new Set(featured.map((p) => p.slug)).size === featured.length,
      "featured compounds are distinct",
      area.id,
    );
    for (const r of relatedAreas(area.id)) {
      check(r.area.id !== area.id, "an area is never related to itself", area.id);
      check(
        r.shared.length > 0,
        "a related area shares at least one compound",
        `${area.id}→${r.area.id}`,
      );
      const back = relatedAreas(r.area.id, AREAS.length).find((x) => x.area.id === area.id);
      check(
        back?.shared.length === r.shared.length,
        "shared-compound counts are symmetric",
        `${area.id}↔${r.area.id}`,
      );
      for (const p of r.shared) {
        check(
          publicAreasFor(p.slug).some((a) => a.id === r.area.id) && slugs.has(p.slug),
          "a shared compound is publicly filed in both areas",
          `${p.slug} ${area.id}↔${r.area.id}`,
        );
      }
    }
    const plan = continuePlan(
      area.id,
      relatedAreas(area.id).map((r) => r.area.id),
    );
    check(plan.nextArea?.id !== area.id, "continue never sends an area to itself", area.id);
  }
}

/* ---- catalogue filter engine ------------------------------------------- *
 *
 * The browser on the catalogue and on every area page runs this engine. Its
 * promises: facets OR within and AND across, counts are disjunctive, unpriced
 * products never pass a price bound, a facet with nothing to discriminate is
 * hidden, and the URL round-trips.
 */
{
  const check = (condition, what, detail = "") => {
    if (!condition) fail(`filters: ${what}`, detail);
  };
  const p = (overrides) => ({
    id: overrides.slug,
    index: "01",
    subtitle: null,
    category: "peptides",
    categoryLabel: "Péptidos",
    productType: "compound",
    areas: [],
    areaId: null,
    world: null,
    href: "#",
    price: null,
    priceAmount: 1000,
    strengths: "5 mg",
    range: "5 mg",
    presentations: 1,
    formats: ["solid"],
    vials: [10],
    availability: [],
    documented: false,
    photographed: false,
    ctaLabel: "x",
    ...overrides,
  });
  const FX = [
    p({
      slug: "alpha",
      name: "Tirzepatide",
      index: "01",
      areas: ["metabolic"],
      priceAmount: 5000,
      presentations: 3,
    }),
    p({
      slug: "beta",
      name: "Beta",
      index: "02",
      areas: ["skin"],
      priceAmount: 2000,
      formats: ["blend"],
    }),
    p({
      slug: "gamma",
      name: "Gamma",
      index: "03",
      areas: ["metabolic", "skin"],
      priceAmount: null,
      world: "reta",
    }),
    p({
      slug: "delta",
      name: "Delta",
      index: "04",
      areas: ["neuro"],
      priceAmount: 9000,
      vials: [6],
    }),
  ];
  const slugs = (list) => list.map((x) => x.slug).join(",");
  const withList = (facet, values) => ({
    ...EMPTY_FILTERS,
    lists: { ...EMPTY_FILTERS.lists, [facet]: values },
  });

  check(
    slugs(applyFilters(FX, EMPTY_FILTERS)) === "alpha,beta,gamma,delta",
    "no filters → everything, index order",
  );
  check(
    slugs(applyFilters(FX, withList("area", ["metabolic", "skin"]))) === "alpha,beta,gamma",
    "options within a facet are OR",
  );
  check(
    slugs(
      applyFilters(FX, {
        ...withList("area", ["metabolic", "skin"]),
        lists: { ...withList("area", ["metabolic", "skin"]).lists, format: ["blend"] },
      }),
    ) === "beta",
    "facets combine with AND",
  );
  const areaCounts = Object.fromEntries(
    facetOptions(FX, withList("area", ["metabolic"]), "area").map((o) => [o.value, o.count]),
  );
  check(
    areaCounts.skin === 2 && areaCounts.neuro === 1,
    "a facet's own selection does not zero its other options",
    JSON.stringify(areaCounts),
  );
  const formatCounts = Object.fromEntries(
    facetOptions(FX, withList("area", ["neuro"]), "format").map((o) => [o.value, o.count]),
  );
  check(
    formatCounts.blend === 0 && formatCounts.solid === 1,
    "other facets narrow a facet's counts",
    JSON.stringify(formatCounts),
  );
  check(
    slugs(applyFilters(FX, { ...EMPTY_FILTERS, priceMin: 0 })) === "alpha,beta,delta",
    "an unpriced product never passes a price bound",
  );
  check(
    slugs(applyFilters(FX, { ...EMPTY_FILTERS, priceMax: 5000 })) === "alpha,beta",
    "price max is inclusive",
  );
  check(
    slugs(applyFilters(FX, { ...EMPTY_FILTERS, sort: "price-asc" })) === "beta,alpha,delta,gamma",
    "unpriced sorts last ascending",
  );
  check(
    slugs(applyFilters(FX, { ...EMPTY_FILTERS, sort: "price-desc" })) === "delta,alpha,beta,gamma",
    "unpriced sorts last descending",
  );
  check(
    slugs(applyFilters(FX, { ...EMPTY_FILTERS, query: "tirzepatida" })) === "alpha",
    "search matches a Spanish INN",
  );
  check(
    slugs(applyFilters(FX, withList("vials", ["6"]))) === "delta",
    "pack size filters on the stated vials",
  );
  check(
    slugs(
      applyFilters(FX, { ...EMPTY_FILTERS, flags: { ...EMPTY_FILTERS.flags, flagship: true } }),
    ) === "gamma",
    "flagship flag",
  );

  /* Visibility: nothing to discriminate → no control. */
  check(
    !facetVisible(facetOptions(FX, EMPTY_FILTERS, "availability")),
    "a facet with no data is hidden",
  );
  check(!flagVisible(flagCounts(FX, EMPTY_FILTERS, "documented")), "a flag nobody holds is hidden");
  check(
    flagVisible(flagCounts(FX, EMPTY_FILTERS, "flagship")),
    "a flag some products hold is shown",
  );
  check(
    !facetVisible(facetOptions(FX.slice(0, 1), EMPTY_FILTERS, "format")),
    "a single-option facet is hidden",
  );
  check(priceBounds([FX[0]]) === null, "one priced product gives no price range");

  /* URL round trip, and hostile input. */
  const rich = {
    ...toggleValue(toggleValue(EMPTY_FILTERS, "area", "metabolic"), "format", "solid"),
    query: "bpc",
    priceMin: 1000,
    priceMax: 9000,
    sort: "price-desc",
    view: "index",
    flags: { ...EMPTY_FILTERS.flags, flagship: true },
  };
  check(
    JSON.stringify(parseFilters(serializeFilters(rich))) === JSON.stringify(rich),
    "filters survive a URL round trip",
  );
  check(serializeFilters(EMPTY_FILTERS) === "", "default filters serialise to no query string");
  const hostile = parseFilters("?min=-5&max=abc&orden=drop&vista=x&insignia=yes");
  check(
    hostile.priceMin === null &&
      hostile.priceMax === null &&
      hostile.sort === "index" &&
      hostile.view === "grid" &&
      !hostile.flags.flagship,
    "malformed URL values are dropped, not thrown on",
    JSON.stringify(hostile),
  );
  check(
    activeFilterCount(rich) === 5,
    "active count ignores sort and view",
    String(activeFilterCount(rich)),
  );
  const cleared = clearFilters(rich);
  check(
    activeFilterCount(cleared) === 0 && cleared.sort === "price-desc",
    "clearing keeps sort and view",
  );
  check(!matches(FX[0], { ...EMPTY_FILTERS, query: "zzz" }), "a non-matching query excludes");

  /* The real catalogue: area facet counts agree with the discovery registry. */
  const realEntries = publishedProducts.map((product, i) => ({
    ...p({ slug: product.slug, name: product.name, index: String(i + 1).padStart(3, "0") }),
    areas: publicAreasFor(product.slug).map((a) => a.id),
  }));
  for (const option of facetOptions(realEntries, EMPTY_FILTERS, "area")) {
    const expected = productsInAreaForCheck(option.value).length;
    check(
      option.count === expected,
      "area facet count equals the area's product count",
      `${option.value}: ${option.count} vs ${expected}`,
    );
  }
}

/* ---- storefront derivations ---------------------------------------------- */

/**
 * The homepage's commercial moments and the card reveal compute every figure
 * through `domain/storefront`. These pin the arithmetic — a unit price, a
 * position on a log axis, which strengths a matrix shows — so a refactor
 * cannot quietly start misstating a price.
 */
{
  const check = (condition, what, detail = "") => {
    if (!condition) fail(`storefront: ${what}`, detail);
  };

  check(perVial(6500, 10) === 650, "price per vial divides the pack by its vials");
  check(perVial(1000, 6) === 167, "price per vial rounds to the peso", String(perVial(1000, 6)));
  check(
    perVial(null, 10) === null && perVial(1000, null) === null,
    "no unit price without both sides",
  );
  check(perVial(1000, 0) === null, "a zero-vial pack has no unit price");
  check(reachesThreshold(10000, 10000), "the free-shipping threshold is inclusive");
  check(!reachesThreshold(9999, 10000), "below the threshold does not reach it");
  check(
    !reachesThreshold(null, 10000) && !reachesThreshold(20000, null),
    "unknowns never reach it",
  );

  const mx = presentationMatrix([
    {
      slug: "a",
      cells: [
        { mg: 5, amount: 100, vials: 10 },
        { mg: 20, amount: 300, vials: 10 },
      ],
    },
    { slug: "b", cells: [{ mg: 10, amount: 200, vials: 10 }] },
    {
      slug: "c",
      cells: [
        { mg: 5, amount: null, vials: 10 },
        { mg: 10, amount: 250, vials: 10 },
      ],
    },
  ]);
  check(mx.rows.map((r) => r.item.slug).join() === "a,c", "single-strength products are left out");
  check(mx.columns.join() === "5,10,20", "columns are the union of held strengths, ascending");
  check(mx.rows[0].cells[1] === null, "a strength a product lacks is an empty cell, not a zero");
  check(mx.rows[1].from === 250, "a row's from ignores unpriced cells");

  check(
    logPosition(800, 800, 37000) === 0 && logPosition(37000, 800, 37000) === 1,
    "log axis ends",
  );
  check(Math.abs(logPosition(1000, 100, 10000) - 0.5) < 1e-9, "log axis is logarithmic");
  check(logPosition(5, 10, 100) === 0 && logPosition(500, 10, 100) === 1, "log axis clamps");

  const st = stackOnAxis([{ amount: 900 }, { amount: 100 }, { amount: 110 }, { amount: 1000 }], 4);
  check(
    st.placed.map((p) => p.item.amount).join() === "100,110,900,1000",
    "stacking sorts by price",
  );
  check(st.placed[1].level === 1 && st.placed[0].level === 0, "items in one bin stack upward");
  check(st.placed[3].bin === 3, "the maximum lands in the last bin");
  check(st.height === 2, "height is the tallest stack", String(st.height));

  check(logTicks(800, 37000).join() === "1000,2000,5000,10000,20000", "log ticks follow 1-2-5");

  const bands = priceBands(
    [{ amount: 500 }, { amount: 9999 }, { amount: 10000 }, { amount: 25000 }],
    [3000, 10000, 20000],
  );
  check(
    bands.map((b) => `${b.from}:${b.items.length}`).join() === "0:1,3000:1,10000:1,20000:1",
    "bands are half-open and drop empty ones",
    JSON.stringify(bands.map((b) => [b.from, b.items.length])),
  );

  /* The real registries, exactly as the homepage builders read them. */
  const price = (id) => generatedPrices[id]?.amount ?? null;
  const areaMatrices = publicAreas().map((area) => ({
    area: area.id,
    matrix: presentationMatrix(
      entryOrder(productsInAreaForCheck(area.id).filter(isPublishable)).map((product) => ({
        product,
        slug: product.slug,
        cells: product.variants.flatMap((v) =>
          v.strength.kind === "solid"
            ? [{ mg: v.strength.mg, amount: price(v.id), vials: v.vials }]
            : [],
        ),
      })),
    ),
  }));
  const best = [...areaMatrices].sort((a, b) => b.matrix.rows.length - a.matrix.rows.length)[0];
  check(Boolean(best) && best.matrix.rows.length >= 3, "some area has a comparable matrix");
  if (best) {
    for (const row of best.matrix.rows) {
      for (const [i, cell] of row.cells.entries()) {
        const mg = best.matrix.columns[i];
        const variant = row.item.product.variants.find(
          (v) => v.strength.kind === "solid" && v.strength.mg === mg,
        );
        check(
          cell === null ? !variant : variant && cell.amount === price(variant.id),
          "every matrix cell is that variant's registry price",
          `${row.item.slug} ${mg} mg`,
        );
      }
    }
  }

  const entry = publishedProducts
    .map((product) => ({
      slug: product.slug,
      amount: Math.min(...product.variants.map((v) => price(v.id) ?? Infinity)),
    }))
    .filter((e) => Number.isFinite(e.amount));
  const spectrum = stackOnAxis(entry, 44);
  check(spectrum.placed.length === entry.length, "the spectrum places every priced product once");
  check(
    new Set(spectrum.placed.map((p) => p.item.slug)).size === entry.length,
    "no product appears twice on the spectrum",
  );
  const threshold = siteConfig.fulfilment.freeShippingThreshold;
  if (threshold !== null) {
    const x = logPosition(threshold, spectrum.min, spectrum.max);
    check(x > 0 && x < 1, "the free-shipping line falls inside the price axis", String(x));
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
