import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { Body, Heading } from "@/components/typography";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.products.title };
}

/**
 * PRODUCT DISCOVERY — skeleton.
 *
 * No product data exists yet and none is invented. Filtering, search and sort
 * are out of Phase 1 scope.
 */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Section mode="quiet" aria-labelledby="products-title">
      <Container>
        <Heading level={1} id="products-title" size="4xl">
          {dict.products.title}
        </Heading>
        <Body className="mt-(--space-sm)">{dict.products.intro}</Body>
        <Body className="mt-(--space-lg)" tone="muted">
          {dict.products.empty}
        </Body>
      </Container>
    </Section>
  );
}
