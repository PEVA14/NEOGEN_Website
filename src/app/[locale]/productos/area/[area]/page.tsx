import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Grid, Section } from "@/components/primitives";
import { CitationRail } from "@/components/research";
import { Body, Mono } from "@/components/typography";
import { ProductCard, TextLink } from "@/components/ui";
import { referencesForArea } from "@/content/research";
import { routes } from "@/config/routes";
import { presentationRange } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { areaBySlug, productsInArea, publicAreas } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import type { Metadata } from "next";

/**
 * A DISCOVERY AREA — one commercial view of the catalogue.
 *
 * ONLY AREAS WITH SOMETHING TO SHOW EXIST AS ROUTES.
 * --------------------------------------------------
 * `generateStaticParams` reads `publicAreas()`, which counts only products
 * whose assignment is owner-confirmed or source-backed. Draft assignments are
 * filtered out one level down, in `publicAreasFor`, so they cannot reach this
 * page even by accident.
 *
 * That means TODAY THIS ROUTE PRERENDERS NOTHING: every assignment in
 * `data/discovery/assignments.ts` is still a draft awaiting review. An area
 * URL is a real 404 until its products are approved — the same posture the
 * research article route takes, and for the same reason. An empty category
 * page is worse than an absent one: it advertises a section of the shop that
 * has nothing in it.
 *
 * `dynamicParams = false` makes that a true HTTP 404 rather than a soft one.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}): Promise<Metadata> {
  const { locale, area: areaSlug } = await params;
  if (!isLocale(locale)) return {};

  const area = areaBySlug(areaSlug);
  if (!area) return {};

  const dict = await getDictionary(locale);
  const copy = dict.discovery.areas[area.id];

  return {
    title: copy.title,
    description: copy.body,
    ...socialMetadata({
      locale,
      path: routes.area(area.slug),
      title: copy.title,
      description: copy.body,
    }),
    alternates: alternates(locale, routes.area(area.slug)),
  };
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return publicAreas().map((area) => ({ area: area.slug }));
}

export default async function AreaPage({
  params,
}: {
  params: Promise<{ locale: string; area: string }>;
}) {
  const { locale, area: areaSlug } = await params;
  if (!isLocale(locale)) notFound();

  const area = areaBySlug(areaSlug);
  if (!area) notFound();

  const items = productsInArea(area.id);
  if (items.length === 0) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.discovery.areas[area.id];
  const path = (to: string) => localizePath(to, locale);

  const prices = await getPrices(items.flatMap((p) => p.variants.map((v) => v.id)));
  const from = (slug: string) => {
    const product = items.find((p) => p.slug === slug);
    const cheapest = product?.variants
      .map((v) => prices.get(v.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.amount - b.amount)[0];
    return cheapest ? formatPrice(cheapest, localeTags[locale]) : null;
  };

  /*
   * RESEARCH IN THIS AREA — derived, never tagged.
   *
   * The references are those cited by the public overviews of this area's
   * products. Area copy stays a merchandising label; it never acquires a
   * bibliography that nothing on a product page supports.
   */
  const references = referencesForArea(area.id);

  /*
   * RELATED AREAS — by shared compounds, a fact of the approved assignments.
   * Ranked by overlap, so the area a reader is most likely to continue into
   * comes first, and an area sharing nothing is not listed.
   */
  const slugs = new Set(items.map((p) => p.slug));
  const related = publicAreas()
    .filter((other) => other.id !== area.id)
    .map((other) => ({
      area: other,
      shared: productsInArea(other.id).filter((p) => slugs.has(p.slug)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 4);

  return (
    <>
      <Section mode="quiet" aria-labelledby="area-title">
        <Container width="full">
          <SectionHeader
            index={String(area.order).padStart(2, "0")}
            label={`${dict.discovery.label} // ${copy.title}`}
            title={copy.title}
            id="area-title"
            lede={copy.body}
            as="h1"
            action={<TextLink href={path(routes.products)}>{dict.discovery.all}</TextLink>}
          />

          <Mono size="2xs" className="mb-(--space-lg) block text-(--ink-muted)">
            {dict.discovery.countLabel} — {String(items.length).padStart(2, "0")}
          </Mono>

          <Grid className="items-start">
            {items.map((product, position) => (
              <div key={product.id} className="col-span-12 md:col-span-6 lg:col-span-4">
                <ProductCard
                  slug={product.slug}
                  world={product.world}
                  worldLabel={
                    product.world ? dict.home.products.worldLabels[product.world] : undefined
                  }
                  /* Every product here is in this area by definition, so the
                   plate takes this area's tone and the eyebrow says something
                   the heading does not: the factual catalogue bucket. */
                  areaId={area.id}
                  eyebrow={dict.products.catalog.categoryLabels[product.category]}
                  name={product.name}
                  subtitle={product.subtitle}
                  href={path(routes.product(product.slug))}
                  price={from(product.slug)}
                  priceFrom={dict.products.catalog.from}
                  presentationRange={presentationRange(product)}
                  presentations={product.variants.length}
                  index={String(position + 1).padStart(2, "0")}
                  ctaLabel={dict.home.products.cta}
                  headingLevel={2}
                />
              </div>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section mode="quiet" aria-labelledby="area-research-title" className="bg-(--surface-raised)">
        <Container width="full">
          <SectionHeader
            index="02"
            label={`${dict.discovery.research.label} // ${dict.discovery.research.qualifier}`}
            title={dict.discovery.research.title}
            id="area-research-title"
            lede={references.length > 0 ? dict.discovery.research.lede : undefined}
            action={
              <TextLink href={`${path(routes.research)}#indice`}>
                {dict.discovery.research.hub}
              </TextLink>
            }
          />
          {references.length > 0 ? (
            <CitationRail references={references} copy={dict.citations} />
          ) : (
            <Body tone="muted" className="max-w-(--container-prose)">
              {dict.discovery.research.empty}
            </Body>
          )}
        </Container>
      </Section>

      {related.length > 0 ? (
        <Section mode="quiet" aria-labelledby="related-areas-title">
          <Container width="full">
            <SectionHeader
              index="03"
              label={`${dict.discovery.related.label} // ${dict.discovery.related.qualifier}`}
              title={dict.discovery.related.title}
              id="related-areas-title"
            />
            <ul className="grid gap-(--space-md) md:grid-cols-2">
              {related.map(({ area: other, shared }) => (
                <li
                  key={other.id}
                  data-area={other.id}
                  className="border-t border-(--area-line) pt-(--space-sm)"
                >
                  <TextLink href={path(routes.area(other.slug))}>
                    {dict.discovery.areas[other.id].title}
                  </TextLink>
                  <Mono size="2xs" className="mt-(--space-3xs) block text-(--ink-muted) uppercase">
                    {dict.discovery.related.shared.replace("{n}", String(shared))}
                  </Mono>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
