import Link from "next/link";

import { Body, Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";

import { formatDays, type DayCount } from "./days";

import styles from "./OrderReceipt.module.css";

import { formatPhoneDisplay } from "@/domain/checkout";

import type { Order, PaymentState } from "@/domain/order";

export interface ReceiptCopy {
  referenceLabel: string;
  placedLabel: string;
  stateLabel: string;
  statusLabel: string;
  /** One block per payment state. `paid` is unreachable without a provider. */
  states: Record<PaymentState, { badge: string; title: string; body: string }>;
  statuses: Record<Order["status"], string>;
  nextSteps: { title: string; body: string; contactLabel: string };
  items: { title: string; quantity: string };
  contact: { title: string; email: string; phone: string };
  shipping: { title: string; estimate: string };
  totals: { subtotal: string; shipping: string; free: string; total: string };
  /** Singular and plural — see `formatDays`. */
  estimateDays: DayCount;
  actions: { catalogue: string; research: string };
  /** Printed only when a declaration was actually accepted. */
  acknowledgedLabel: string;
}

/**
 * CONFIRMATION — a record, and never a claim.
 *
 * THE ONE RULE THIS COMPONENT EXISTS TO ENFORCE: it says what state the order
 * is in, and it takes that state from the order. There is no "thank you, your
 * payment was successful" heading, because the heading is chosen by
 * `order.state` and today that state is `created` — no processor exists, so
 * nothing was charged, and the page says exactly that.
 *
 * All seven states are written, because a confirmation page is the screen a
 * customer reads when something has gone wrong as often as when it has gone
 * right, and "SPEI pending" and "payment failed" need to be as considered as
 * "approved". Only the first is reachable now.
 *
 * WHAT IT SHOWS BEYOND THE STATE: the reference, when it was placed, the
 * lines, the totals, where it is going, the estimate, and the one contact
 * channel NEOGEN actually has. Then two ways back into the site — the
 * catalogue and research — because a confirmation that dead-ends is a
 * conversion left on the floor and, more simply, an unhelpful page.
 */
export function OrderReceipt({
  order,
  copy,
  localeTag,
  addressLine,
  links,
}: {
  order: Order;
  copy: ReceiptCopy;
  localeTag: string;
  addressLine: string;
  links: { catalogue: string; research: string };
  contact?: never;
}) {
  const state = copy.states[order.state];
  const placed = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(order.createdAt));

  return (
    <div className={styles.receipt}>
      {/* --- reference plate --------------------------------------------- */}
      <div className={styles.plate}>
        <div className={styles.plateRow}>
          <Mono size="2xs" className={styles.plateKey}>
            {copy.referenceLabel}
          </Mono>
          {/* The number a customer reads over the phone. Selectable in one
              gesture, tabular, and the largest thing on the plate. */}
          <p className={styles.reference}>{order.id}</p>
        </div>
        <div className={styles.plateMeta}>
          <Mono size="2xs" className={styles.plateKey}>
            {copy.placedLabel} — {placed}
          </Mono>
          <Mono size="2xs" className={styles.plateKey}>
            {copy.statusLabel} — {copy.statuses[order.status]}
          </Mono>
        </div>
      </div>

      {/* --- payment state ---------------------------------------------- */}
      <section className={styles.state} data-state={order.state} aria-labelledby="receipt-state">
        <header className={styles.stateHead}>
          <Mono size="2xs" className={styles.stateLabel} id="receipt-state">
            {copy.stateLabel}
          </Mono>
          <Mono size="2xs" className={styles.badge}>
            {state.badge}
          </Mono>
        </header>
        <h2 className={styles.stateTitle}>{state.title}</h2>
        <Body tone="muted" className={styles.stateBody}>
          {state.body}
        </Body>
      </section>

      {/* --- next steps -------------------------------------------------- */}
      <section className={styles.next} aria-labelledby="receipt-next">
        <Mono size="2xs" className={styles.sectionTitle} id="receipt-next">
          {copy.nextSteps.title}
        </Mono>
        <Body size="sm">{copy.nextSteps.body}</Body>
        <Mono size="2xs" className={styles.destination}>
          {copy.nextSteps.contactLabel} — {order.contact.email}
        </Mono>
      </section>

      {/* --- order --------------------------------------------------------- */}
      <div className={styles.columns}>
        <section className={styles.section} aria-labelledby="receipt-items">
          <Mono size="2xs" className={styles.sectionTitle} id="receipt-items">
            {copy.items.title}
          </Mono>
          <ul className={styles.lines}>
            {order.lines.map((line) => (
              <li key={line.variantId} className={styles.line}>
                <div className={styles.lineMain}>
                  <span className={styles.lineName}>{line.name}</span>
                  <Mono size="2xs" className={styles.lineMeta}>
                    {line.presentation} · {copy.items.quantity} {line.quantity}
                  </Mono>
                </div>
                <Mono size="2xs" className={styles.lineTotal}>
                  {formatPrice(line.lineTotal, localeTag)}
                </Mono>
              </li>
            ))}
          </ul>

          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <Mono as="dt" size="2xs" className={styles.totalKey}>
                {copy.totals.subtotal}
              </Mono>
              <Mono as="dd" size="2xs" className={styles.totalValue}>
                {formatPrice(order.totals.subtotal, localeTag)}
              </Mono>
            </div>
            <div className={styles.totalRow}>
              <Mono as="dt" size="2xs" className={styles.totalKey}>
                {copy.totals.shipping}
              </Mono>
              <Mono as="dd" size="2xs" className={styles.totalValue}>
                {order.totals.shipping.amount === 0
                  ? copy.totals.free
                  : formatPrice(order.totals.shipping, localeTag)}
              </Mono>
            </div>
            <div className={`${styles.totalRow} ${styles.grand}`}>
              <Mono as="dt" size="2xs" className={styles.totalKey}>
                {copy.totals.total}
              </Mono>
              <dd className={styles.grandValue}>{formatPrice(order.totals.total, localeTag)}</dd>
            </div>
          </dl>
        </section>

        <div className={styles.side}>
          <section className={styles.section} aria-labelledby="receipt-shipping">
            <Mono size="2xs" className={styles.sectionTitle} id="receipt-shipping">
              {copy.shipping.title}
            </Mono>
            <Body size="sm" className={styles.address}>
              {order.shipping.recipient}
            </Body>
            <Body size="sm" tone="muted" className={styles.address}>
              {addressLine}
            </Body>
            <Mono size="2xs" className={styles.lineMeta}>
              {copy.shipping.estimate} —{" "}
              {formatDays(order.delivery.estimateDays, copy.estimateDays)}
            </Mono>
          </section>

          <section className={styles.section} aria-labelledby="receipt-contact">
            <Mono size="2xs" className={styles.sectionTitle} id="receipt-contact">
              {copy.contact.title}
            </Mono>
            <Body size="sm" className={styles.address}>
              {order.contact.name}
            </Body>
            <Mono size="2xs" className={styles.lineMeta}>
              {copy.contact.email} — {order.contact.email}
            </Mono>
            <Mono size="2xs" className={styles.lineMeta}>
              {copy.contact.phone} — {formatPhoneDisplay(order.contact.phone)}
            </Mono>
          </section>

          {/*
           * Printed only when something was actually accepted. Zero
           * declarations are publishable today, so this is absent — and an
           * empty "you agreed to" block would imply otherwise.
           */}
          {order.acknowledged.length > 0 ? (
            <section className={styles.section} aria-label={copy.acknowledgedLabel}>
              <Mono size="2xs" className={styles.sectionTitle}>
                {copy.acknowledgedLabel}
              </Mono>
              <ul className={styles.acks}>
                {order.acknowledged.map((ack) => (
                  <li key={`${ack.id}@${ack.version}`}>
                    <Mono size="2xs" className={styles.lineMeta}>
                      {ack.id} · v{ack.version}
                    </Mono>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={links.catalogue} className={styles.primary}>
          {copy.actions.catalogue}
        </Link>
        <Link href={links.research} className={styles.secondary}>
          {copy.actions.research}
        </Link>
      </div>
    </div>
  );
}
