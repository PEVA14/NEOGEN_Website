import { publishedProducts } from "@/data/catalog";
import { isLocale, locales } from "@/i18n/config";
import { quickRecord } from "@/server/quickRecord";

/**
 * THE QUICK RECORD, AS STATIC JSON — one file per compound and locale.
 *
 * The compendium drawer fetches this when a compound is opened, so the index
 * page ships only what its rows need and a reader who never opens a record
 * downloads none. Built at build time from the same registries as the full
 * record (`server/quickRecord.ts`); nothing here is written by hand, and an
 * unknown slug or locale is a real 404 (`dynamicParams = false`).
 *
 * Everything in it is already public on the record and product pages.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => publishedProducts.map((p) => ({ locale, slug: p.slug })));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
): Promise<Response> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return Response.json({ error: "not_found" }, { status: 404 });
  const data = await quickRecord(slug, locale);
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(data);
}
