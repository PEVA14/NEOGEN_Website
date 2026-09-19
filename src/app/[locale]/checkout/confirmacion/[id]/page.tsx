import { notFound } from "next/navigation";

import { ClearBagOnOrder, FlowNotice, OrderReceipt, PaymentWatcher } from "@/components/checkout";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { routes } from "@/config/routes";
import { formatAddress } from "@/domain/checkout";
import { isPayable } from "@/domain/order";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { paymentAvailable } from "@/payments";
import { ownsOrder } from "@/server/checkout/session";
import { refreshPayment } from "@/server/payments";
import { orderRepository } from "@/server/persistence";

import styles from "../../page.module.css";

import type { Metadata } from "next";

/**
 * NEVER CACHED, NEVER PRERENDERED.
 *
 * Every screen in this flow is specific to one browser's checkout session, and
 * several render a customer's own name, phone and address. A cached copy
 * served to a second visitor would be a data leak rather than a stale page.
 *
 * Declared explicitly rather than relying on `cookies()` having been read.
 * That inference is real but fragile: the flag-off branch of this route
 * returns before it touches a cookie, which was enough for the build to
 * prerender the entire checkout as static HTML — exactly the failure this
 * export prevents.
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
  const copy = dict.checkout.confirmation;
  /*
   * The title has to agree with the page. A browser that does not own this
   * order sees the not-found screen, and titling that tab "Order registered"
   * would tell them the opposite of what is on it — in the one place a
   * customer might be anxiously checking whether an order exists.
   */
  const owned = await ownsOrder(id);
  return {
    title: owned ? copy.title : copy.notFound.title,
    /*
     * NOINDEX / NOFOLLOW, and no description that could be indexed. A
     * confirmation carries a name, a phone number and a home address; it must
     * never be crawlable, and it deliberately declares no hreflang alternates
     * either — that would be publishing the URL pattern of a private page.
     */
    robots: { index: false, follow: false },
  };
}

/**
 * 06 CONFIRMATION — a record of what happened, and never a claim.
 *
 * ACCESS CONTROL FIRST, because this is the one page in the flow that can be
 * addressed by a guessable id. Order references are short and partly
 * time-derived on purpose — they get read over the phone — which makes them
 * exactly the wrong thing to use as a bearer token. So the browser must have
 * created the order (`ownsOrder`, an httpOnly cookie of recent ids) or it
 * gets the not-found screen, even for an order that exists.
 *
 * That is not an account system and does not pretend to be one. It is the
 * minimum that stops one customer's address being served to anyone who
 * guesses a reference. A real "look up my order" flow needs identity, which
 * V1 does not have — and inventing a weaker one that felt like identity would
 * be worse than saying so.
 *
 * WHAT IT NEVER DOES: claim payment. The heading comes from `order.state`,
 * which only the provider's answer can move (`server/payments.ts`). While a
 * payment is in flight the order is refreshed from the provider on each
 * render and the page re-renders itself (`PaymentWatcher`); a payable order
 * links back to its payment step. There is no success tick anywhere in this
 * component tree that the state did not put there.
 *
 * THE BAG is emptied only once money is moving or taken. A declined or
 * abandoned payment leaves it as it was.
 */
export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.checkout.confirmation;
  const path = (to: string) => localizePath(to, locale);

  /*
   * Ownership is checked BEFORE the order is loaded, so an unauthorised
   * request never causes a lookup — and cannot be distinguished, by timing or
   * by response, from a reference that does not exist.
   */
  const owned = await ownsOrder(id);
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
              { href: path(routes.cart), label: copy.notFound.bag },
            ]}
          />
        </Container>
      </Section>
    );
  }

  return (
    <Section mode="quiet" aria-labelledby="confirmation-title">
      <Container width="full">
        <SectionHeader
          index={copy.index}
          label={`${copy.label} // ${copy.qualifier}`}
          title={copy.states[order.state].title}
          id="confirmation-title"
          as="h1"
        />

        {order.state === "paid" ||
        order.state === "payment_processing" ||
        order.state === "pending_payment" ? (
          <ClearBagOnOrder orderId={order.id} />
        ) : null}

        {order.state === "payment_processing" || order.state === "pending_payment" ? (
          <PaymentWatcher watching={copy.watching} stopped={copy.watchStopped} />
        ) : null}

        {isPayable(order.state) && paymentAvailable() ? (
          <a href={path(routes.orderPayment(order.id))} className={styles.payAction}>
            {order.state === "payment_failed" ? copy.actions.retry : copy.actions.pay} →
          </a>
        ) : null}

        <OrderReceipt
          order={order}
          copy={copy}
          localeTag={localeTags[locale]}
          addressLine={formatAddress(order.shipping)}
          links={{
            catalogue: path(routes.products),
            research: path(routes.research),
          }}
        />
      </Container>
    </Section>
  );
}
