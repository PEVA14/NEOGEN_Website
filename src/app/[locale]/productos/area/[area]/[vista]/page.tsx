import { notFound } from "next/navigation";

import { areaPreviewSources } from "@/content/preview/areaPreview";
import { areaBySlug, productsInArea, publicAreas } from "@/data/discovery";
import { isLocale } from "@/i18n/config";

import { renderAreaPage } from "../area-page";

import type { Metadata } from "next";

/**
 * AREA DESIGN PREVIEW — `/<locale>/productos/area/<slug>/vista-previa`.
 *
 * Renders the real area page with SAMPLE context, research and evidence, so
 * those sections can be reviewed before any real source or document exists.
 * See `content/preview/areaPreview` for why the fixtures are safe.
 *
 * DEVELOPMENT ONLY, GATED BY THE ROUTER. `generateStaticParams` returns the
 * preview slug in development and nothing in production, and
 * `dynamicParams = false` turns an ungenerated slug into a real 404 — the same
 * mechanism the documentation explorer uses, and for the same reason: a
 * `notFound()` call inside a static route bakes a soft 200 into the build.
 * `check:output` fails if any preview HTML, or either sample marker phrase,
 * appears in production output.
 */
export const dynamicParams = false;

const PREVIEW_SLUG = "vista-previa";

export async function generateStaticParams() {
  if (process.env.NODE_ENV === "production") return [];
  return [{ vista: PREVIEW_SLUG }];
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AreaPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; area: string; vista: string }>;
}) {
  const { locale, area: areaSlug, vista } = await params;
  if (process.env.NODE_ENV === "production" || vista !== PREVIEW_SLUG) notFound();
  if (!isLocale(locale)) notFound();

  const area = areaBySlug(areaSlug);
  if (!area || !publicAreas().some((a) => a.id === area.id)) notFound();

  return renderAreaPage({
    locale,
    areaSlug,
    sources: areaPreviewSources(area.id, productsInArea(area.id)),
    preview: true,
  });
}
