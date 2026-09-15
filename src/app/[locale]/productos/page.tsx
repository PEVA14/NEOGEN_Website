import { notFound } from "next/navigation";

import { CatalogBrowser } from "@/components/catalog";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { AreaBoard } from "@/components/ui";
import { routes } from "@/config/routes";
import { isPublishable, products, publishedProducts } from "@/data/catalog";
import { publicAreas, publicAreasFor } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { catalogCopy, catalogEntries } from "@/server/catalog";
import { fillTemplate, socialMetadata } from "@/lib/meta";
import { localizePath } from "@/i18n/routing";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const description = fillTemplate(dict.meta.descriptions.catalog, {
    count: String(publishedProducts.length),
  });
  return {
    title: dict.products.catalog.title,
    description,
    ...socialMetadata({
      locale,
      path: routes.products,
      title: dict.products.catalog.title,
      description,
    }),
    alternates: alternates(locale, routes.products),
  };
}

/**
 * THE CATALOGUE.
 *
 * Quiet Mode from top to bottom: this is where a reader compares compounds, so
 * it is information design, not an experience. Product identity appears only in
 * the card image areas and in the world dots.
 *
 * The page is a server component that resolves the compound set and hands it to
 * one client island for search, filtering, sorting and the view toggle. Nothing
 * about the catalogue's CONTENT depends on the client — the full set is in the
 * server-rendered HTML, so it is indexable and it works before hydration.
 */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const catalog = dict.products.catalog;
  /* Areas with approved products — the strip and the area facet read the same list. */
  const areas = publicAreas();
  const path = (to: string) => localizePath(to, locale);

  /*
   * The whole catalogue, from the product registry — not from `worlds.ts`,
   * which describes three Experience environments and knows nothing about the
   * other 82 products. Entries are built by the one server builder every
   * browser on the site uses (`server/catalog`), with prices and availability
   * fetched in one batched call.
   */
  const published = products.filter(isPublishable);
  const entries = await catalogEntries(published, { locale, dict });

  /*
   * THE AREA BOARD — eight named ways into 85 products, at the entrance.
   *
   * Counts are read from the registry, so an area that empties
   * stops claiming a number, and `publicAreas()` keeps the board out of the DOM
   * entirely if no assignment is ever approved. See `components/ui/AreaBoard`.
   */
  const areaBoard = areas.map((area) => ({
    id: area.id,
    href: path(routes.area(area.slug)),
    short: dict.discovery.areas[area.id].short,
    count: published.filter((p) => publicAreasFor(p.slug).some((a) => a.id === area.id)).length,
  }));

  return (
    <Section mode="quiet" aria-labelledby="catalog-title">
      <Container width="full">
        <SectionHeader
          index={catalog.index}
          label={`${catalog.label} // ${catalog.qualifier}`}
          title={catalog.title}
          id="catalog-title"
          lede={catalog.lede}
          as="h1"
        />

        <AreaBoard
          entries={areaBoard}
          label={dict.discovery.label}
          countLabel={dict.discovery.countLabel}
        />

        <CatalogBrowser
          products={entries}
          copy={catalogCopy(dict)}
          localeTag={localeTags[locale]}
          areaOrder={areas.map((area) => area.id)}
        />
      </Container>
    </Section>
  );
}
