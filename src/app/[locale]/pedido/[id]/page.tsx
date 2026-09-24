import { notFound } from "next/navigation";

import { FlowNotice, OrderStatus } from "@/components/checkout";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { customerView, isPayable } from "@/domain/order";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { paymentAvailable } from "@/payments";
import { isOrderId } from "@/payments/instrument";
import { ownsOrder } from "@/server/checkout/session";
import { refreshPayment } from "@/server/payments";
import { orderRepository } from "@/server/persistence";

import styles from "../../checkout/page.module.css";

import type { Metadata } from "next";

/**
 * NEVER CACHED, NEVER INDEXED — the same rules as the confirmation, for the
 * same reason: it shows one customer's order.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const owned = isOrderId(id) && (await ownsOrder(id));
  return {
    title: owned ? dict.checkout.status.title : dict.checkout.status.notFound.title,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * 07 ORDER STATUS — where a customer follows an order after paying.
 *
 * ACCESS: the browser must own the order (the httpOnly cookie checkout sets),
 * or have arrived through a signed email link, which the `acceso` route
 * exchanges for that same cookie. An order id alone opens nothing, and an
 * unowned id gets the same "not found" as one that does not exist — checked
 * BEFORE the order is loaded, so the two cannot be told apart.
 */
export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const copy = dict.checkout.status;
  const path = (to: string) => localizePath(to, locale);

  const owned = isOrderId(id) && (await ownsOrder(id));
  const stored = owned ? await orderRepository().get(id) : null;
  const order = stored ? await refreshPayment(stored) : null;

  if (!order) {
    return (
      <Section mode="quiet">
        <Container width="full">
          <FlowNotice
            index={copy.notFound.index}
            label={copy.notFound.label}
            title={copy.notFound.title}
            body={copy.notFound.body}
            actions={[
              { href: path(routes.products), label: copy.notFound.catalogue, primary: true },
            ]}
          />
        </Container>
      </Section>
    );
  }

  const view = customerView(order);
  return (
    <Section mode="quiet" rhythm="record" aria-labelledby="order-status-title">
      <Container width="full">
        {/* The h1 is the answer — "Tu pedido va en camino" — not the page's
            name. "Is my order okay?" is the question this page exists for. */}
        <SectionHeader
          index={copy.index}
          label={`${copy.label} // ${copy.qualifier}`}
          title={copy.headline[view.headline]}
          id="order-status-title"
          as="h1"
          scale="record"
        />
        {isPayable(order.state) && paymentAvailable() && view.headline === "unpaid" ? (
          <a href={path(routes.orderPayment(order.id))} className={styles.payAction}>
            {copy.pay} →
          </a>
        ) : null}
        <OrderStatus
          order={order}
          view={view}
          localeTag={localeTags[locale]}
          helpPhone={{
            href: `tel:${siteConfig.contact.phone}`,
            display: siteConfig.contact.phoneDisplay,
          }}
          copy={{
            referenceLabel: copy.referenceLabel,
            placedLabel: copy.placedLabel,
            headline: copy.headline,
            body: copy.body,
            steps: copy.steps,
            refund: copy.refund,
            tracking: copy.tracking,
            destination: copy.destination,
            items: copy.items,
            total: copy.total,
            payment: copy.payment,
            help: copy.help,
            paymentState: dict.checkout.confirmation.states[order.state].badge,
          }}
        />
      </Container>
    </Section>
  );
}
