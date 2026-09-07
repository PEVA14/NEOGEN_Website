import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { Heading, Mono, Prose } from "@/components/typography";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

/**
 * ARTICLE TEMPLATE — structural skeleton.
 *
 * Establishes the editorial reading measure (`Prose`, capped at
 * --container-prose) so long-form typography is first-class from the start.
 *
 * TODO(research-phase): choose the authoring format (MDX vs structured blocks)
 * before any content is written. `Article["body"]` is typed `never[]` until then.
 */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Section mode="quiet" aria-labelledby="article-title">
      <Container width="prose">
        <Heading level={1} id="article-title" size="3xl">
          {dict.research.articleTitle}
        </Heading>
        <Mono size="xs" tone="muted" as="p" className="mt-(--space-2xs)">
          {slug}
        </Mono>
        <Prose className="mt-(--space-lg)">
          <p>{dict.research.empty}</p>
        </Prose>
      </Container>
    </Section>
  );
}
