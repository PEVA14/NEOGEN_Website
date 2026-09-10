import { notFound } from "next/navigation";

import { BagLines } from "@/components/commerce";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { bagEnabled } from "@/payments";

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
    title: dict.cart.title,
    description: dict.meta.descriptions.cart,
    alternates: alternates(locale, routes.cart),
    /* A bag is per-browser and has no indexable content. */
    robots: { index: false, follow: true },
  };
}

/**
 * THE BAG.
 *
 * The page is a server component that resolves copy and the commerce switch,
 * then hands both to one client island. The bag itself lives in this browser
 * — `localStorage`, read through `useSyncExternalStore` — so it cannot be
 * rendered on the server, and there is nothing here worth prerendering beyond
 * the shell.
 *
 * WHAT CHANGED FROM THE INERT VERSION. It works. Lines, quantities, removal,
 * a real subtotal and a free-shipping meter against the owner-confirmed
 * MX$10,000 threshold. What has NOT changed is the honesty of the money: no
 * shipping figure is printed below the threshold because no rate model exists,
 * and CONTINUE TO PAYMENT stays inert because `paymentAvailable()` is false —
 * `none` is the only registered adapter and it is never configured.
 */
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const cart = dict.cart;
  const bagUi = dict.bagUi;
  const tag = localeTags[locale];
  const commerce = bagEnabled();

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

        <BagLines
          copy={{
            countLabel: cart.countLabel,
            empty: cart.empty,
            /*
             * WHY THIS IS CONDITIONAL. The note explaining that purchasing is
             * not yet enabled is true with the flag off — and flatly false
             * with it on, where it sat next to a working Add to Bag button.
             * An empty bag on an enabled shop needs an invitation, not a
             * regulatory disclaimer.
             */
            emptyNote: commerce ? cart.emptyNoteEnabled : cart.emptyNote,
            browse: cart.browse,
            presentation: bagUi.presentation,
            quantity: bagUi.quantity,
            unitPrice: bagUi.unitPrice,
            lineTotal: bagUi.lineTotal,
            remove: bagUi.remove,
            decrease: bagUi.decrease,
            increase: bagUi.increase,
            subtotal: cart.summary.subtotal,
            shipping: cart.summary.shipping,
            shippingFree: bagUi.shippingFree,
            shippingPending: bagUi.shippingPending,
            total: cart.summary.total,
            freeShippingRemaining: bagUi.freeShippingRemaining,
            freeShippingReached: bagUi.freeShippingReached,
            checkout: cart.checkout,
            checkoutBusy: cart.checkoutBusy,
            checkoutPending: cart.checkoutPending,
            totalsNote: bagUi.totalsNote,
          }}
          productBase={localizePath(routes.products, locale)}
          catalogHref={localizePath(routes.products, locale)}
          /*
           * `bagEnabled()`, not `paymentAvailable()`. The two gates answer
           * different questions: entering checkout needs prices and a
           * business decision, while PAYING additionally needs a configured
           * adapter. That separation is what lets the whole flow be walked
           * and reviewed while payment remains impossible.
           */
          checkoutEnabled={commerce}
          /* A locale TAG, not a formatter — functions cannot cross the
             server/client boundary. */
          localeTag={tag}
          locale={locale}
        />
      </Container>
    </Section>
  );
}
