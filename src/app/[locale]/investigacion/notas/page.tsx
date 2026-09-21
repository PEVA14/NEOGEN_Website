import { notFound } from "next/navigation";

import { ResearchUseNotice } from "@/components/commerce";
import { NoteIndex } from "@/components/editorial";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { publicArticles } from "@/content/editorial";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

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
  const description = dict.meta.descriptions.articles;
  const title = `${dict.editorial.title} — ${dict.editorial.eyebrow}`;
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.articles, title, description }),
    alternates: alternates(locale, routes.articles),
  };
}

/**
 * THE NOTES INDEX.
 *
 * A section of NEOGEN Research rather than a blog at the root: the notes sit
 * beside the reference index and the documentation explorer because they are
 * the same kind of thing — material to read, held to the same evidence rules.
 *
 * The page renders whatever `publicArticles()` returns, in date order. There
 * is no pagination and no tag cloud: four notes do not need either, and
 * building them now would be building for an editorial operation that does
 * not exist yet. `articlesByTopic` is there for when it does.
 */
export default async function NotesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.editorial;
  const path = (route: string) => localizePath(route, locale);
  const notes = publicArticles();

  /* The index exists because notes exist. If the registry ever empties, the
     route should stop existing rather than render a headline over nothing. */
  if (notes.length === 0) notFound();

  return (
    <Section mode="quiet" aria-labelledby="notes-title">
      <Container width="full">
        <SectionHeader
          index="01"
          label={copy.eyebrow}
          title={copy.title}
          lede={copy.lede}
          id="notes-title"
          as="h1"
          action={<TextLink href={path(routes.research)}>{dict.nav.research}</TextLink>}
        />

        <div className={styles.index}>
          <NoteIndex
            notes={notes.map((note) => ({
              slug: note.slug,
              href: path(routes.article(note.slug)),
              topic: copy.topics[note.topic],
              title: note.title[locale],
              summary: note.summary[locale],
              publishedOn: note.publishedOn,
            }))}
            localeTag={localeTags[locale]}
          />
        </div>

        <div className={styles.foot}>
          <ResearchUseNotice
            copy={dict.researchUse}
            href={path(routes.article("uso-exclusivo-en-investigacion"))}
          />
          <nav className={styles.onward} aria-label={dict.peptides.title}>
            <TextLink href={path(routes.peptides)}>{dict.peptides.title}</TextLink>
            <TextLink href={path(routes.faq)}>{dict.faq.title}</TextLink>
            <TextLink href={path(routes.products)}>{dict.nav.products}</TextLink>
          </nav>
        </div>
      </Container>
    </Section>
  );
}
