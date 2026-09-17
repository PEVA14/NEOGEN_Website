import { notFound } from "next/navigation";

import { AtlasExperience, type AtlasCopy } from "@/components/atlas";
import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { atlasQuestionnaireView } from "@/server/atlas/questionnaire";

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
 * NEOGEN ATLAS — the personal advisor.
 *
 * The page resolves the QUESTIONNAIRE for this locale — its questions in the
 * visitor's language, with each registry-backed option's own facts read from
 * the registries (`server/atlas/questionnaire.ts`) — and hands it to one
 * client island with the chrome copy. The questions themselves are content:
 * `src/content/atlas/questionnaire.ts`.
 *
 * Retrieval, generation and assembly all happen behind `POST /api/atlas`, so
 * no catalogue, price map or model detail reaches the browser here.
 */
export default async function AtlasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, questionnaire] = await Promise.all([
    getDictionary(locale),
    atlasQuestionnaireView(locale),
  ]);

  /* The composer's templates are server-side only; the browser never needs them. */
  const copy = {
    ...Object.fromEntries(Object.entries(dict.atlas).filter(([key]) => key !== "compose")),
    commerce: dict.commerceUi,
  } as AtlasCopy;

  return <AtlasExperience locale={locale} questionnaire={questionnaire} copy={copy} />;
}
