import { siteConfig } from "@/config/site";
import { routes } from "@/config/routes";

import type { MetadataRoute } from "next";

/**
 * Generated from the route table rather than hand-written, so a route cannot be
 * added without this being considered.
 *
 * Checkout is disallowed: it already declares `noindex` in its own metadata,
 * and the two must agree. Transactional surfaces do not belong in an index —
 * least of all one with nothing to transact.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: siteConfig.locales.map((locale) => `/${locale}${routes.checkout}`),
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
