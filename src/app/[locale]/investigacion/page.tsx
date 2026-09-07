import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Container, Section } from "@/components/primitives";
import { Body, Heading } from "@/components/typography";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.research.title };
}

/**
 * RESEARCH HUB — skeleton.
 *
 * Research is core brand infrastructure, not a dead blog. The card system,
 * article template and product↔research relationships come in a later phase.
 * No articles are authored here and no claims are generated to fill space.
 */
export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Section mode="quiet" aria-labelledby="research-title">
      <Container>
        <Heading level={1} id="research-title" size="4xl">
          {dict.research.title}
        </Heading>
        <Body className="mt-(--space-sm) max-w-(--container-prose)">{dict.research.intro}</Body>
        <Body className="mt-(--space-lg)" tone="muted">
          {dict.research.empty}
        </Body>
      </Container>
    </Section>
  );
}
