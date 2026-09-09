import { notFound } from "next/navigation";

import { CatalogBrowser, type CatalogProduct } from "@/components/catalog";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { formatStrength, isPublishable, products } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
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
  return { title: dict.products.catalog.title, alternates: alternates(locale, routes.products) };
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
  const path = (to: string) => localizePath(to, locale);

  /*
   * The whole catalogue, from the product registry — not from `worlds.ts`,
   * which describes three Experience environments and knows nothing about the
   * other 83 products.
   *
   * Prices are fetched in ONE batched call rather than per card. The accessor
   * resolves locally today; when it is a network call, this shape already does
   * the right thing.
   */
  const published = products.filter(isPublishable);
  const prices = await getPrices(published.flatMap((p) => p.variants.map((v) => v.id)));

  const entries: CatalogProduct[] = published.map((product, position) => {
    // "From" price: the cheapest variant that actually has one.
    const amounts = product.variants
      .map((v) => prices.get(v.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
    const from = amounts.sort((a, b) => a.amount - b.amount)[0] ?? null;

    return {
      id: product.id,
      index: String(position + 1).padStart(2, "0"),
      name: product.name,
      category: product.category,
      categoryLabel: catalog.categoryLabels[product.category] ?? product.category,
      world: product.world,
      worldLabel: product.world ? dict.home.products.worldLabels[product.world] : undefined,
      href: path(routes.product(product.slug)),
      price: from ? formatPrice(from, localeTags[locale]) : null,
      strengths: product.variants.map((v) => formatStrength(v.strength)).join(" · "),
      ctaLabel: dict.home.products.cta,
    };
  });

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

        <CatalogBrowser
          products={entries}
          copy={{
            searchLabel: catalog.searchLabel,
            searchPlaceholder: catalog.searchPlaceholder,
            filterLabel: catalog.filterLabel,
            filterAll: catalog.filterAll,
            categoryLabels: catalog.categoryLabels,
            sortLabel: catalog.sortLabel,
            sortIndex: catalog.sortIndex,
            sortName: catalog.sortName,
            viewLabel: catalog.viewLabel,
            viewGrid: catalog.viewGrid,
            viewIndex: catalog.viewIndex,
            countLabel: catalog.countLabel,
            empty: catalog.empty,
            clear: catalog.clear,
            columns: catalog.columns,
            documentationPending: catalog.documentationPending,
            placeholder: dict.status.placeholder,
          }}
        />
      </Container>
    </Section>
  );
}
