import Link from "next/link";
import { notFound } from "next/navigation";

import { ResearchUseNotice } from "@/components/commerce";
import { ArticleBody, NoteIndex } from "@/components/editorial";
import { Container, Section } from "@/components/primitives";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { publicArticle, publicArticles, relatedArticles } from "@/content/editorial";
import { getProduct } from "@/data/catalog";
import { getArea } from "@/data/discovery";
import { isLocale, localeTags, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import styles from "./page.module.css";

import type { Metadata } from "next";

/**
 * Only approved notes exist as URLs.
 *
 * `dynamicParams = false` is the mechanism this codebase already relies on for
 * the research sub-pages: a slug that is not generated is a REAL 404, not a
 * not-found body served with 200. A draft note is therefore not a hidden page
 * — it is not a page.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    publicArticles().map((article) => ({ locale, slug: article.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = publicArticle(slug);
  if (!article) return {};
  const dict = await getDictionary(locale);
  const title = article.title[locale];
  const description = article.summary[locale];
  return {
    title,
    description,
    ...socialMetadata({
      locale,
      path: routes.article(slug),
      title,
      description,
      article: { publishedTime: article.publishedOn, modifiedTime: article.updatedOn },
    }),
    alternates: alternates(locale, routes.article(slug)),
    authors: [{ name: dict.meta.siteName }],
  };
}

/**
 * ONE NOTE.
 *
 * The page is a document: a title, a dateline, the body, then the ways on —
 * related compounds, related areas, and the next notes to read. The internal
 * links are resolved against the CATALOGUE, so a note cannot point at a
 * product that does not exist: `getProduct` returning nothing drops the link
 * rather than shipping a dead one.
 *
 * WHY THE RESEARCH-USE LINE IS ON AN EDUCATIONAL PAGE AT ALL. Because this is
 * where a first-time reader arrives from a search engine, and it is the first
 * thing they should learn about what they have found. It sits at the foot, in
 * the quiet register, where it reads as a statement of what NEOGEN sells
 * rather than as a warning attached to the reading.
 */
export default async function NotePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const article = publicArticle(slug);
  if (!article) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.editorial;
  const tag = localeTags[locale];
  const path = (route: string) => localizePath(route, locale);
  /* UTC: `publishedOn` is a calendar date, not an instant. See `NoteIndex`. */
  const format = new Intl.DateTimeFormat(tag, { dateStyle: "long", timeZone: "UTC" });

  const products = article.related.products
    .map((productSlug) => getProduct(productSlug))
    .filter((product) => product !== undefined);
  const areas = article.related.areas
    .map((areaId) => getArea(areaId))
    .filter((area) => area !== undefined);
  const next = relatedArticles(slug);

  /*
   * Article structured data, built from the note's own record. `headline`,
   * the dates and the publisher are all facts this page displays; nothing is
   * asserted to a crawler that a reader cannot see.
   */
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title[locale],
    description: article.summary[locale],
    datePublished: article.publishedOn,
    ...(article.updatedOn ? { dateModified: article.updatedOn } : {}),
    inLanguage: tag,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
    mainEntityOfPage: `${siteConfig.url}${path(routes.article(slug))}`,
  };

  return (
    <>
      <Section mode="quiet" aria-labelledby="note-title">
        <Container width="full">
          <article className={styles.note}>
            <header className={styles.head}>
              <div className={styles.meta}>
                <Mono size="2xs" className={styles.topic}>
                  {copy.topics[article.topic]}
                </Mono>
                <Mono size="2xs" className={styles.date}>
                  {copy.published}{" "}
                  <time dateTime={article.publishedOn}>
                    {format.format(new Date(article.publishedOn))}
                  </time>
                  {article.updatedOn ? (
                    <>
                      {" · "}
                      {copy.updated}{" "}
                      <time dateTime={article.updatedOn}>
                        {format.format(new Date(article.updatedOn))}
                      </time>
                    </>
                  ) : null}
                </Mono>
              </div>

              <h1 id="note-title" className={styles.title}>
                {article.title[locale]}
              </h1>

              <Body size="lg" className={styles.summary}>
                {article.summary[locale]}
              </Body>
            </header>

            <ArticleBody blocks={article.body} locale={locale} />

            <footer className={styles.foot}>
              <Mono size="2xs" className={styles.readingNote}>
                {copy.readingNote}
              </Mono>

              {products.length > 0 || areas.length > 0 ? (
                <div className={styles.related}>
                  {products.length > 0 ? (
                    <nav className={styles.relatedGroup} aria-label={copy.relatedProducts}>
                      <Mono size="2xs" className={styles.relatedLabel}>
                        {copy.relatedProducts}
                      </Mono>
                      <ul className={styles.relatedList}>
                        {products.map((product) => (
                          <li key={product.slug}>
                            <Link
                              href={path(routes.product(product.slug))}
                              className={styles.relatedLink}
                            >
                              {product.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  ) : null}

                  {areas.length > 0 ? (
                    <nav className={styles.relatedGroup} aria-label={copy.relatedAreas}>
                      <Mono size="2xs" className={styles.relatedLabel}>
                        {copy.relatedAreas}
                      </Mono>
                      <ul className={styles.relatedList}>
                        {areas.map((area) => (
                          <li key={area.id}>
                            <Link
                              href={path(routes.area(area.slug))}
                              className={styles.relatedLink}
                            >
                              {dict.discovery.areas[area.id].title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  ) : null}
                </div>
              ) : null}

              <ResearchUseNotice
                copy={dict.researchUse}
                href={
                  slug === "uso-exclusivo-en-investigacion"
                    ? undefined
                    : path(routes.article("uso-exclusivo-en-investigacion"))
                }
              />
            </footer>
          </article>

          {next.length > 0 ? (
            <section className={styles.next} aria-label={copy.readNext}>
              <Mono size="2xs" className={styles.nextLabel}>
                {copy.readNext}
              </Mono>
              <NoteIndex
                notes={next.map((note) => ({
                  slug: note.slug,
                  href: path(routes.article(note.slug)),
                  topic: copy.topics[note.topic],
                  title: note.title[locale],
                  summary: note.summary[locale],
                  publishedOn: note.publishedOn,
                }))}
                localeTag={tag}
                ordered={false}
              />
              <div className={styles.back}>
                <TextLink href={path(routes.articles)}>{copy.backToIndex}</TextLink>
              </div>
            </section>
          ) : null}
        </Container>
      </Section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}
