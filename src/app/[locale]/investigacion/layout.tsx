import { notFound } from "next/navigation";

import { ResearchNav } from "@/components/research/ResearchNav";
import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";

/**
 * EVERY RESEARCH PAGE OPENS ON RESEARCH'S OWN NAVIGATION (architecture pass,
 * 2026-10-05). A reader can arrive anywhere — a record from a search engine,
 * a line, the references — and still see where they are and where they can
 * go, without the overview having taught them first (`ResearchNav`).
 */
export default async function ResearchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const nav = dict.research.nav;
  const path = (to: string) => localizePath(to, locale);
  const items = nav.items;

  /* The deeper layer, in the order a reader goes further: what is studied,
     where it comes from, how quality is documented, then the references
     a reader keeps open beside a record. */
  const deeper = [
    { key: "lines", href: path(routes.lines), ...items.lines },
    { key: "map", href: `${path(routes.research)}#mapa`, ...items.map },
    { key: "references", href: path(routes.researchReferences), ...items.references },
    { key: "glossary", href: path(routes.glossary), ...items.glossary },
    { key: "quality", href: `${path(routes.research)}#calidad`, ...items.quality },
    { key: "handling", href: path(routes.handling), ...items.handling },
    { key: "guides", href: path(routes.articles), ...items.guides },
  ];

  return (
    <>
      <ResearchNav
        copy={nav}
        home={path(routes.research)}
        compounds={path(routes.compendium)}
        start={path(routes.start)}
        deeper={deeper}
        deepPaths={[
          path(routes.lines),
          path(routes.researchReferences),
          path(routes.glossary),
          path(routes.handling),
          path(routes.articles),
        ]}
        returnPaths={[
          path(routes.lines),
          path(routes.researchReferences),
          path(routes.glossary),
          path(routes.handling),
          path(routes.articles),
          path(routes.start),
        ]}
        searchAction={path(routes.compendium)}
      />
      {children}
    </>
  );
}
