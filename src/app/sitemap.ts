import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { publishedProducts } from "@/data/catalog";
import { publicPolicies } from "@/content/policies";
import { publicEvidenceIndex } from "@/domain/quality";
import { publicAreas } from "@/data/discovery";
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
 * Checkout and its six steps are excluded, matching their `noindex` — as is
 * the order confirmation, which carries a customer's address. No
 * `lastModified`: nothing here has a real modification date, and inventing one
 * would be telling crawlers something we do not know.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    routes.home,
    routes.products,
    routes.research,
    routes.cart,
    /*
     * Only areas with something to show. `publicAreas()` counts products whose
     * assignment is confirmed or sourced, so a draft-only area is absent here
     * for the same reason its route 404s — the sitemap cannot advertise a URL
     * the site does not serve.
     */
    ...publicAreas().map((area) => routes.area(area.slug)),
    ...publishedProducts.map((product) => routes.product(product.slug)),
    /*
     * Only APPROVED policies, which is none today — so nothing is added here
     * yet. Listed from the same accessor the route serves from, so the
     * sitemap cannot advertise a policy URL that 404s.
     */
    ...publicPolicies().map((policy) => routes.policy(policy.slug)),
    /* The documentation explorer exists only once a public document does. */
    ...(publicEvidenceIndex(publishedProducts).length > 0 ? [routes.qualityExplorer] : []),
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
