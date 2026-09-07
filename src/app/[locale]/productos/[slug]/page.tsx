import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { Heading, Mono } from "@/components/typography";
import { StatusNote } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

/**
 * REUSABLE PDP TEMPLATE — structural skeleton.
 *
 * Section order follows the Design Bible:
 *   Experience → Commerce → Specifications → Documentation → Research → Related
 *
 * The opening section is where the product world takes over (Experience Mode);
 * commerce and technical areas return to Quiet Mode. Only the *shape* is built
 * here — no product data, no prices, no claims, no COA values, no 3D.
 */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  const sections = [
    { id: "experience", label: dict.products.sections.experience },
    { id: "commerce", label: dict.products.sections.commerce },
    { id: "specifications", label: dict.products.sections.specifications },
    { id: "documentation", label: dict.products.sections.documentation },
    { id: "research", label: dict.products.sections.research },
    { id: "related", label: dict.products.sections.related },
  ] as const;

  return (
    <>
      <Section mode="quiet" aria-labelledby="pdp-title">
        <Container>
          <Heading level={1} id="pdp-title" size="4xl">
            {dict.products.detailTitle}
          </Heading>
          <Mono size="xs" tone="muted" as="p" className="mt-(--space-2xs)">
            {slug}
          </Mono>
          <StatusNote
            className="mt-(--space-md)"
            kind="pending"
            label={dict.status.pending}
            description={dict.status.placeholderNotice}
          />
        </Container>
      </Section>

      {sections.map((section) => (
        <Section
          key={section.id}
          id={section.id}
          mode="quiet"
          aria-labelledby={`pdp-${section.id}`}
          className="border-t border-(--border-subtle)"
        >
          <Container>
            <Heading level={2} id={`pdp-${section.id}`} size="xl">
              {section.label}
            </Heading>
          </Container>
        </Section>
      ))}
    </>
  );
}
