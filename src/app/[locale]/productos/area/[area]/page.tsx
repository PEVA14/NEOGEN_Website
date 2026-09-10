import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Grid, Section } from "@/components/primitives";
import { Mono } from "@/components/typography";
import { ProductCard, TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
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

  return (
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
          {items.map((product) => (
            <div key={product.id} className="col-span-12 md:col-span-6 lg:col-span-4">
              <ProductCard
                slug={product.slug}
                world={product.world}
                worldLabel={
                  product.world ? dict.home.products.worldLabels[product.world] : undefined
                }
                eyebrow={dict.products.catalog.categoryLabels[product.category]}
                name={product.name}
                subtitle={product.subtitle}
                href={path(routes.product(product.slug))}
                price={from(product.slug)}
                ctaLabel={dict.home.products.cta}
                headingLevel={2}
              />
            </div>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
