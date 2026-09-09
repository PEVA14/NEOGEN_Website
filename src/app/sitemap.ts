import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { publishedProducts } from "@/data/catalog";
import { localeTags } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

import type { MetadataRoute } from "next";

/**
 * Every indexable page, in both locales, cross-referenced by hreflang.
 *
 * Built from the SAME sources the navigation uses — the route table and the
 * world config — so it cannot drift from what the site actually serves. Product
 * pages come from `publishedProducts`, the same list `generateStaticParams`
 * uses, so the sitemap cannot list a URL the site does not serve.
 *
 * Checkout is excluded, matching its `noindex` and the robots rule. No
 * `lastModified`: nothing here has a real modification date, and inventing one
 * would be telling crawlers something we do not know.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    routes.home,
    routes.products,
    routes.research,
    routes.cart,
    ...publishedProducts.map((product) => routes.product(product.slug)),
  ];

  return paths.flatMap((path) =>
    siteConfig.locales.map((locale) => ({
      url: `${siteConfig.url}${localizePath(path, locale)}`,
      alternates: {
        languages: Object.fromEntries(
          siteConfig.locales.map((l) => [
            localeTags[l],
            `${siteConfig.url}${localizePath(path, l)}`,
          ]),
        ),
      },
    })),
  );
}
