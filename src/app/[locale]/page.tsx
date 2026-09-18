import { notFound } from "next/navigation";

import {
  GlowMoment,
  Hero,
  MaterialMoment,
  RetaExperience,
  type HeroCopy,
  type RetaExperienceCopy,
} from "@/components/experience";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { CatalogIndex, CompoundRail, DiscoveryGrid, ProductCard, TextLink } from "@/components/ui";
import { ScienceBand, ShelfAreas } from "@/components/home";
import { publicOverview } from "@/content/overview";
import { researchReferenceIndex } from "@/content/research";
import { cardDetails, cardDetailsCopy } from "@/server/catalog";
import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import { isLocale, localeTags } from "@/i18n/config";
import { isPublishable, presentationRange, products, publishedProducts } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { localizePath } from "@/i18n/routing";

import type { Metadata } from "next";

/**
 * HOME.
 *
 *   Hero (Impact) → 01 Hub (Quiet, on the hero's dark) → 02 Evolution (Quiet)
 *   → RETA (Impact) → 03 Discovery (Quiet) → GLOW (Impact)
 *   → 04 Research + 05 Quality (Quiet) → GHK-Cu (Impact) → 06 Products (Quiet)
 *
 * Cards on this page carry the reveal (CONVENTIONS §16). A commerce layer was
 * trialled here on 2026-09-15; the owner kept none of it on the homepage —
 * the matrix became the catalogue's register view, the ticker and flagship
 * shop are parked in `components/storefront`, the price spectrum was removed.
 *
 * Two structural rules from the reference set are load-bearing:
 *
 *  1. ONLY QUIET SECTIONS ARE NUMBERED. Experience beats carry a mono eyebrow
 *     and sit outside the spine, so they read as interruptions in the
 *     informational structure rather than entries in it.
 *
 *  2. NO TWO IMPACT SECTIONS ARE ADJACENT. Every world is separated by Quiet
 *     material, which is what makes the worlds land at all.
 *
 * The three worlds use DIFFERENT mechanisms — object choreography, luminance,
 * material strata — so the page never repeats one trick three times.
 *
 * COPY IS PRODUCT COPY. It describes the compounds and their material
 * environments, in the voice of the reference set. Where the reference states a
 * receptor mechanism, a formulation, a purity grade or a lot number, the FIELD
 * is reproduced and the VALUE is an explicit placeholder — none of it is
 * verified (CLAUDE.md regulatory guardrail, CONVENTIONS §8).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  // Title comes from the layout's default; only the canonical is page-specific.
  return { alternates: alternates(locale, routes.home) };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const home = dict.home;

  const path = (to: string) => localizePath(to, locale);

  /*
   * DISCOVERY ENTRIES — the homepage's product-discovery section.
   *
   * Everything on a panel is read off the registry: how many compounds are in
   * the area, which recognisable ones to name, and the cheapest way in. The
   * examples are the three CHEAPEST publishable products in the area, which
   * is both a defensible rule and the commercially useful one — a customer
   * scanning categories is looking for an entry point, not a flagship.
   */
  const areas = publicAreas();
  const areaProducts = areas.map((area) => ({ area, items: productsInArea(area.id) }));
  /* The catalogue's real size, for the rail's tail card. Derived, never typed. */
  const publishedCount = publishedProducts.length;
  const areaPriceMap = await getPrices(
    areaProducts.flatMap(({ items }) => items.flatMap((p) => p.variants.map((v) => v.id))),
  );
  const cheapestIn = (product: (typeof products)[number]) =>
    product.variants
      .map((v) => areaPriceMap.get(v.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.amount - b.amount)[0] ?? null;

  const discoveryEntries = areaProducts.map(({ area, items }) => {
    const ranked = items
      .map((product) => ({ product, price: cheapestIn(product) }))
      .filter((row) => row.price)
      .sort((a, b) => a.price!.amount - b.price!.amount);
    return {
      id: area.id,
      index: String(area.order).padStart(2, "0"),
      short: dict.discovery.areas[area.id].short,
      title: dict.discovery.areas[area.id].title,
      body: dict.discovery.areas[area.id].body,
      href: path(routes.area(area.slug)),
      count: items.length,
      examples: ranked.slice(0, 3).map((row) => row.product.name),
      from: ranked[0]?.price ? formatPrice(ranked[0].price, localeTags[locale]) : null,
    };
  });

  /*
   * THE RAIL — one compound per area, cheapest first, then the rest of the
   * catalogue behind a tail card.
   *
   * Taking the cheapest publishable product in each area gives a dozen cards
   * that are genuinely spread across the catalogue rather than twelve
   * metabolic compounds, and "cheapest" is the same defensible entry-point
   * rule the discovery panels already use. Everything is read from the
   * registry; nothing here is curated by hand.
   */
  const railProducts = areaProducts
    .map(({ area, items }) => {
      const cheapest = items
        .map((product) => ({ product, price: cheapestIn(product) }))
        .filter((row) => row.price)
        .sort((a, b) => a.price!.amount - b.price!.amount)[0];
      return cheapest ? { area, ...cheapest } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  /* Every published price, once, for the card reveals on this page. */
  const allPrices = await getPrices(publishedProducts.flatMap((p) => p.variants.map((v) => v.id)));
  const detailsCopy = cardDetailsCopy(dict);
  const detailsFor = (product: (typeof products)[number]) =>
    cardDetails(product, { locale, dict, prices: allPrices });

  const heroCopy: HeroCopy = { ...home.hero, ctaHref: path(routes.products) };

  const reta = home.reta;
  /*
   * THE FLAGSHIPS, FROM THE REGISTRY.
   *
   * This section used to iterate `worldIds` and read names and slugs off
   * `config/worlds` — a second source of truth for product identity, which the
   * world config's own header forbids ("no product claims, prices, specs or
   * availability here"). A world is a property some products have; it is not
   * where products live. Iterating the registry means a flagship that loses
   * its world, changes its name or becomes unpublishable cannot leave a stale
   * card behind.
   *
   * "From" prices are batched through `getPrices`, which resolves locally today
   * and over a network later; the call shape does not change.
   */
  const flagships = worldIds
    .map((id) => products.find((product) => product.world === id && isPublishable(product)))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const priceMap = await getPrices(flagships.flatMap((p) => p.variants.map((v) => v.id)));
  const fromPrice = (product: (typeof flagships)[number]) => {
    const cheapest = product.variants
      .map((v) => priceMap.get(v.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.amount - b.amount)[0];
    return cheapest ? formatPrice(cheapest, localeTags[locale]) : null;
  };
  const relatedPrices = new Map(flagships.map((p) => [p.world as WorldId, fromPrice(p)]));

  /*
   * WHERE EACH EXPERIENCE MOMENT RESOLVES. A moment used to end in three
   * annotation rows (presentations, category, "from"); it now ends in the
   * product itself — name, range, price and one action into its page. Every
   * value is read from the registry.
   */
  const commerceFor = (world: WorldId, cta: string) => {
    const p = flagships.find((item) => item.world === world);
    if (!p) return null;
    return {
      name: p.name,
      range: presentationRange(p),
      price: relatedPrices.get(world) ?? null,
      priceFrom: dict.products.catalog.from,
      href: path(routes.product(p.slug)),
      cta,
    };
  };
  const retaCommerce = commerceFor("reta", reta.cta);
  const glowProduct = commerceFor("glow", home.glow.cta);
  const ghkProduct = commerceFor("ghk-cu", home.ghkcu.cta);

  const retaCopy: RetaExperienceCopy = {
    beats: reta.beats.map((beat, index) => ({
      eyebrow: beat.eyebrow,
      statement: beat.statement,
      body: beat.body,
      // The sequence resolves from product statement into the product itself.
      commerce: index === reta.beats.length - 1 ? (retaCommerce ?? undefined) : undefined,
    })),
    vialAlt: reta.vialAlt,
    loadingLabel: reta.loadingLabel,
    staticLabel: reta.staticLabel,
    progressLabel: reta.progressLabel,
  };

  /* Evidence, counted from the registries — never typed. */
  const sourcedProfiles = publishedProducts.filter((p) => publicOverview(p.slug, locale)).length;
  const publicReferences = researchReferenceIndex().length;

  const flagshipCard = (product: (typeof flagships)[number], position: number) => (
    <ProductCard
      slug={product.slug}
      world={product.world}
      worldLabel={product.world ? home.products.worldLabels[product.world] : undefined}
      areaId={publicAreasFor(product.slug)[0]?.id ?? null}
      name={product.name}
      subtitle={product.subtitle}
      href={path(routes.product(product.slug))}
      price={fromPrice(product)}
      priceFrom={dict.products.catalog.from}
      presentationRange={presentationRange(product)}
      presentations={product.variants.length}
      index={String(position + 1).padStart(2, "0")}
      ctaLabel={home.products.cta}
      format="flagship"
      details={detailsFor(product)}
      detailsCopy={detailsCopy}
    />
  );

  /*
   * V1 COMMERCIAL RHYTHM — the UI stays quiet, the products get loud.
   *
   *   Hero                  Impact — the brand, the object, one way in
   *   01 Flagships          the three products with a world, as products
   *   02 Catalogue shelf    abundance: an entry compound per area, the count,
   *                         every area one tap away
   *   RETA                  Impact → resolves into RETA's price and page
   *   03 Areas              discovery by area, each with its entry price
   *   GLOW                  Impact → resolves into GLOW
   *   04 Evidence           science elevates commerce: counted, brief
   *   GHK-Cu                Impact → resolves into GHK-Cu
   *
   * Removed from V1's homepage: the hub (its Atlas card is V2 and its index
   * duplicated the shelf), the "creative evolution" spread (a brand note, not
   * a reason to buy) and the four-row documentation wall (true, but it made
   * the store look empty — the model lives on the Research Hub).
   */
  return (
    <>
      <Hero copy={heroCopy} />

      <Section mode="quiet" aria-labelledby="products-title">
        <Container width="full">
          <SectionHeader
            index={home.products.index}
            label={home.products.label}
            title={home.products.title}
            id="products-title"
            action={<TextLink href={path(routes.products)}>{home.products.action}</TextLink>}
          />
          {/* Three across on a wide screen; a swiped row on a phone, where three
              full-width dark cards stacked were 1,600px of scroll. */}
          <div className="-mx-(--gutter) flex snap-x snap-mandatory scroll-px-(--gutter) [scrollbar-width:none] gap-(--space-sm) overflow-x-auto px-(--gutter) md:mx-0 md:grid md:grid-cols-3 md:gap-(--gutter) md:overflow-visible md:px-0">
            {flagships.map((product, position) => (
              <div key={product.id} className="flex shrink-0 basis-[82%] snap-start md:basis-auto">
                {flagshipCard(product, position)}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section mode="quiet" aria-labelledby="shelf-title" className="pt-0">
        <Container width="full">
          <SectionHeader
            index={home.shelf.index}
            label={home.shelf.label}
            title={home.shelf.title.replace("{n}", String(publishedCount))}
            id="shelf-title"
            lede={home.shelf.lede}
            action={<TextLink href={path(routes.products)}>{home.shelf.action}</TextLink>}
          />
          <ShelfAreas
            label={home.shelf.areasLabel}
            areas={discoveryEntries.map((entry) => ({
              id: entry.id,
              name: entry.short,
              count: entry.count,
              href: entry.href,
            }))}
          />
          <CompoundRail
            total={publishedCount}
            href={path(routes.products)}
            copy={{
              label: home.research.railLabel,
              tailLabel: home.research.tailLabel,
              tailAction: home.research.tailAction,
            }}
            items={railProducts.map(({ area, product, price }) => ({
              slug: product.slug,
              world: product.world,
              worldLabel: product.world ? home.products.worldLabels[product.world] : undefined,
              areaId: area.id,
              eyebrow: dict.discovery.areas[area.id].short,
              name: product.name,
              subtitle: product.subtitle,
              href: path(routes.product(product.slug)),
              price: price ? formatPrice(price, localeTags[locale]) : null,
              priceFrom: dict.products.catalog.from,
              presentationRange: presentationRange(product),
              presentations: product.variants.length,
              ctaLabel: home.products.cta,
              details: detailsFor(product),
              detailsCopy,
            }))}
          />
        </Container>
      </Section>

      {/* Impact — the object, resolving into RETA. */}
      <RetaExperience copy={retaCopy} />

      <Section mode="quiet" aria-labelledby="catalog-title">
        <Container width="full">
          <SectionHeader
            index={home.catalog.index}
            label={home.catalog.label}
            title={home.catalog.title}
            id="catalog-title"
            action={<TextLink href={path(routes.products)}>{home.catalog.action}</TextLink>}
          />
          {discoveryEntries.length > 0 ? (
            <DiscoveryGrid
              entries={discoveryEntries}
              copy={{
                countLabel: dict.discovery.countLabel,
                from: dict.products.catalog.from,
                enter: home.catalog.categories[0].link,
              }}
            />
          ) : (
            <CatalogIndex
              entries={home.catalog.categories.map((category) => ({
                index: category.index,
                title: category.title,
                body: category.body,
                href: path(routes.products),
                linkLabel: category.link,
              }))}
            />
          )}
        </Container>
      </Section>

      {/* Impact — light, resolving into GLOW. */}
      {glowProduct ? (
        <GlowMoment
          copy={{
            eyebrow: home.glow.eyebrow,
            statement: home.glow.statement,
            body: home.glow.body,
            product: glowProduct,
          }}
        />
      ) : null}

      <ScienceBand
        index={home.science.index}
        label={home.science.label}
        title={home.science.title}
        lede={home.science.lede}
        stats={[
          { value: sourcedProfiles, label: home.science.profiles },
          { value: publicReferences, label: home.science.references },
          { value: publicAreas().length, label: home.science.areas },
        ]}
        actions={[
          { href: path(routes.research), label: home.science.action },
          ...(publicReferences > 0
            ? [{ href: path(routes.researchReferences), label: home.science.referencesAction }]
            : []),
        ]}
      />

      {/* Impact — material, resolving into GHK-Cu. */}
      {ghkProduct ? (
        <MaterialMoment
          copy={{
            eyebrow: home.ghkcu.eyebrow,
            statement: home.ghkcu.statement,
            body: home.ghkcu.body,
            product: ghkProduct,
          }}
        />
      ) : null}
    </>
  );
}
