import { notFound } from "next/navigation";

import { OrderLookupForm } from "@/components/checkout/OrderLookupForm";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";

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
    title: dict.track.title,
    description: dict.track.intro,
    /* A form, not content: nothing here is worth a search result. */
    robots: { index: false, follow: true },
    alternates: alternates(locale, routes.orderLookup),
  };
}

/**
 * RASTREAR MI PEDIDO — follow an order without an account.
 *
 * The order number and the email it was placed with open that order's status
 * page in this browser (`server/orderLookup.ts`). The page says what it will
 * and will not show, and where the full order lives: the link in the order's
 * own emails, or the browser it was placed in.
 */
export default async function TrackOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const copy = dict.track;

  return (
    <Section mode="quiet" rhythm="record" aria-labelledby="track-title">
      <Container width="full">
        <SectionHeader
          index={copy.index}
          label={copy.label}
          title={copy.title}
          id="track-title"
          as="h1"
          scale="record"
        />
        <div className={styles.layout}>
          <div className={styles.main}>
            <p className={styles.intro}>{copy.intro}</p>
            <OrderLookupForm locale={locale} copy={copy.form} />
          </div>
          <aside className={styles.notes} aria-label={copy.notesLabel}>
            <p>{copy.where}</p>
            <p>{copy.privacy}</p>
            <p>
              {copy.help}{" "}
              <a href={`tel:${siteConfig.contact.phone}`} className={styles.phone}>
                {siteConfig.contact.phoneDisplay}
              </a>
            </p>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
