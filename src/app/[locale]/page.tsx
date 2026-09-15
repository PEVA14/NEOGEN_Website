import { notFound } from "next/navigation";

import {
  GlowMoment,
  Hero,
  MaterialMoment,
  RetaExperience,
  type HeroCopy,
  type RetaExperienceCopy,
  type WorldMomentCopy,
} from "@/components/experience";
import { SectionHeader } from "@/components/layout";
import { Container, Grid, Section } from "@/components/primitives";
import {
  CatalogIndex,
  CompoundRail,
  DiscoveryGrid,
  EditorialSpread,
  ProductCard,
  TextLink,
} from "@/components/ui";
import { EvidenceChain } from "@/components/quality";
import {
  CatalogTicker,
  FlagshipShop,
  PresentationMatrix,
  PriceSpectrum,
} from "@/components/storefront";
import { siteConfig } from "@/config/site";
import { bagEnabled } from "@/payments";
import { cardDetails, cardDetailsCopy } from "@/server/catalog";
import { matrixData, shopProducts, spectrumData, tickerItems } from "@/server/storefront";
import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import { isLocale, localeTags } from "@/i18n/config";
import {
  formatStrength,
  isPublishable,
  presentationRange,
  products,
  publishedProducts,
} from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { localizePath } from "@/i18n/routing";

import type { Metadata } from "next";

/**
 * HOME.
 *
 *   Hero (Impact) → Ticker → 01 Evolution (Quiet) → RETA (Impact)
 *   → 02 Matrix → 03 Discovery → 04 Price spectrum (Quiet) → GLOW (Impact)
 *   → 05 Flagship shop → 06 Research → 07 Quality (Quiet) → GHK-Cu (Impact)
 *   → 08 Products (Quiet) → Footer
 *
 * THE COMMERCIAL LAYER (after Phase 12.1). Four moments were ADDED — nothing
 * was removed — to make the page behave like a shop as well as a laboratory:
 * the ticker shows the whole register under the hero; the matrix follows RETA
 * with the strengths and prices of its own area; the price spectrum follows
 * discovery with every product placed by entry price; the flagship shop
 * follows GLOW with a counter to choose a presentation at. Each sits in Quiet
 * material between Impact beats, so the rhythm below still holds.
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

  /* ---- the commercial layer ---------------------------------------------- */
  const tag = localeTags[locale];
  const [ticker, matrix, spectrum, shop, allPrices] = await Promise.all([
    tickerItems(locale),
    matrixData(locale),
    spectrumData(locale),
    shopProducts(locale, dict),
    getPrices(publishedProducts.flatMap((p) => p.variants.map((v) => v.id))),
  ]);
  const detailsCopy = cardDetailsCopy(dict);
  const detailsFor = (product: (typeof products)[number]) =>
    cardDetails(product, { locale, dict, prices: allPrices });
  const areaShort = (id: string) =>
    dict.discovery.areas[id as keyof typeof dict.discovery.areas]?.short ?? id;
  const areaLabels = Object.fromEntries(
    Object.entries(dict.discovery.areas).map(([id, area]) => [id, area.short]),
  );

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
   * The Experience rails used to carry three unfillable fields each — purity,
   * molecular action, lot. Those need a verified source we do not have, and a
   * labelled empty field makes a finished page look unfinished. They now carry
   * what the catalogue actually knows.
   */
  const railFor = (world: WorldId) => {
    const p = flagships.find((item) => item.world === world);
    if (!p) return [];
    const from = relatedPrices.get(world);
    return [
      {
        key: home.reta.specs.presentation,
        value: p.variants.map((v) => formatStrength(v.strength)).join(" · "),
      },
      { key: home.reta.specs.category, value: dict.products.catalog.categoryLabels[p.category] },
      ...(from ? [{ key: home.reta.specs.from, value: from }] : []),
    ];
  };

  const retaCopy: RetaExperienceCopy = {
    beats: reta.beats.map((beat, index) => ({
      eyebrow: beat.eyebrow,
      statement: beat.statement,
      body: beat.body,
      // The specification block lands on the final beat, so the sequence
      // resolves from product statement into technical reference.
      annotations: index === reta.beats.length - 1 ? railFor("reta") : undefined,
    })),
    vialAlt: reta.vialAlt,
    loadingLabel: reta.loadingLabel,
    staticLabel: reta.staticLabel,
    progressLabel: reta.progressLabel,
  };

  const glowCopy: WorldMomentCopy = {
    eyebrow: home.glow.eyebrow,
    statement: home.glow.statement,
    body: home.glow.body,
    annotations: railFor("glow"),
    mediaLabel: home.glow.mediaLabel,
  };

  const ghkCuCopy: WorldMomentCopy = {
    eyebrow: home.ghkcu.eyebrow,
    statement: home.ghkcu.statement,
    body: home.ghkcu.body,
    annotations: railFor("ghk-cu"),
    mediaLabel: home.ghkcu.mediaLabel,
  };

  return (
    <>
      <Hero copy={heroCopy} />

      {/* The whole register, passing under the hero. */}
      <CatalogTicker
        items={ticker}
        localeTag={tag}
        copy={{
          label: home.ticker.label,
          from: home.ticker.from,
          pause: home.ticker.pause,
          play: home.ticker.play,
        }}
      />

      {/* 01 — Quiet. The editorial spread that sets NEOGEN's informational
          voice: an oversized index numeral against a dense right column. */}
      <Section mode="quiet" aria-labelledby="evolution-title">
        <Container width="full">
          <EditorialSpread
            index={home.evolution.index}
            label={home.evolution.label}
            title={home.evolution.title}
            titleId="evolution-title"
            lede={home.evolution.lede}
            principles={home.evolution.points}
          />
        </Container>
      </Section>

      {/* Impact — the object. */}
      <RetaExperience copy={retaCopy} />

      {/*
       * 02 — Quiet. THE PRESENTATION MATRIX. RETA has just shown one vial;
       * this shows the shelf it stands on — every multi-strength compound in
       * its area, strengths across, pack prices in the cells.
       */}
      {matrix ? (
        <Section mode="quiet" aria-labelledby="matrix-title">
          <Container width="full">
            <SectionHeader
              index={home.matrix.index}
              label={home.matrix.label}
              title={home.matrix.title.replace("{area}", areaShort(matrix.areaId))}
              id="matrix-title"
              lede={home.matrix.lede}
              action={<TextLink href={matrix.areaHref}>{home.matrix.action}</TextLink>}
            />
            <PresentationMatrix
              columns={matrix.columns}
              rows={matrix.rows}
              localeTag={tag}
              copy={{
                caption: home.matrix.caption.replace("{area}", areaShort(matrix.areaId)),
                compound: home.matrix.compound,
                from: home.matrix.from,
                unitLabel: home.matrix.unitLabel,
                perPack: home.matrix.perPack,
                perVial: home.matrix.perVial,
                packNote: home.matrix.packNote,
                worldLabels: home.products.worldLabels,
              }}
            />
          </Container>
        </Section>
      ) : null}

      {/*
       * 04 — Quiet. A catalogue index, not a feature grid: oversized category
       * names, hanging indices, rules, and the whole row as the target.
       *
       * DATA-DRIVEN FROM THE DISCOVERY AREAS, with a fallback.
       *
       * Once areas have approved products this section becomes real product
       * discovery: each row is an area, each link goes to that area's listing
       * rather than to the undifferentiated catalogue. While every assignment
       * is still a draft — which is the state today — it keeps the three
       * editorial cards it has always shown. Homepage V1 does not change
       * shape; its content gets better as the taxonomy is confirmed.
       */}
      <Section mode="quiet" aria-labelledby="catalog-title">
        <Container width="full">
          <SectionHeader
            index={home.catalog.index}
            label={home.catalog.label}
            title={home.catalog.title}
            id="catalog-title"
            action={<TextLink href={path(routes.products)}>{home.catalog.action}</TextLink>}
          />
          {/*
           * Eight area panels, or the three editorial cards as a fallback.
           *
           * The fallback is not dead code: `publicAreas()` counts only areas
           * with approved products, so an area emptied by a future review
           * takes itself out of this section, and a review that emptied all of
           * them would leave the page standing.
           */}
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

      {/*
       * 04 — Quiet, on warm stone. THE PRICE SPECTRUM. Discovery has just
       * sorted the catalogue by what it is about; this sorts it by what it
       * costs to start, with the free-shipping line drawn on the axis.
       */}
      {spectrum ? (
        <Section mode="quiet" aria-labelledby="spectrum-title" className="bg-(--surface-raised)">
          <Container width="full">
            <SectionHeader
              index={home.spectrum.index}
              label={home.spectrum.label}
              title={home.spectrum.title}
              id="spectrum-title"
              lede={home.spectrum.lede.replace("{count}", String(spectrum.points.length))}
              action={
                <TextLink href={`${path(routes.products)}?orden=price-asc`}>
                  {home.spectrum.action}
                </TextLink>
              }
            />
            <PriceSpectrum
              points={spectrum.points}
              ticks={spectrum.ticks}
              threshold={spectrum.threshold}
              bands={spectrum.bands}
              areas={spectrum.areas}
              height={spectrum.height}
              localeTag={tag}
              copy={{
                plotLabel: home.spectrum.plotLabel,
                allAreas: home.spectrum.allAreas,
                areaLabels,
                summary: home.spectrum.summary,
                threshold: home.spectrum.threshold,
                from: home.spectrum.from,
                view: home.spectrum.view,
                keys: home.spectrum.keys,
                areaFilter: home.spectrum.areaFilter,
                under: home.spectrum.under,
              }}
            />
          </Container>
        </Section>
      ) : null}

      {/* Impact — light. */}
      <GlowMoment copy={glowCopy} />

      {/*
       * 05 — Quiet. THE FLAGSHIP SHOP. The page's first counter: the world
       * just seen (GLOW) opens selected, and the customer can move between
       * the three and between presentations with the price following.
       */}
      {shop.length > 0 ? (
        <Section mode="quiet" aria-labelledby="shop-title">
          <Container width="full">
            <SectionHeader
              index={home.shop.index}
              label={home.shop.label}
              title={home.shop.title}
              id="shop-title"
              lede={home.shop.lede}
            />
            <FlagshipShop
              products={shop}
              initial="glow"
              threshold={siteConfig.fulfilment.freeShippingThreshold}
              bagEnabled={bagEnabled()}
              localeTag={tag}
              copy={{
                tabsLabel: home.shop.tabsLabel,
                worldLabels: home.products.worldLabels,
                composition: home.shop.composition,
                presentation: home.shop.presentation,
                presentations: home.shop.presentations,
                unit: home.shop.unit,
                freeReached: home.shop.freeReached,
                freeFrom: home.shop.freeFrom,
                add: home.shop.add,
                added: home.shop.added,
                view: home.shop.view,
              }}
            />
          </Container>
        </Section>
      ) : null}

      {/*
       * 03 — Quiet. THE COMPOUND RAIL.
       *
       * This was a three-row register of the flagships whose documentation
       * column read "—" three times: an 85-compound catalogue introducing
       * itself with three rows and a blank. It now runs a card per discovery
       * area off the right edge of the frame, which is how a catalogue says
       * "there is more of this" without claiming anything.
       */}
      <Section mode="quiet" aria-labelledby="research-title">
        <Container width="full">
          <SectionHeader
            index={home.research.index}
            label={home.research.label}
            title={home.research.title}
            id="research-title"
            lede={home.research.lede}
            action={<TextLink href={path(routes.research)}>{home.research.action}</TextLink>}
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

      {/*
       * 07 — Quiet, on warm stone. The evidence model.
       *
       * This used to be a ledger of four "pending verification" records whose
       * copy described a COA database and synthesis documentation that do not
       * exist. It now shows the rule every quality status on the site follows —
       * true today, and the same component the product pages and the Research
       * Hub use, so all three state one policy.
       */}
      <Section mode="quiet" aria-labelledby="quality-title" className="bg-(--surface-raised)">
        <Container width="full">
          <SectionHeader
            index={home.quality.index}
            label={home.quality.label}
            title={home.quality.title}
            id="quality-title"
            lede={home.quality.lede}
            action={
              <TextLink href={`${path(routes.research)}#calidad`}>{home.quality.action}</TextLink>
            }
          />
          <EvidenceChain copy={dict.quality.record.chain} />
        </Container>
      </Section>

      {/* Impact — material. */}
      <MaterialMoment copy={ghkCuCopy} />

      {/* 08 — Quiet. Commerce stays neutral: charcoal CTAs, world colour only
          in the identifier dot (SYSTEM STATUS V1). */}
      <Section mode="quiet" aria-labelledby="products-title">
        <Container width="full">
          <SectionHeader
            index={home.products.index}
            label={home.products.label}
            title={home.products.title}
            id="products-title"
            action={<TextLink href={path(routes.products)}>{home.products.action}</TextLink>}
          />
          {/*
           * Staggered, not a centred row of three, and now in the DARK
           * register.
           *
           * The card architecture is still identical for every flagship —
           * SYSTEM STATUS V1 is explicit that there are no bespoke card
           * systems per product — but the three products that own an
           * Experience world are the only three in the catalogue whose card
           * may carry it, so the section lands as the page's commercial
           * climax instead of as three pale rectangles after two dark
           * Experience beats. The action stays neutral on all three
           * (CONVENTIONS §11): paper on charcoal, never the world's colour.
           */}
          <Grid className="items-start">
            {flagships.map((product, position) => (
              <div
                key={product.id}
                className={
                  "col-span-12 md:col-span-4 " +
                  ["", "md:mt-(--space-2xl)", "md:mt-(--space-4xl)"][position]
                }
              >
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
              </div>
            ))}
          </Grid>
        </Container>
      </Section>
    </>
  );
}
