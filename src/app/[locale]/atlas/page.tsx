import { notFound } from "next/navigation";

import { AtlasExperience, type AtlasAreaOption, type AtlasCopy } from "@/components/atlas";
import { routes } from "@/config/routes";
import { isPublishable } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { productsInArea, publicAreas } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const title = `${dict.atlas.name} · ${dict.atlas.title}`;
  const description = dict.atlas.metaDescription;
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.atlas, title, description }),
    alternates: alternates(locale, routes.atlas),
  };
}

/**
 * NEOGEN ATLAS — a personal research map of the catalogue.
 *
 * The page resolves only what the first step needs — each public area's name,
 * framing, compound count and entry price — and hands it to one client island
 * with the copy. Retrieval, generation and assembly all happen behind
 * `POST /api/atlas`, so no catalogue, price map or model detail reaches the
 * browser here.
 */
export default async function AtlasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const tag = localeTags[locale];
  const areas = publicAreas();
  const productsByArea = new Map(
    areas.map((area) => [area.id, productsInArea(area.id).filter(isPublishable)]),
  );
  const prices = await getPrices(
    [...productsByArea.values()].flat().flatMap((p) => p.variants.map((v) => v.id)),
  );

  const options: AtlasAreaOption[] = areas.map((area) => {
    const products = productsByArea.get(area.id) ?? [];
    const amounts = products
      .flatMap((p) => p.variants.map((v) => prices.get(v.id)?.amount))
      .filter((amount): amount is number => typeof amount === "number");
    const copy = dict.discovery.areas[area.id];
    return {
      id: area.id,
      label: copy.short,
      framing: copy.title,
      body: copy.body,
      compounds: products.length,
      entryPrice:
        amounts.length > 0
          ? formatPrice({ amount: Math.min(...amounts), currency: "MXN" }, tag)
          : null,
    };
  });

  /* The composer's templates are server-side only; the browser never needs them. */
  const copy = Object.fromEntries(
    Object.entries(dict.atlas).filter(([key]) => key !== "compose"),
  ) as AtlasCopy;

  return <AtlasExperience locale={locale} areas={options} copy={copy} />;
}
