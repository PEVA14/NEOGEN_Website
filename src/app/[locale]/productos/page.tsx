import { notFound } from "next/navigation";

import { CatalogBrowser } from "@/components/catalog";
import {
  AreaShelf,
  StoreCollection,
  StoreMasthead,
  type StoreArea,
} from "@/components/catalog/Storefront";
import { HideWhileSearching } from "@/components/catalog/StoreSearch";
import { routes } from "@/config/routes";
import { worldIds } from "@/config/worlds";
import { isPublishable, products, publishedProducts } from "@/data/catalog";
import { publicAreas } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { fillTemplate, socialMetadata } from "@/lib/meta";
import { catalogCopy, catalogEntries } from "@/server/catalog";

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

/** The results region every "browse" affordance on the page lands on. */
const RESULTS_ID = "catalogo";
/** Two rows of four on a wide screen, twelve rows of two on a phone. */
const PAGE_SIZE = 24;

/**
 * THE STOREFRONT — NEOGEN's primary store, and the visual reference for V1.
 *
 * The UI stays quiet; the products get loud:
 *
 *   1. masthead   — charcoal. The count, the one search field, and the three
 *                   signature products on their world grounds, priced.
 *   2. areas      — eight ways in, each shown by a real product from it.
 *   3. collection — the whole catalogue: facets, sort, the register view, and
 *                   the storefront card, paged so a phone is a shelf rather
 *                   than a 20,000px list.
 *
 * While a search is typed the merchandising steps aside, so the results sit
 * right under the field. The whole catalogue is in the server-rendered HTML
 * (paged cards are `hidden`, not absent), so it is indexable and works before
 * hydration.
 */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const catalog = dict.products.catalog;
  const store = catalog.store;
  const areas = publicAreas();
  const path = (to: string) => localizePath(to, locale);

  const published = products.filter(isPublishable);
  const entries = await catalogEntries(published, { locale, dict });

  /* The signature products, in world order, from the same entries the grid uses. */
  const signatures = worldIds
    .map((world) => entries.find((entry) => entry.world === world))
    .filter((entry) => entry !== undefined)
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      href: entry.href,
      world: entry.world!,
      worldLabel: entry.worldLabel ?? "",
      range: entry.range,
      price: entry.price,
    }));

  /* Each area, shown by its entry product: the cheapest priced one filed there. */
  const areaShelf: StoreArea[] = areas.map((area) => {
    const inArea = entries.filter((entry) => entry.areas.includes(area.id));
    const entry = inArea
      .filter((e) => e.priceAmount !== null)
      .sort((a, b) => a.priceAmount! - b.priceAmount!)[0];
    return {
      id: area.id,
      href: path(routes.area(area.slug)),
      label: dict.discovery.areas[area.id].short,
      count: inArea.length,
      entry: entry ? { name: entry.name, range: entry.range } : null,
      price: entry?.price ?? null,
    };
  });

  const stats = fillTemplate(store.stats, {
    products: String(published.length),
    presentations: String(published.reduce((n, p) => n + p.variants.length, 0)),
    areas: String(areas.length),
  });

  return (
    <>
      <StoreMasthead
        copy={{
          eyebrow: store.eyebrow,
          title: catalog.title,
          stats,
          lede: store.lede,
          searchLabel: store.searchLabel,
          searchPlaceholder: store.searchPlaceholder,
          searchSubmit: store.searchSubmit,
          browseAll: store.browseAll,
          signatureLabel: store.signature.label,
          from: store.signature.from,
        }}
        signatures={signatures}
        resultsId={RESULTS_ID}
      />

      <HideWhileSearching>
        <AreaShelf areas={areaShelf} copy={store.areas} />
      </HideWhileSearching>

      <StoreCollection head={store.collection} resultsId={RESULTS_ID}>
        <CatalogBrowser
          products={entries}
          copy={catalogCopy(dict)}
          localeTag={localeTags[locale]}
          areaOrder={areas.map((area) => area.id)}
          search={false}
          pageSize={PAGE_SIZE}
          moreCopy={store.more}
          variant="store"
          cardHeadingLevel={3}
        />
      </StoreCollection>
    </>
  );
}
