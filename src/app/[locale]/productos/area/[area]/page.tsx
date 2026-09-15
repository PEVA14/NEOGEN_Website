import { notFound } from "next/navigation";

import { routes } from "@/config/routes";
import { areaBySlug, publicAreas } from "@/data/discovery";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import { renderAreaPage } from "./area-page";

import type { Metadata } from "next";

/**
 * A DISCOVERY AREA — category page, editorial landing, research index and
 * shopping surface, in that order of reading and never at commerce's expense.
 *
 * ONLY AREAS WITH SOMETHING TO SHOW EXIST AS ROUTES.
 * --------------------------------------------------
 * `generateStaticParams` reads `publicAreas()`, which counts only products
 * whose assignment is owner-confirmed or source-backed. The owner confirmed
 * all 91 pairs on 2026-09-10, so all eight areas prerender today; an area whose
 * products were all withdrawn stops being a route at all. `dynamicParams =
 * false` makes that a true HTTP 404 rather than a soft one.
 *
 * THE PAGE, AFTER THE APPROVED MASTHEAD (Phase 12.1):
 *
 *   entry       entry compounds — when the area is large enough (`featuredCount`)
 *   context     sourced area context — only when `publicAreaOverview` resolves
 *   compounds   every compound in the area — always; the shopping surface
 *   research    connected references — only when public references resolve
 *   evidence    public documentation records — only when the resolver accepts one
 *   related     areas sharing compounds — only when overlap exists
 *   continue    where to go next — always
 *
 * Every conditional section is decided by a function, and a section whose
 * function returns nothing has no heading, no empty state and no number: the
 * Quiet spine is numbered from what renders. Today that means Metabolism shows
 * entry → compounds → related → continue, and Hormonal shows entry → compounds
 * → continue. Context, research and evidence appear on their own the day real
 * sources and documents are approved — no page change needed.
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
  const { locale, area } = await params;
  if (!isLocale(locale)) notFound();
  return renderAreaPage({ locale, areaSlug: area });
}
