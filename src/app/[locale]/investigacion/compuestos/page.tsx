import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { CompoundLibrary, KnowledgeHead, RouteList } from "@/components/research";
import { routes } from "@/config/routes";
import { compendiumStats } from "@/content/compendium";
import { publicAreas } from "@/data/discovery";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { count, fill, lineGroups, libraryEntries } from "@/server/knowledge";

import styles from "./page.module.css";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const title = dict.knowledge.compendium.title;
  const description = fill(dict.meta.descriptions.compendium, {
    count: compendiumStats().compounds,
  });
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.compendium, title, description }),
    alternates: alternates(locale, routes.compendium),
  };
}

/**
 * THE COMPENDIUM — every compound NEOGEN sells, read as a scientific index.
 *
 * WHY A SEPARATE PAGE FROM THE CATALOGUE. `/productos` is a shop: objects,
 * prices, presentations, the bag. This is the same set of compounds for a
 * reader who wants to know what they ARE — area, research lines, how much of
 * a sourced record exists — before, or instead of, buying. Both read the same
 * catalogue registry, so the two can never disagree about what exists; they
 * differ only in what they put first.
 *
 * The head carries the legend for the one symbol this page introduces (the
 * record-depth marks) and the counts, so a reader knows the size of the
 * archive before the first row.
 */
export default async function CompendiumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.compendium;
  const counts = dict.knowledge.counts;
  const hub = dict.research.hub;
  const path = (route: string) => localizePath(route, locale);
  const stats = compendiumStats();

  return (
    <>
      <Section mode="quiet" aria-labelledby="compendium-title">
        <Container width="full">
          <KnowledgeHead
            crumbs={[{ label: dict.knowledge.crumbs.research, href: path(routes.research) }]}
            crumbsLabel={dict.knowledge.crumbs.research}
            eyebrow={`${copy.label} // ${copy.qualifier}`}
            title={copy.title}
            titleId="compendium-title"
            lede={copy.lede}
            meta={[
              count(stats.compounds, counts.compounds, counts.compound),
              `${stats.records} ${hub.stats.records.toLowerCase()}`,
              count(stats.references, counts.references, counts.reference),
            ]}
            aside={
              <div className={styles.legend}>
                <p className={styles.legendLabel}>{copy.legend.label}</p>
                <ol className={styles.legendMarks}>
                  {(["mechanism", "research", "notes", "references"] as const).map((key, i) => (
                    <li key={key}>
                      <span className={styles.legendMark} data-position={i} aria-hidden="true">
                        {[0, 1, 2, 3].map((n) => (
                          <span key={n} data-on={n === i ? "true" : undefined} />
                        ))}
                      </span>
                      {copy.depth[key]}
                    </li>
                  ))}
                </ol>
                <p className={styles.legendNote}>{copy.legend.depth}</p>
                <p className={styles.legendNote}>{copy.legend.none}</p>
              </div>
            }
          />

          <div className={styles.library}>
            <CompoundLibrary
              entries={libraryEntries(locale, dict)}
              areas={publicAreas().map((area) => ({
                id: area.id,
                label: dict.discovery.areas[area.id].short,
              }))}
              lineGroups={lineGroups(locale)}
              copy={{
                controls: copy.controls,
                columns: copy.columns,
                depth: copy.depth,
                preview: copy.preview,
              }}
            />
          </div>
        </Container>
      </Section>

      <Section mode="quiet" className="bg-(--surface-raised)" aria-labelledby="compendium-next">
        <Container width="full">
          <div className={styles.next}>
            <h2 id="compendium-next" className={styles.nextTitle}>
              {hub.paths.title}
            </h2>
            <RouteList
              routes={[
                {
                  href: path(routes.lines),
                  title: hub.paths.explore.lines.title,
                  body: fill(hub.paths.explore.lines.body, { n: stats.lines }),
                },
                {
                  href: path(routes.glossary),
                  title: hub.paths.begin.glossary.title,
                  body: fill(hub.paths.begin.glossary.body, { n: stats.terms }),
                },
                {
                  href: path(routes.start),
                  title: hub.paths.begin.start.title,
                  body: hub.paths.begin.start.body,
                },
              ]}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
