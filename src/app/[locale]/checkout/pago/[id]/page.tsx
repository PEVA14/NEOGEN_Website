import { notFound, redirect } from "next/navigation";

import { FlowNotice, MercadoPagoCardForm, PaymentSlot } from "@/components/checkout";
import { Container, Section } from "@/components/primitives";
import { Mono } from "@/components/typography";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/data/commerce/format";
import { isPayable, lastDecline } from "@/domain/order";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { activeProvider, bagEnabled, DECLINE_REASONS, paymentAvailable } from "@/payments";
import { ownsOrder } from "@/server/checkout/session";
import { refreshPayment } from "@/server/payments";
import { orderRepository } from "@/server/persistence";

import { OrderShell, StepHead } from "../../shared";
import styles from "../../page.module.css";

import type { DeclineReason } from "@/payments";
import type { Metadata } from "next";

/**
 * NEVER CACHED, NEVER PRERENDERED — one browser's order, with its address.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.checkout.title} — ${dict.checkout.steps.payment.title}`,
    robots: { index: false, follow: false },
  };
}

/**
 * 05 PAYMENT — pay one registered order.
 *
 * ACCESS. The same rule as the confirmation: this browser must have created
 * the order (httpOnly cookie), checked before the order is loaded.
 *
 * STATE FIRST. The order is brought up to date from the provider if a payment
 * is in flight (`refreshPayment`), and anything that is not payable — paid,
 * processing, awaiting a transfer, refunded — goes to the confirmation, which
 * says where it stands. Only `created` and `payment_failed` render the card
 * form, so a reload can never offer a second charge for money in flight.
 *
 * A DECLINE IS NOT A DEAD END. After `payment_failed` the page opens with the
 * reason and a fresh form; the order, its reference and the bag are as they
 * were. Nothing has to be rebuilt.
 */
export default async function OrderPaymentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const tag = localeTags[locale];
  const path = (to: string) => localizePath(to, locale);
  const copy = dict.checkout.steps.payment;
  const confirmation = dict.checkout.confirmation;

  const notice = (c: {
    index: string;
    label: string;
    title: string;
    body: string;
    catalogue: string;
    bag: string;
  }) => (
    <Section mode="quiet">
      <Container width="full">
        <FlowNotice
          index={c.index}
          label={c.label}
          title={c.title}
          body={c.body}
          actions={[
            { href: path(routes.products), label: c.catalogue, primary: true },
            { href: path(routes.cart), label: c.bag },
          ]}
        />
      </Container>
    </Section>
  );

  if (!bagEnabled()) return notice(dict.checkout.unavailable);

  const owned = await ownsOrder(id);
  const stored = owned ? await orderRepository().get(id) : null;
  if (!stored) return notice(confirmation.notFound);

  const order = await refreshPayment(stored);
  if (!isPayable(order.state)) redirect(path(routes.orderConfirmation(order.id)));

  const prepared = paymentAvailable() ? activeProvider().prepare(order) : null;
  const action = prepared?.ok ? prepared.action : null;

  const declineNote = lastDecline(order);
  const decline: DeclineReason | null =
    order.state !== "payment_failed"
      ? null
      : DECLINE_REASONS.includes(declineNote as DeclineReason)
        ? (declineNote as DeclineReason)
        : "generic";

  return (
    <OrderShell dict={dict} order={order} tag={tag} path={path}>
      <div className={styles.step}>
        <StepHead index={copy.index} title={copy.title} note={copy.note} id="step-payment" />

        {action?.kind === "embedded" && action.testMode ? (
          <p className={styles.testMode}>{copy.card.testMode}</p>
        ) : null}

        {decline ? (
          <div className={styles.retry}>
            <p className={styles.retryTitle}>{copy.retry.title}</p>
            <p className={styles.retryNote}>{copy.retry.note}</p>
          </div>
        ) : null}

        <dl className={styles.payFacts}>
          <div>
            <Mono as="dt" size="2xs" className={styles.payKey}>
              {copy.card.orderLabel}
            </Mono>
            <dd className={styles.payValue}>{order.id}</dd>
          </div>
          <div>
            <Mono as="dt" size="2xs" className={styles.payKey}>
              {copy.card.amountLabel}
            </Mono>
            <dd className={styles.payValue}>{formatPrice(order.totals.total, tag)}</dd>
          </div>
        </dl>

        {action?.kind === "embedded" && action.component === "mercadopago.cardPayment" ? (
          <PaymentSlot
            view={{ kind: "embedded" }}
            copy={copy.slot}
            localeTag={tag}
            contact={{
              href: `tel:${siteConfig.contact.phone}`,
              display: siteConfig.contact.phoneDisplay,
            }}
          >
            <MercadoPagoCardForm
              orderId={order.id}
              locale={locale}
              publicKey={action.publicKey}
              amount={action.amount.amount}
              sdkLocale={locale === "en" ? "en-US" : "es-MX"}
              copy={copy.card}
              declines={copy.declines}
              initialDecline={decline}
            />
            <Mono as="p" size="2xs" className={styles.provider}>
              {copy.card.provider}
            </Mono>
          </PaymentSlot>
        ) : (
          <PaymentSlot
            view={{ kind: "no_provider" }}
            copy={copy.slot}
            localeTag={tag}
            contact={{
              href: `tel:${siteConfig.contact.phone}`,
              display: siteConfig.contact.phoneDisplay,
            }}
          />
        )}

        <a href={path(routes.cart)} className={styles.backLink}>
          ← {copy.back}
        </a>
      </div>
    </OrderShell>
  );
}
