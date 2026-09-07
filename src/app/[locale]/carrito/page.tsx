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
  return { title: dict.cart.title };
}

/**
 * CART — skeleton.
 *
 * No cart state library in Phase 1. When commerce is built, React Context +
 * useReducer is the default unless real complexity justifies otherwise.
 * The Cart Drawer is a later phase.
 */
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <Section mode="quiet" aria-labelledby="cart-title">
      <Container>
        <Heading level={1} id="cart-title" size="3xl">
          {dict.cart.title}
        </Heading>
        <Body className="mt-(--space-sm)" tone="muted">
          {dict.cart.empty}
        </Body>
      </Container>
    </Section>
  );
}
