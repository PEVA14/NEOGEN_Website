import { notFound } from "next/navigation";

import { BagSummary, CheckoutFlow } from "@/components/commerce";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
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
  return {
    title: dict.checkout.title,
    alternates: alternates(locale, routes.checkout),
    // Nothing here should be indexed: it is a transactional surface, and an
    // inert one. Kept explicit rather than left to a robots file.
    robots: { index: false, follow: true },
  };
}

/**
 * CHECKOUT — the process, rendered inert.
 *
 * NO PAYMENT PROCESSING, NO PROCESSOR SDK, NO BACKEND, NO TAX OR SHIPPING
 * LOGIC. The payment provider is pending product/regulatory and processor
 * review, and nothing here may imply otherwise.
 *
 * WHAT THAT LEAVES, AND WHY IT IS WORTH BUILDING.
 * -----------------------------------------------
 * The information architecture of a purchase is real and is not blocked by any
 * of the above: four numbered steps, the order summary, and one honest
 * statement of what is missing. Built now, it is what the processor mounts into
 * later rather than a page that gets thrown away.
 *
 * THREE THINGS ARE DELIBERATE.
 *
 *   1. There is NO `<form>`, no action and no submit handler. A checkout that
 *      appeared to submit and silently did nothing would be a fake integration
 *      that appears production-ready.
 *   2. There are NO payment fields — see CheckoutFlow. Card data belongs to the
 *      processor's hosted component and must never pass through this site's
 *      markup.
 *   3. The page is `noindex`. It is a transactional surface with nothing to
 *      transact.
 *
 * The bag is empty and cannot be otherwise, so the page says so and offers the
 * catalogue — but it leads with the REAL blocker, which is not the empty bag.
 * Even a full bag could not be paid for.
 */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const checkout = dict.checkout;
  const bag = readBag();
  const path = (to: string) => localizePath(to, locale);

  return (
    <Section mode="quiet" aria-labelledby="checkout-title">
      <Container width="full">
        <SectionHeader
          index={checkout.index}
          label={`${checkout.label} // ${checkout.qualifier}`}
          title={checkout.title}
          id="checkout-title"
          lede={checkout.lede}
          as="h1"
        />

        <div className={styles.layout}>
          <div className={styles.flow}>
            <CheckoutFlow copy={checkout.steps} />
          </div>

          {/*
           * A plain div, not an <aside>: a complementary landmark nested inside
           * <main> is reported as a landmark violation, and this is not
           * complementary content anyway — the order is the point of the page.
           * The summary inside carries its own labelled <section>.
           */}
          <div className={styles.aside}>
            {/* The bag's own state, stated here rather than assumed: arriving
                at checkout with nothing is a fact worth showing next to the
                total, not a redirect that hides where you are. */}
            {bag.count === 0 ? (
              <div className={styles.emptyBag}>
                <Body tone="muted" size="sm">
                  {checkout.emptyBag}
                </Body>
                <TextLink href={path(routes.products)}>{checkout.browse}</TextLink>
              </div>
            ) : null}

            <BagSummary copy={dict.cart.summary} placeholder={dict.status.placeholder} />

            {/* Inert, and outlined rather than dimmed — the same treatment ADD
                TO BAG and CONTINUE TO PAYMENT carry, so every blocked commerce
                action on the site reads as one consistent "not yet". */}
            <button type="button" className={styles.place} disabled>
              {checkout.place}
            </button>
            <Mono size="2xs" className={styles.pending}>
              {checkout.pending}
            </Mono>
            <Mono size="2xs" className={styles.pending}>
              {checkout.guestNote}
            </Mono>
          </div>
        </div>
      </Container>
    </Section>
  );
}
