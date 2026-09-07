import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Container, Section } from "@/components/primitives";
import { Body, Heading } from "@/components/typography";
import { StatusNote } from "@/components/ui";
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
  return { title: dict.checkout.title };
}

/**
 * CHECKOUT — route placeholder ONLY.
 *
 * NO payment processing, NO processor SDK, NO backend, NO tax or shipping
 * logic. The payment provider is pending product/regulatory and processor
 * review (docs/NEOGEN_MVP_SCOPE.md), and nothing here may imply otherwise.
 * Later phases build checkout *UI* only.
 */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Section mode="quiet" aria-labelledby="checkout-title">
      <Container>
        <Heading level={1} id="checkout-title" size="3xl">
          {dict.checkout.title}
        </Heading>
        <Body className="mt-(--space-sm)" tone="muted">
          {dict.checkout.guestNote}
        </Body>
        <StatusNote
          className="mt-(--space-md)"
          kind="tbd"
          label={dict.status.tbd}
          description={dict.status.placeholderNotice}
        />
      </Container>
    </Section>
  );
}
