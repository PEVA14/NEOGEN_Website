import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { AddToBag } from "@/components/commerce";
import {
  CommercePanel,
  FlagshipInterlude,
  MediaStrip,
  PresentationLadder,
  ProductPlate,
  ProductStage,
  SpecTable,
  WorldMaterial,
  ladderStep,
} from "@/components/product";
import { QualityRecord } from "@/components/quality";
import { CitationRail } from "@/components/research";
import { Body, Mono } from "@/components/typography";
import { ProductCard, TextLink } from "@/components/ui";
import { FlagshipShop } from "@/components/storefront";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getWorld } from "@/config/worlds";
import { galleryImages, productMedia, resolveStageStill } from "@/content/media";
import { publicOverview } from "@/content/overview";
import { referencesForProduct } from "@/content/research";
import { resolveEvidence } from "@/domain/quality";
import {
  formatStrength,
  getProduct,
  presentationRange,
  isPublishable,
  products,
  publishedProducts,
} from "@/data/catalog";
import { formatPrice, getAvailability, getPrices } from "@/data/commerce";
import { productsInArea, publicAreasFor, relatedByArea } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { bagEnabled } from "@/payments";
import { cardDetails, cardDetailsCopy } from "@/server/catalog";
import { shopProducts } from "@/server/storefront";
import { fillTemplate, presentationSummary, socialMetadata } from "@/lib/meta";

import type { Metadata } from "next";

/**
 * PRODUCT DETAIL — every product in the catalogue.
 *
 * TWO TEMPLATES, ONE PAGE.
 * -----------------------
 * The three flagships open in `ProductStage`: their own Experience world, a
 * live 3D viewer, commerce inside the environment. The other ~83 open in
 * `ProductPlate`: the same information architecture in Quiet Mode with static
 * media. A world costs a GLB, an art direction and a WebGL context; 86 of them
 * is not a catalogue, it is 86 bespoke sites.
 *
 * Below the opening both are identical — specifications, documentation,
 * research, related compounds — because that spine is the product record, and
 * it should not depend on whether a compound happens to be a flagship.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const product = getProduct(slug);
  if (!product) return {};

  const dict = await getDictionary(locale);
  /*
   * A description built from this product's own record. Without it every
   * product page inherited the site-wide line, so 83 URLs per locale shared one
   * search-result snippet.
   */
  const description = fillTemplate(dict.meta.descriptions.product, {
    name: product.name,
    classification: dict.products.catalog.categoryLabels[product.category],
    presentations: presentationSummary(product.variants.map((v) => formatStrength(v.strength))),
  });

  /*
   * THE SOCIAL CARD USES A PHOTOGRAPH OR THE BRAND CARD — never the diagram.
   *
   * Where a product has real primary media, that becomes its share image: one
   * asset, registered once, reaching the card, the page and the link preview.
   * Where it does not, `socialMetadata` falls back to the locale's generated
   * brand card.
   *
   * The DIAGRAM is deliberately not a candidate. On the page it sits in a
   * framed plate that reads as a technical drawing; in a link preview it would
   * arrive with no frame and no context, where it reads as a photograph of a
   * product we have not photographed.
   */
  return {
    title: product.name,
    description,
    ...socialMetadata({
      locale,
      path: routes.product(product.slug),
      title: product.name,
      description,
      image: productMedia(product.slug).primary,
    }),
    alternates: alternates(locale, routes.product(product.slug)),
  };
}

/*
 * Every publishable product, in both locales. `dynamicParams = false` makes an
 * unknown slug a REAL 404 — `notFound()` from a dynamically rendered segment
 * answers HTTP 200, which search engines index as a valid page.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return publishedProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const product = getProduct(slug);
  if (!product || !isPublishable(product)) notFound();

  const dict = await getDictionary(locale);
  const pdp = dict.pdp;
  const placeholder = dict.status.placeholder;
  const path = (to: string) => localizePath(to, locale);

  /* Only the three flagships have an Experience world. Whether one also has a
     3D viewer is a MEDIA question, not a world question: GLOW and GHK-Cu have
     worlds and no model, and open in their environment with the static plate. */
  const world = product.world ? getWorld(product.world) : null;
  const media = productMedia(product.slug);
  /* Approved areas — 83 of 85 products have at least one. */
  const areas = publicAreasFor(product.slug);
  const gallery = galleryImages(media);

  /* Trust and understanding, resolved on the server. */
  const evidence = resolveEvidence(product);
  const presentationLabels = product.variants.map((v) => ({
    variantId: v.id,
    label: `${formatStrength(v.strength)}${v.vials ? ` × ${v.vials}` : ""}`,
  }));
  const overview = publicOverview(product.slug, locale);
  const references = referencesForProduct(product.slug);
  const citationNumber = (id: string) =>
    String(references.findIndex((r) => r.id === id) + 1).padStart(2, "0");
  const worldStatement = world
    ? world.id === "reta"
      ? dict.home.reta.beats[0].statement
      : world.id === "glow"
        ? dict.home.glow.statement
        : dict.home.ghkcu.statement
    : "";

  const variantIds = product.variants.map((v) => v.id);
  const commerce = await getPrices(variantIds);
  const availability = await getAvailability(variantIds);
  /*
   * RELATED — discovery-area overlap first, supplier category as the fallback.
   *
   * Area overlap is the better recommendation because it is the axis a
   * customer is actually shopping along: someone on a metabolic compound wants
   * other metabolic compounds, not whatever else the supplier filed under
   * "peptides". `relatedByArea` ranks by how many areas two products share, so
   * a double overlap outranks a single one.
   *
   * It returns nothing while assignments are drafts, so the category behaviour
   * that shipped before is still what renders today — and the switch happens
   * per product, as each one's areas are approved, with no flag to flip.
   */
  const byArea = relatedByArea(product.slug, 3).filter(isPublishable);
  const related =
    byArea.length > 0
      ? byArea
      : products
          .filter(
            (p) => p.category === product.category && p.slug !== product.slug && isPublishable(p),
          )
          .slice(0, 3);
  /*
   * COMPLEMENTARY MATERIALS. The solvents, on every page except their own —
   * offering bacteriostatic water alongside bacteriostatic water is noise.
   */
  const materials =
    product.category === "solvents" ? [] : productsInArea("materials").filter(isPublishable);

  const relatedPriceMap = await getPrices(
    [...related, ...materials].flatMap((p) => p.variants.map((v) => v.id)),
  );
  const priceFor = (pool: readonly (typeof products)[number][]) => (slugId: string) => {
    const p = pool.find((r) => r.slug === slugId);
    const m = p?.variants
      .map((v) => relatedPriceMap.get(v.id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => a.amount - b.amount)[0];
    return m ? formatPrice(m, localeTags[locale]) : null;
  };
  const relatedPrice = priceFor(related);
  /* The same reveal the catalogue cards carry, so a related card behaves like every other card. */
  const detailsCopy = cardDetailsCopy(dict);
  const detailsFor = (item: (typeof related)[number]) =>
    cardDetails(item, { locale, dict, prices: relatedPriceMap });
  const materialPrice = priceFor(materials);

  /*
   * THE OTHER WORLDS. On a flagship page only, and never this product: the
   * commerce panel above already sells it, and a second counter for the same
   * compound is the same action twice. RETA's page offers GLOW and GHK-Cu.
   */
  const otherFlagships = product.world
    ? (await shopProducts(locale, dict)).filter((item) => item.slug !== product.slug)
    : [];

  /*
   * SECTION NUMBERING FOLLOWS WHAT RENDERS.
   *
   * The profile exists only for products with approved sourced content, and
   * materials and related only when there is something to list. Hardcoded
   * indices left gaps — "02, 04, 05" — wherever a section was absent, so the
   * spine is numbered from the sections that actually render.
   */
  const renderedSections = [
    "specifications",
    /* With a sourced profile, the research routes live inside it: a separate
       section holding one link under a heading was the thinnest on the page. */
    ...(overview ? ["overview"] : ["research"]),
    "quality",
    ...(otherFlagships.length > 0 ? ["worlds"] : []),
    ...(related.length > 0 ? ["related"] : []),
    ...(materials.length > 0 ? ["materials"] : []),
  ];
  const sectionIndex = (id: string) => String(renderedSections.indexOf(id) + 2).padStart(2, "0");
  /*
   * THE RECORD ALTERNATES ITS GROUND — stone, paper, stone — by rendered
   * position, so every section boundary is visible without a rule or a box,
   * whichever sections a product happens to have. Specifications open on
   * stone, directly under the paper buy box.
   */
  const ground = (id: string) =>
    renderedSections.indexOf(id) % 2 === 0 ? "bg-(--surface-raised)" : undefined;

  const areaRoutes =
    areas.length > 0 ? (
      <nav aria-label={pdp.research.routes} className="mt-(--space-lg)">
        <Mono size="2xs" className="mb-(--space-2xs) block text-(--ink-muted) uppercase">
          {pdp.research.routes}
        </Mono>
        <ul className="flex flex-wrap gap-x-(--space-lg)">
          {areas.map((area) => (
            <li key={area.id}>
              <TextLink href={path(routes.area(area.slug))}>
                {dict.discovery.areas[area.id].title}
              </TextLink>
            </li>
          ))}
        </ul>
      </nav>
    ) : null;

  const commercePanel = (
    <CommercePanel
      world={product.world}
      /*
       * THE EYEBROW, IN PRIORITY ORDER.
       *
       *   1. the world's character label, for the three flagships;
       *   2. the product's discovery area — the commercial framing a customer
       *      is actually shopping along;
       *   3. the supplier category, as the fallback for the two products with
       *      no approved area.
       */
      worldLabel={
        product.world
          ? dict.home.products.worldLabels[product.world]
          : (areas[0] && dict.discovery.areas[areas[0].id].title) ||
            dict.products.catalog.categoryLabels[product.category]
      }
      copy={{
        ...pdp.commerce,
        name: product.name,
        subtitle: product.subtitle,
        /* Composition where the source states one; otherwise nothing. The old
           copy described the glass vial, which is packaging, not product. */
        descriptor: product.composition,
        documentationHref: "#calidad",
        placeholder,
      }}
    >
      <AddToBag
        slug={product.slug}
        name={product.name}
        variants={product.variants.map((v) => ({
          variantId: v.id,
          presentation: formatStrength(v.strength),
          pack: v.vials ? dict.products.card.pack.replace("{n}", String(v.vials)) : null,
          price: commerce.get(v.id) ?? null,
          availability: availability.get(v.id) ?? null,
        }))}
        copy={{
          variantLabel: pdp.commerce.variantLabel,
          quantityLabel: pdp.commerce.quantityLabel,
          priceLabel: pdp.commerce.priceLabel,
          add: dict.commerceUi.add,
          added: dict.commerceUi.added,
          soldOut: dict.commerceUi.soldOut,
          unavailable: dict.commerceUi.unavailable,
          decrease: dict.commerceUi.decrease,
          increase: dict.commerceUi.increase,
          availability: dict.commerce.availability,
        }}
        /* The BAG gate, not the payment gate: adding to a bag needs prices
           and a business decision, not a processor. Decided on the server so
           it is never re-derived in the browser. */
        enabled={bagEnabled()}
        localeTag={localeTags[locale]}
      />
    </CommercePanel>
  );

  return (
    <>
      {/* 01 — THE PRODUCT. Flagship environment, or the quiet plate. */}
      {world ? (
        <Section
          mode="impact"
          surface="dark"
          padded={false}
          aria-label={product.name}
          className="overflow-x-clip"
        >
          <ProductStage
            world={world.id}
            /* Assets come from the media layer, keyed by this product's slug —
               the same lookup the card and the social card make. */
            modelPath={media.model}
            environment={world.environment}
            poster={resolveStageStill(media)}
            material={<WorldMaterial world={world.id} />}
            frameMarks={
              media.model ? <WorldMaterial world={world.id} interior={false} /> : undefined
            }
            wordmark={product.name}
            posterAlt={product.name}
            loadingLabel={dict.home.reta.loadingLabel}
            staticLabel={dict.home.reta.staticLabel}
            viewerHint={pdp.viewerHint}
          >
            {commercePanel}
          </ProductStage>
        </Section>
      ) : (
        <Section mode="quiet" aria-label={product.name} className="max-md:pt-(--space-md)">
          <Container width="full">
            <ProductPlate
              slug={product.slug}
              name={product.name}
              areaId={areas[0]?.id ?? null}
              presentations={product.variants.length}
              annotation={presentationRange(product)}
            >
              {commercePanel}
            </ProductPlate>
          </Container>
        </Section>
      )}

      {/* Supplementary photography, when it exists. Nothing today. */}
      {gallery.length > 0 ? (
        <Section mode="quiet" aria-label={pdp.inspectionLabel}>
          <Container width="full">
            <MediaStrip images={gallery} labels={pdp.media} />
          </Container>
        </Section>
      ) : null}

      {/*
       * SPECIFICATIONS — led by the presentation ladder.
       *
       * The ladder sets the catalogue's own facts as figures; the table below
       * keeps the full technical record. The rows that only a verified source
       * could fill — purity, storage, molecular mass — are not rendered at
       * all rather than shown empty.
       *
       * "Clasificación de catálogo", not "Categoría": the value is where the
       * compound is filed, and several compounds filed under Péptidos are not
       * peptides.
       */}
      <Section
        mode="quiet"
        rhythm="record"
        aria-labelledby="spec-title"
        className={ground("specifications")}
      >
        <Container width="full">
          <SectionHeader
            scale="record"
            index={sectionIndex("specifications")}
            label={`${pdp.specifications.label} // ${pdp.specifications.qualifier}`}
            title={pdp.specifications.title}
            id="spec-title"
          />
          <div className="mb-(--space-xl)">
            <PresentationLadder
              label={pdp.specifications.ladder}
              packLabel={pdp.specifications.pack}
              steps={product.variants.map((v) => ladderStep(v.strength, v.vials))}
            />
          </div>
          <SpecTable
            rows={[
              { key: pdp.specifications.compound, value: product.name },
              {
                key: pdp.specifications.classification,
                value: dict.products.catalog.categoryLabels[product.category],
              },
              {
                key: pdp.specifications.presentation,
                value: product.variants
                  .map((v) => `${formatStrength(v.strength)}${v.vials ? ` × ${v.vials}` : ""}`)
                  .join(" · "),
              },
              ...(product.composition
                ? [{ key: pdp.specifications.composition, value: product.composition }]
                : []),
            ]}
          />
        </Container>
      </Section>

      {/* Impact — the flagship's world, once more, between trust and reference. */}
      {world ? (
        <FlagshipInterlude
          world={world.id}
          titleId="interlude-title"
          eyebrow={dict.home.products.worldLabels[world.id]}
          statement={worldStatement}
          facts={[
            { key: pdp.interlude.range, value: presentationRange(product) },
            {
              key: pdp.interlude.presentations,
              value: String(product.variants.length).padStart(2, "0"),
            },
            ...(areas[0]
              ? [{ key: pdp.interlude.area, value: dict.discovery.areas[areas[0].id].title }]
              : []),
          ]}
        />
      ) : null}

      {/*
       * 03 — PROFILE. Only when approved, sourced content exists.
       *
       * No overview has been written against sources, so this section is
       * absent on every product today — not a heading over a placeholder.
       * Every sentence it can render carries at least one public reference.
       */}
      {overview ? (
        <Section
          mode="quiet"
          rhythm="record"
          aria-labelledby="overview-title"
          className={ground("overview")}
        >
          <Container width="full">
            <SectionHeader
              scale="record"
              index={sectionIndex("overview")}
              label={`${pdp.overview.label} // ${pdp.overview.qualifier}`}
              title={pdp.overview.title}
              id="overview-title"
              lede={overview.summary ?? undefined}
              action={<TextLink href={path(routes.research)}>{pdp.research.hub}</TextLink>}
            />
            <div className="grid gap-(--space-xl) lg:grid-cols-12">
              <div className="flex flex-col gap-(--space-lg) lg:col-span-7">
                {(
                  [
                    [pdp.overview.researchContext, overview.researchContext],
                    [pdp.overview.mechanism, overview.mechanismNotes],
                  ] as const
                ).map(([heading, statements]) =>
                  statements.length > 0 ? (
                    <div key={heading} className="flex flex-col gap-(--space-sm)">
                      <Mono size="2xs" className="text-(--ink-muted) uppercase">
                        {heading}
                      </Mono>
                      {statements.map((statement) => (
                        <Body key={statement.id}>
                          {statement.text}{" "}
                          <Mono size="2xs" className="text-(--ink-muted)">
                            [{statement.references.map((r) => citationNumber(r.id)).join(", ")}]
                          </Mono>
                        </Body>
                      ))}
                    </div>
                  ) : null,
                )}
                {overview.technicalNotes.length > 0 ? (
                  <div className="flex flex-col gap-(--space-sm)">
                    <Mono size="2xs" className="text-(--ink-muted) uppercase">
                      {pdp.overview.technical}
                    </Mono>
                    {overview.technicalNotes.map((note) => (
                      <Body key={note}>{note}</Body>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="lg:col-span-5">
                <CitationRail references={references} copy={dict.citations} />
                {areaRoutes}
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/*
       * RESEARCH — citations this page actually makes, and where to read on.
       *
       * The references are derived from the overview's citations, the same
       * records the Research Hub indexes. With a sourced profile, the rail and
       * the area routes sit inside the profile (above); only a product with no
       * profile gets this section, as a route map into its areas — it never
       * announces an absence of literature.
       */}
      {!overview ? (
        <Section
          mode="quiet"
          rhythm="record"
          aria-labelledby="research-title"
          className={ground("research")}
        >
          <Container width="full">
            <SectionHeader
              scale="record"
              index={sectionIndex("research")}
              label={`${pdp.research.label} // ${pdp.research.qualifier}`}
              title={pdp.research.title}
              id="research-title"
              lede={pdp.research.lede}
              action={<TextLink href={path(routes.research)}>{pdp.research.hub}</TextLink>}
            />
            <CitationRail references={references} copy={dict.citations} />
            {areaRoutes}
          </Container>
        </Section>
      ) : null}

      {/*
       * QUALITY / DOCUMENTATION — after the product, its specification and its
       * science (V1 commerce pass; the Design Bible's PDP order). A product
       * with public documents shows every record here; one without says so in
       * a single statement rather than a four-row chain of absences. `#calidad`
       * is still the anchor the commerce panel links to.
       */}
      <Section
        mode="quiet"
        rhythm="record"
        aria-labelledby="quality-title"
        id="calidad"
        className={ground("quality")}
      >
        <Container width="full">
          <SectionHeader
            scale="record"
            index={sectionIndex("quality")}
            label={`${pdp.quality.label} // ${pdp.quality.qualifier}`}
            title={pdp.quality.title}
            id="quality-title"
          />
          <QualityRecord
            presentations={presentationLabels}
            evidence={evidence}
            copy={dict.quality.record}
            localeTag={localeTags[locale]}
          />
        </Container>
      </Section>

      {/*
       * THE OTHER WORLDS — the flagship counter, with this product's siblings.
       * Quiet: the worlds appear in the plate and the tab dots, never in the
       * controls (CONVENTIONS §3, §11), and the action is gated on the server.
       */}
      {otherFlagships.length > 0 ? (
        <Section
          mode="quiet"
          rhythm="record"
          aria-labelledby="worlds-title"
          className={ground("worlds")}
        >
          <Container width="full">
            <SectionHeader
              scale="record"
              index={sectionIndex("worlds")}
              label={`${pdp.shop.label} // ${pdp.shop.qualifier}`}
              title={pdp.shop.title}
              id="worlds-title"
              lede={pdp.shop.lede}
            />
            <FlagshipShop
              products={otherFlagships}
              threshold={siteConfig.fulfilment.freeShippingThreshold}
              bagEnabled={bagEnabled()}
              localeTag={localeTags[locale]}
              copy={{
                tabsLabel: pdp.shop.tabsLabel,
                worldLabels: dict.home.products.worldLabels,
                composition: pdp.shop.composition,
                presentation: pdp.shop.presentation,
                presentations: pdp.shop.presentations,
                unit: pdp.shop.unit,
                freeReached: pdp.shop.freeReached,
                freeFrom: pdp.shop.freeFrom,
                add: pdp.shop.add,
                added: pdp.shop.added,
                view: pdp.shop.view,
              }}
            />
          </Container>
        </Section>
      ) : null}

      {/* RELATED, by discovery area. */}
      {related.length > 0 ? (
        <Section
          mode="quiet"
          rhythm="record"
          aria-labelledby="related-title"
          className={ground("related")}
        >
          <Container width="full">
            <SectionHeader
              scale="record"
              index={sectionIndex("related")}
              label={`${pdp.related.label} // ${pdp.related.qualifier}`}
              title={pdp.related.title}
              id="related-title"
              action={<TextLink href={path(routes.products)}>{pdp.related.action}</TextLink>}
            />
            {/* One even row: a buyer compares these side by side, so the
                cards share a baseline rather than staggering. A swiped shelf
                on a phone. */}
            <div className="-mx-(--gutter) flex snap-x snap-mandatory scroll-px-(--gutter) [scrollbar-width:none] gap-(--space-sm) overflow-x-auto px-(--gutter) md:mx-0 md:grid md:grid-cols-3 md:items-start md:gap-(--gutter) md:overflow-visible md:px-0">
              {related.map((item) => (
                <div key={item.id} className="flex shrink-0 basis-[64%] snap-start md:basis-auto">
                  <ProductCard
                    slug={item.slug}
                    world={item.world}
                    worldLabel={item.world ? dict.home.products.worldLabels[item.world] : undefined}
                    areaId={publicAreasFor(item.slug)[0]?.id ?? null}
                    eyebrow={
                      publicAreasFor(item.slug)[0]
                        ? dict.discovery.areas[publicAreasFor(item.slug)[0].id].title
                        : dict.products.catalog.categoryLabels[item.category]
                    }
                    name={item.name}
                    subtitle={item.subtitle}
                    href={path(routes.product(item.slug))}
                    price={relatedPrice(item.slug)}
                    priceFrom={dict.products.catalog.from}
                    presentationRange={presentationRange(item)}
                    presentations={item.variants.length}
                    ctaLabel={dict.home.products.cta}
                    details={detailsFor(item)}
                    detailsCopy={detailsCopy}
                  />
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/*
       * COMPLEMENTARY MATERIALS — after related compounds: the lower-ticket
       * adjacency closes the page rather than interrupting it.
       *
       * The solvents are the catalogue's only low-ticket items and its most
       * natural adjacency, and they were reachable only by scrolling 85 cards
       * or knowing to filter. Shown on every compound page and on none of the
       * solvent pages themselves.
       *
       * Verb-free by design: this lists products, it does not suggest a
       * procedure. See the dictionary note.
       */}
      {materials.length > 0 ? (
        <Section
          mode="quiet"
          rhythm="record"
          aria-labelledby="materials-title"
          className={ground("materials")}
        >
          <Container width="full">
            <SectionHeader
              scale="record"
              index={sectionIndex("materials")}
              label={`${pdp.materials.label} // ${pdp.materials.qualifier}`}
              title={pdp.materials.title}
              id="materials-title"
              action={
                <TextLink href={path(routes.area("materiales"))}>{pdp.materials.action}</TextLink>
              }
            />
            {/* A swiped shelf on a phone, as on the homepage: three full-width
                cards stacked were the longest scroll on the page. */}
            <div className="-mx-(--gutter) flex snap-x snap-mandatory scroll-px-(--gutter) [scrollbar-width:none] gap-(--space-sm) overflow-x-auto px-(--gutter) md:mx-0 md:grid md:grid-cols-3 md:items-start md:gap-(--gutter) md:overflow-visible md:px-0">
              {materials.map((item) => (
                <div key={item.id} className="flex shrink-0 basis-[64%] snap-start md:basis-auto">
                  <ProductCard
                    slug={item.slug}
                    world={null}
                    areaId="materials"
                    eyebrow={dict.discovery.areas.materials.title}
                    name={item.name}
                    href={path(routes.product(item.slug))}
                    price={materialPrice(item.slug)}
                    priceFrom={dict.products.catalog.from}
                    presentationRange={presentationRange(item)}
                    presentations={item.variants.length}
                    ctaLabel={dict.home.products.cta}
                    details={detailsFor(item)}
                    detailsCopy={detailsCopy}
                  />
                </div>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
