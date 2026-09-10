import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Grid, Section } from "@/components/primitives";
import { AddToBag } from "@/components/commerce";
import { CommercePanel, ProductPlate, ProductStage, SpecTable } from "@/components/product";
import { Body } from "@/components/typography";
import { DocumentLedger, ProductCard, TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { getWorld } from "@/config/worlds";
import { documentFile, documentKinds, productMedia } from "@/content";
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
  const materialPrice = priceFor(materials);

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
        documentationHref: `#${pdp.documentation.index}`,
        placeholder,
      }}
    >
      <AddToBag
        slug={product.slug}
        name={product.name}
        variants={product.variants.map((v) => ({
          variantId: v.id,
          presentation: formatStrength(v.strength),
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
            poster={media.poster}
            posterAlt={dict.home.reta.vialAlt}
            loadingLabel={dict.home.reta.loadingLabel}
            staticLabel={dict.home.reta.staticLabel}
            mediaLabel={pdp.inspectionLabel}
            viewerHint={pdp.viewerHint}
          >
            {commercePanel}
          </ProductStage>
        </Section>
      ) : (
        <Section mode="quiet" aria-label={product.name}>
          <Container width="full">
            <ProductPlate
              slug={product.slug}
              mediaLabel={pdp.inspectionLabel}
              meta={dict.products.catalog.categoryLabels[product.category]}
            >
              {commercePanel}
            </ProductPlate>
          </Container>
        </Section>
      )}

      {/* 02 — INFORMATION. Quiet Mode takes over here. */}
      <Section mode="quiet" aria-labelledby="spec-title">
        <Container width="full">
          <SectionHeader
            index={pdp.specifications.index}
            label={`${pdp.specifications.label} // ${pdp.specifications.qualifier}`}
            title={pdp.specifications.title}
            id="spec-title"
          />
          {/*
           * Real values where the catalogue supports them; the rows that only
           * a verified source can fill — storage, molecular mass, purity — are
           * not rendered at all rather than shown as placeholders.
           *
           * The category row is labelled CLASSIFICATION, not "Category". It is
           * a merchandising bucket — four of them across the whole catalogue —
           * and under a heading that says "Especificaciones del producto",
           * "Categoría — Péptidos" reads as a statement about what the
           * substance is. Several compounds filed under Péptidos are not
           * peptides, so the label has to say that this is where the compound
           * is filed, not what it is.
           */}
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

      {/* 03 — DOCUMENTATION. */}
      <Section
        mode="quiet"
        aria-labelledby="doc-title"
        id={pdp.documentation.index}
        className="bg-(--surface-raised)"
      >
        <Container width="full">
          <SectionHeader
            index={pdp.documentation.index}
            label={`${pdp.documentation.label} // ${pdp.documentation.qualifier}`}
            title={pdp.documentation.title}
            id="doc-title"
          />
          {/* Localized copy joined to the file registry by position — the
              dictionary's record order and `documentKinds` are the same list. */}
          <DocumentLedger
            records={pdp.documentation.records.map((record, index) => ({
              ...record,
              file: documentFile(documentKinds[index], { slug: product.slug }),
            }))}
            identifierLabel={dict.home.research.recordLabel}
            stateLabel={dict.home.research.stateLabel}
            stateValue={pdp.documentation.unavailable}
          />
        </Container>
      </Section>

      {/* 04 — RESEARCH. */}
      <Section mode="quiet" aria-labelledby="research-title">
        <Container width="full">
          <SectionHeader
            index={pdp.research.index}
            label={`${pdp.research.label} // ${pdp.research.qualifier}`}
            title={pdp.research.title}
            id="research-title"
            lede={pdp.research.lede}
            action={<TextLink href={path(routes.research)}>{pdp.research.action}</TextLink>}
          />
          <Body tone="muted">{pdp.research.empty}</Body>
        </Container>
      </Section>

      {/*
       * 05 — COMPLEMENTARY MATERIALS.
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
        <Section mode="quiet" aria-labelledby="materials-title" className="bg-(--surface-raised)">
          <Container width="full">
            <SectionHeader
              index={pdp.materials.index}
              label={`${pdp.materials.label} // ${pdp.materials.qualifier}`}
              title={pdp.materials.title}
              id="materials-title"
              action={
                <TextLink href={path(routes.area("materiales"))}>{pdp.materials.action}</TextLink>
              }
            />
            <Grid className="items-start">
              {materials.map((item) => (
                <div key={item.id} className="col-span-12 md:col-span-6 lg:col-span-4">
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
                  />
                </div>
              ))}
            </Grid>
          </Container>
        </Section>
      ) : null}

      {/* 06 — RELATED, by discovery area. */}
      {related.length > 0 ? (
        <Section mode="quiet" aria-labelledby="related-title">
          <Container width="full">
            <SectionHeader
              index={pdp.related.index}
              label={`${pdp.related.label} // ${pdp.related.qualifier}`}
              title={pdp.related.title}
              id="related-title"
              action={<TextLink href={path(routes.products)}>{pdp.related.action}</TextLink>}
            />
            <Grid className="items-start">
              {related.map((item, position) => (
                <div
                  key={item.id}
                  className={
                    "col-span-12 md:col-span-6 lg:col-span-4 " +
                    (position === 1 ? "md:mt-(--space-2xl)" : "")
                  }
                >
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
                  />
                </div>
              ))}
            </Grid>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
