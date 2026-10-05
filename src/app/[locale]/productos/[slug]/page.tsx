import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { TrackOnce } from "@/analytics/TrackOnce";
import { AddToBag, ResearchUseNotice, ShippingNote } from "@/components/commerce";
import {
  CommercePanel,
  FlagshipInterlude,
  MediaStrip,
  PresentationLadder,
  ProductStage,
  SpecTable,
  WorldMaterial,
  ladderStep,
} from "@/components/product";
import { QualityRecord } from "@/components/quality";
import { CitationMarks, CitationRail } from "@/components/research";
import { SourceTether } from "@/components/motion/SourceTether";
import { TermLens } from "@/components/motion/TermLens";
import { RECORD_NAVIGATION, recordNames } from "@/components/research/recordTransition";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { PageTransition } from "@/components/vial-transition/PageTransition";
import { BENCH } from "@/components/spec-ribbon/benches";
import { RibbonBench } from "@/components/spec-ribbon/RibbonBench";
import { FlagshipShop } from "@/components/storefront";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { getWorld } from "@/config/worlds";
import { commerceStill, galleryImages, productMedia, resolveStageStill } from "@/content/media";
import { ProductBench, type BenchSpecimen } from "@/components/product/bench/ProductBench";
import { CatalogueDirectory, type DirectoryGroup } from "@/components/product/CatalogueDirectory";
import { blendConstituents } from "@/components/product/glow/composition";
import { GlowConstituents } from "@/components/product/glow/GlowConstituents";
import { GlowComposition } from "@/components/product/glow/GlowComposition";
import { specimenFor } from "@/components/vial-transition/specimens";
import { compoundRecord, hasRecord, lineIds } from "@/content/compendium";
import { termSpans, termsInText } from "@/content/glossary";
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
import { productsInArea, publicAreasFor } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { bagEnabled } from "@/payments";
import { shopProducts } from "@/server/storefront";
import { fillTemplate, presentationSummary, socialMetadata } from "@/lib/meta";

import type { Metadata } from "next";

/**
 * PRODUCT DETAIL — every product in the catalogue.
 *
 * TWO TEMPLATES, ONE PAGE.
 * -----------------------
 * The three flagships open in `ProductStage`: their own Experience world, a
 * live 3D viewer, commerce inside the environment. Every other product opens
 * on `ProductBench`: the same information architecture, the product standing
 * in its studio in the bright field — set down when it arrives, responsive at
 * rest, quiet after (owner, 2026-10-02: "every product is alive; flagships are
 * simply allowed to become cinematic"). A world costs a GLB, an art direction
 * and a WebGL context; the bench costs images and CSS.
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
  /*
   * THE PRODUCT'S AREA AS ITS RECORD'S CONTEXT COLOUR (color pass). A standard
   * product's record — specification, profile, quality, catalogue — reads in
   * its first area's colour, in small doses: the section numbers and rules,
   * the reading connections (citations, definitions). "Coloured ink entering
   * the laboratory", never a world: a flagship keeps its own palette.
   */
  const areaContext = world ? undefined : (areas[0]?.id ?? undefined);

  /* Trust and understanding, resolved on the server. */
  const evidence = resolveEvidence(product);
  /* As the bench's rail and the price line print a presentation. */
  const presentationLabels = product.variants.map((v) => ({
    variantId: v.id,
    label: `${formatStrength(v.strength)}${
      v.vials ? ` ${dict.products.card.pack.replace("{n}", String(v.vials))}` : ""
    }`,
  }));
  const overview = publicOverview(product.slug, locale);
  const references = referencesForProduct(product.slug);
  const citationIndex = (id: string) => references.findIndex((r) => r.id === id) + 1;
  /** `ref-01` — the profile's rail entry a citation marker points at. */
  const refAnchor = (n: number) => `ref-${String(n).padStart(2, "0")}`;
  const worldStatement = world
    ? world.id === "reta"
      ? dict.home.reta.statement
      : world.id === "glow"
        ? dict.home.glow.statement
        : dict.home.ghkcu.statement
    : "";

  const variantIds = product.variants.map((v) => v.id);
  const commerce = await getPrices(variantIds);
  const availability = await getAvailability(variantIds);
  /*
   * THE SPECIMEN IN ITS PLACE (finishing pass). "Related" was three picks —
   * the first names alphabetically among the products sharing an area — set
   * as three large cards. What actually relates them is the catalogue area,
   * so the area itself is shown: every product filed in it, A to Z, this one
   * marked where it falls. Each of a product's areas is a group (75 products
   * have one, 8 have two). A product with no approved area (2 of 85) keeps
   * the supplier-category fallback that shipped before, as a group of its own.
   */
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");
  const areaPools = areas.map((area) => ({
    area,
    pool: [...productsInArea(area.id)].filter(isPublishable).sort(byName),
  }));
  const fallbackPool =
    areas.length > 0
      ? []
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
    product.category === "solvents" || areas.some((area) => area.id === "materials")
      ? []
      : [...productsInArea("materials")].filter(isPublishable).sort(byName);

  const directoryProducts = [
    ...areaPools.flatMap((group) => group.pool),
    ...fallbackPool,
    ...materials,
  ];
  const directoryPrices = await getPrices(
    directoryProducts.flatMap((p) => p.variants.map((v) => v.id)),
  );
  const lowestPrice = (item: (typeof products)[number]) => {
    const m = item.variants
      .map((v) => directoryPrices.get(v.id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => a.amount - b.amount)[0];
    return m ? formatPrice(m, localeTags[locale]) : null;
  };
  const entryFor = (item: (typeof products)[number]) => ({
    slug: item.slug,
    name: item.name,
    range: presentationRange(item) ?? "",
    price: lowestPrice(item),
    href: path(routes.product(item.slug)),
    world: item.world,
    area: publicAreasFor(item.slug)[0]?.id ?? null,
    current: item.slug === product.slug,
  });
  const directory: DirectoryGroup[] = [
    ...areaPools.map(({ area, pool }) => ({
      id: area.id,
      area: area.id,
      name: dict.discovery.areas[area.id].short,
      href: path(routes.area(area.slug)),
      entries: pool.map(entryFor),
    })),
    ...(fallbackPool.length > 0
      ? [
          {
            id: "category",
            area: null,
            name: dict.products.catalog.categoryLabels[product.category],
            href: path(routes.products),
            entries: [entryFor(product), ...fallbackPool.map(entryFor)].sort(byName),
          },
        ]
      : []),
    ...(materials.length > 0
      ? [
          {
            id: "materials",
            area: "materials" as const,
            name: dict.discovery.areas.materials.short,
            href: path(routes.area("materiales")),
            entries: materials.map(entryFor),
          },
        ]
      : []),
  ];

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
    ...(directory.length > 0 ? ["related"] : []),
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

  /*
   * THE WAYS OUT INTO NEOGEN RESEARCH.
   *
   * A product page used to offer one: its areas, which are views of the
   * CATALOGUE. The record page already offered three — area, research line and
   * glossary term — so the science linked to commerce but not the other way
   * round. These are the same three, derived from the same record, so a reader
   * who arrives at a product can reach why it is studied and what its words
   * mean without going back through the hub.
   *
   * Nothing is invented: the lines are the record's own function tags (only
   * the ones with a page), and the terms are the glossary's matches against
   * the record's own published sentences. A product with no record gets its
   * areas alone, as before.
   */
  const record = compoundRecord(product.slug, locale);
  const linkableLines = new Set(lineIds());
  const recordLines = (record?.functions ?? []).filter((fn) => linkableLines.has(fn.id));
  /*
   * Terms are matched against THIS PAGE's sentences, not the whole record's.
   * The product page shows a cut of the record — summary, research context,
   * mechanism and technical notes — and matching the record's full text listed
   * words a reader could not see here, which is both confusing and a longer
   * list than the rail can carry.
   */
  const recordTerms = overview
    ? termsInText(
        [
          overview.summary ?? "",
          ...overview.researchContext.map((statement) => statement.text),
          ...overview.mechanismNotes.map((statement) => statement.text),
          ...overview.technicalNotes,
        ].join(" "),
        locale,
      )
    : [];

  /* The profile's glossary words, marked at first use in its own sentences
     and opened in place (`TermLens`), as the full record does. */
  const seenTerms = new Set<string>();
  const termed = (text: string) =>
    termSpans(text, locale, seenTerms).map((span, i) =>
      span.term ? (
        <Link key={i} href={path(routes.glossaryTerm(span.term.id))} data-term={span.term.id}>
          {span.text}
        </Link>
      ) : (
        span.text
      ),
    );

  const routeGroups: readonly {
    label: string;
    /** Areas and lines are destinations and carry the arrow; a term is a
        definition lookup, so it is set quiet and without one. */
    quiet?: boolean;
    items: readonly { key: string; href: string; text: string; term?: string }[];
  }[] = [
    {
      label: pdp.research.routes,
      items: areas.map((area) => ({
        key: area.id,
        href: path(routes.area(area.slug)),
        text: dict.discovery.areas[area.id].title,
      })),
    },
    {
      label: pdp.research.lines,
      items: recordLines.map((fn) => ({
        key: fn.id,
        href: path(routes.line(fn.id)),
        text: fn.label[locale],
      })),
    },
    {
      label: pdp.research.terms,
      quiet: true,
      items: recordTerms.map((term) => ({
        key: term.id,
        href: path(routes.glossaryTerm(term.id)),
        text: term.term[locale],
        term: term.id,
      })),
    },
  ].filter((group) => group.items.length > 0);

  const areaRoutes =
    routeGroups.length > 0 ? (
      <nav
        aria-label={pdp.research.continueReading}
        className="mt-(--space-lg) flex flex-col gap-(--space-md)"
      >
        {routeGroups.map((group) => (
          <div key={group.label}>
            <Mono size="2xs" className="mb-(--space-2xs) block text-(--ink-muted) uppercase">
              {group.label}
            </Mono>
            <ul
              className={
                group.quiet
                  ? "flex flex-wrap gap-x-(--space-md)"
                  : "flex flex-wrap gap-x-(--space-lg)"
              }
            >
              {group.items.map((item) => (
                <li key={item.key}>
                  <TextLink
                    href={item.href}
                    arrow={!group.quiet}
                    tone={group.quiet ? "muted" : "default"}
                    term={item.term}
                  >
                    {item.text}
                  </TextLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    ) : null;

  /*
   * GLOW: its composition, read into parts its light can separate into — each
   * linked to the product of that name, in proportion only when the parts add
   * up to the strength it is sold at (`glow/composition.ts`).
   */
  const soleStrength =
    product.variants.length === 1 && product.variants[0].strength.kind === "solid"
      ? product.variants[0].strength.mg
      : null;
  const constituents =
    world?.formation === "illumination"
      ? blendConstituents(product.composition, publishedProducts)
      : null;
  /* The live vial's own first frame, as the composition moment's still. */
  const glowStage = constituents ? specimenFor(product.slug)?.stage : null;
  const glowStill = glowStage
    ? { src: glowStage.src, width: glowStage.pixels.width, height: glowStage.pixels.height }
    : null;

  const commercePanel = (
    <CommercePanel
      descriptor={
        constituents
          ? (className) => (
              <GlowConstituents
                parts={constituents}
                className={className}
                hrefFor={Object.fromEntries(
                  constituents
                    .filter((part) => part.slug)
                    .map((part) => [part.slug, path(routes.product(part.slug as string))]),
                )}
                linkLabel={pdp.shop.view}
              />
            )
          : undefined
      }
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
      conditions={
        <>
          <ShippingNote copy={dict.shipping} localeTag={localeTags[locale]} />
          <ResearchUseNotice
            copy={dict.researchUse}
            href={path(routes.article("uso-exclusivo-en-investigacion"))}
          />
        </>
      }
    >
      <TrackOnce event={{ name: "product_viewed", product: product.slug, sku: null }} />
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

  /* The bench: the split render the card travels from, or the drawing. */
  const benchRender = specimenFor(product.slug);
  const bench: BenchSpecimen | null = world
    ? null
    : benchRender
      ? {
          kind: "render",
          specimen: benchRender,
          alt: commerceStill(product.slug)?.alt ?? product.name,
        }
      : { kind: "drawn", name: product.name, annotation: presentationRange(product) };

  return (
    <PageTransition>
      {/* 01 — THE PRODUCT. Flagship environment, the bench, or the quiet plate. */}
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
            /* The world's own name ("RETA", "GLOW", "GHK-Cu"), not the
               catalogue's fuller one (owner: no "Peptide" or "Research"
               across the field). */
            wordmark={world.label}
            posterAlt={product.name}
            /* The split studio still stands in here, and receives the card's
               specimen (the vial transition). */
            slug={product.slug}
            /* What the frame reads off the label: the compound and its
               status, both already on this page — nothing measured or
               invented. */
            inspection={[product.name, dict.researchUse.label]}
            loadingLabel={dict.home.reta.loadingLabel}
            staticLabel={dict.home.reta.staticLabel}
            viewerHint={pdp.viewerHint}
          >
            {commercePanel}
          </ProductStage>
        </Section>
      ) : bench ? (
        /* The bench: the product standing in its studio, alive in the
           bright field (`components/product/bench`). */
        <Section mode="quiet" padded={false} aria-label={product.name}>
          <ProductBench
            slug={product.slug}
            areaId={areas[0]?.id ?? null}
            specimen={bench}
            presentations={product.variants.map((v) => ({
              id: v.id,
              label: `${formatStrength(v.strength)}${
                v.vials ? ` ${dict.products.card.pack.replace("{n}", String(v.vials))}` : ""
              }`,
            }))}
          >
            {commercePanel}
          </ProductBench>
        </Section>
      ) : null}

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
        data-area={areaContext}
        className={ground("specifications")}
      >
        <Container width="full">
          {(() => {
            const header = (
              <SectionHeader
                scale="record"
                index={sectionIndex("specifications")}
                label={`${pdp.specifications.label} // ${pdp.specifications.qualifier}`}
                title={pdp.specifications.title}
                id="spec-title"
              />
            );
            const section = (
              <>
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
                        .map(
                          (v) => `${formatStrength(v.strength)}${v.vials ? ` × ${v.vials}` : ""}`,
                        )
                        .join(" · "),
                    },
                    ...(product.composition
                      ? [{ key: pdp.specifications.composition, value: product.composition }]
                      : []),
                  ]}
                />
              </>
            );
            /* The specifications ribbon (components/spec-ribbon): a band
               unwound off the vial becomes the panel that holds this section,
               on every product. Without it — reduced motion, no WebGL — the
               section as it is, under its heading. */
            return (
              <RibbonBench
                bench={BENCH}
                heading={header}
                name={product.name}
                range={presentationRange(product)}
                stepsLabel={pdp.specifications.ladder}
                steps={product.variants.map((v, index) => {
                  const step = ladderStep(v.strength, v.vials);
                  return {
                    index: `P-${String(index + 1).padStart(2, "0")}`,
                    value: step.value,
                    unit: step.unit,
                    pack: step.vials
                      ? pdp.specifications.pack.replace("{n}", String(step.vials))
                      : null,
                  };
                })}
                rows={[
                  {
                    key: pdp.specifications.classification,
                    value: dict.products.catalog.categoryLabels[product.category],
                  },
                  ...(product.composition
                    ? [{ key: pdp.specifications.composition, value: product.composition }]
                    : []),
                ]}
                notice={dict.researchUse.label}
              >
                {section}
              </RibbonBench>
            );
          })()}
        </Container>
      </Section>

      {/* Impact — the flagship's world, once more, between trust and reference.
          GLOW's is its composition, separated by its light (`product/glow`). */}
      {world && constituents && glowStill ? (
        <Section
          mode="impact"
          world={world.id}
          atmosphere
          padded={false}
          aria-labelledby="interlude-title"
        >
          <GlowComposition
            titleId="interlude-title"
            eyebrow={pdp.shop.composition}
            title={worldStatement}
            vial={{ ...glowStill, alt: product.name }}
            parts={constituents.map((part) => {
              return {
                ...part,
                // The composition's own spelling, as the line under the name.
                label: part.name,
                product: part.slug ? path(routes.product(part.slug)) : null,
                record: part.slug && hasRecord(part.slug) ? path(routes.compound(part.slug)) : null,
              };
            })}
            productLabel={pdp.shop.view}
            recordLabel={pdp.research.record}
            totalLabel={`${product.name} · ${soleStrength} mg`}
          />
        </Section>
      ) : world ? (
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
          data-area={areaContext}
          className={ground("overview")}
        >
          <Container width="full">
            {/*
             * THE PROFILE'S HEAD ON ITS AREA'S WASH — the standard product
             * page's one Level-2 colour moment (Research colour completion).
             * It is the same record whose full page opens on the same wash,
             * so the colour travels with "Registro científico completo".
             * Full width, from the section's top to under the header.
             */}
            <div
              className={
                areaContext
                  ? "bg-(--area-wash) pb-(--space-md) shadow-[0_0_0_100vmax_var(--area-wash)] [--ink-muted:var(--ink-secondary)] [clip-path:inset(calc(-1*var(--section-pad-record))_-100vmax_0)]"
                  : undefined
              }
            >
              <SectionHeader
                scale="record"
                index={sectionIndex("overview")}
                label={`${pdp.overview.label} // ${pdp.overview.qualifier}`}
                title={pdp.overview.title}
                id="overview-title"
                lede={overview.summary ?? undefined}
                action={
                  /* The profile here is the product page's cut of the record;
                   the record is the whole of it, numbered and indexed. */
                  hasRecord(product.slug) ? (
                    <TextLink
                      href={path(routes.compound(product.slug))}
                      transitionTypes={[RECORD_NAVIGATION]}
                    >
                      {pdp.research.record}
                    </TextLink>
                  ) : (
                    <TextLink href={path(routes.research)}>{pdp.research.hub}</TextLink>
                  )
                }
              />
            </div>
            {/* Claim ↔ source: a marker draws its leader to the rail, a source
                marks the sentences that cite it (`SourceTether`). The profile
                is the record's first magnification: "Registro científico
                completo" opens this frame out into the record's own head. */}
            <TermLens>
              <ViewTransition
                name={hasRecord(product.slug) ? recordNames(product.slug).frame : undefined}
                share="vt-record-frame"
                default="none"
              >
                <SourceTether className="grid gap-(--space-xl) lg:grid-cols-12">
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
                          {statements.map((statement) => {
                            const cites = statement.references.map((r) => citationIndex(r.id));
                            return (
                              <Body key={statement.id} data-cites={cites.join(" ")}>
                                {termed(statement.text)}{" "}
                                <CitationMarks
                                  citations={cites}
                                  anchor={refAnchor}
                                  label={dict.knowledge.record.citation}
                                />
                              </Body>
                            );
                          })}
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
                    <CitationRail
                      references={references}
                      copy={dict.citations}
                      anchorPrefix="ref-"
                    />
                    {areaRoutes}
                  </div>
                </SourceTether>
              </ViewTransition>
              {/* The definitions the profile's marked words lift (TermLens). */}
              <div hidden>
                {recordTerms.map((term) => (
                  <div key={term.id} data-def={term.id}>
                    <p data-def-kind="">{dict.knowledge.glossary.categories[term.category]}</p>
                    <p data-def-term="">
                      {term.term[locale]}
                      {term.abbreviation ? ` · ${term.abbreviation}` : ""}
                    </p>
                    <p data-def-text="">{term.definition[locale]}</p>
                    <a href={path(routes.glossaryTerm(term.id))} data-def-link="">
                      {dict.knowledge.record.termOpen} <span aria-hidden="true">→</span>
                    </a>
                  </div>
                ))}
              </div>
            </TermLens>
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
          data-area={areaContext}
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
        data-area={areaContext}
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
            guides={{
              coa: {
                label: dict.quality.record.guides.coa,
                href: path(routes.article("como-leer-un-certificado-de-analisis")),
              },
              model: {
                label: dict.quality.record.guides.model,
                href: `${path(routes.research)}#calidad`,
              },
            }}
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

      {/* IN THE CATALOGUE — its area, A to Z, then the laboratory materials.
          Listed, never paired with a procedure (see the dictionary note). */}
      {directory.length > 0 ? (
        <Section
          mode="quiet"
          rhythm="record"
          aria-labelledby="related-title"
          data-area={areaContext}
          className={ground("related")}
        >
          <Container width="full">
            <SectionHeader
              scale="record"
              index={sectionIndex("related")}
              label={`${pdp.related.label} // ${pdp.related.qualifier}`}
              title={pdp.related.title}
              id="related-title"
              lede={pdp.related.lede}
              action={<TextLink href={path(routes.products)}>{pdp.related.action}</TextLink>}
            />
            <CatalogueDirectory
              groups={directory}
              copy={{ current: pdp.related.current, count: pdp.related.count }}
            />
          </Container>
        </Section>
      ) : null}
    </PageTransition>
  );
}
