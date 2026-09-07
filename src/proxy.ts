import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, locales } from "@/i18n/config";

/**
 * Locale routing.
 *
 * Next 16 renamed the `middleware.ts` convention to `proxy.ts`; this is the
 * current convention, not legacy middleware.
 *
 * Every route is locale-prefixed. A request without a prefix is redirected to
 * the best supported match from `Accept-Language`, defaulting to Spanish since
 * Mexico is the initial market.
 */

function negotiateLocale(header: string | null) {
  if (!header) return defaultLocale;

  const preferences = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        tag: tag.trim().toLowerCase(),
        quality: q ? Number.parseFloat(q.split("=")[1]) : 1,
      };
    })
    .filter((p) => Number.isFinite(p.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of preferences) {
    // Match the primary subtag, so "en-GB" resolves to "en".
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) return NextResponse.next();

  const locale = negotiateLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Skip Next internals, the API surface and anything with a file extension
   * (models, images, fonts, robots.txt …) so static assets are never rewritten.
   */
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
