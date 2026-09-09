import { notFound } from "next/navigation";

import { BagSummary } from "@/components/commerce";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { localizePath } from "@/i18n/routing";
import { readBag } from "@/lib/bag";

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
  return { title: dict.cart.title, alternates: alternates(locale, routes.cart) };
}

/**
 * THE BAG.
 *
 * Empty is not a failure state here — it is the ONLY state, and the page is
 * designed for it rather than apologising for it. Nothing can be added: no
 * compound has a verified price or a verified format, which is why the product
 * page's ADD TO BAG is inert. So the page does three things honestly:
 *
 *   1. states the count as an instrument reading rather than a sad message;
 *   2. says WHY the bag cannot be filled, so emptiness reads as the state of
 *      the site and not as a step the reader failed to complete;
 *   3. shows the order summary architecture, because that structure is real,
 *      is what checkout consumes, and is legible even while every amount in it
 *      is a placeholder.
 *
 * WHAT IS DELIBERATELY ABSENT. There is no line-item renderer and no bag
 * drawer. Both would be components that can never render anything, and this
 * project has already paid once for carrying code nothing exercises. They get
 * built against real products, when there are real products.
 */
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const cart = dict.cart;
  const bag = readBag();
  const path = (to: string) => localizePath(to, locale);

  return (
    <Section mode="quiet" aria-labelledby="bag-title">
      <Container width="full">
        <SectionHeader
          index={cart.index}
          label={`${cart.label} // ${cart.qualifier}`}
          title={cart.title}
          id="bag-title"
          as="h1"
        />

        <div className={styles.layout}>
          <div className={styles.state}>
            {/*
             * The count as a readout: an oversized figure with a mono label
             * under it, the same instrument language the numbered spine uses.
             * A zero stated at scale is a fact; a zero hidden in a sentence
             * reads as an error message.
             */}
            <p className={styles.count}>
              <span className={styles.countValue}>{String(bag.count).padStart(2, "0")}</span>
              <Mono size="2xs" className={styles.countLabel}>
                {cart.countLabel}
              </Mono>
            </p>

            <Body className={styles.empty}>{cart.empty}</Body>
            <Body tone="muted" size="sm" className={styles.note}>
              {cart.emptyNote}
            </Body>

            <TextLink href={path(routes.products)}>{cart.browse}</TextLink>
          </div>

          <div className={styles.aside}>
            <BagSummary copy={cart.summary} placeholder={dict.status.placeholder} />

            {/*
             * Inert, and outlined rather than dimmed — the same treatment ADD TO
             * BAG gets, so the two read as the same kind of "not yet" instead of
             * two different failures. The reason names the actual blocker.
             */}
            <button type="button" className={styles.checkout} disabled>
              {cart.checkout}
            </button>
            <Mono size="2xs" className={styles.pending}>
              {cart.checkoutPending}
            </Mono>
          </div>
        </div>
      </Container>
    </Section>
  );
}
