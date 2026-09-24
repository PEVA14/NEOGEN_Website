import { Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";

import styles from "./OrderStatus.module.css";

import type { CustomerView, Order, StepId } from "@/domain/order";

export interface OrderStatusCopy {
  referenceLabel: string;
  placedLabel: string;
  headline: Record<CustomerView["headline"], string>;
  body: Record<CustomerView["headline"], string>;
  steps: Record<StepId | "label" | "done" | "current" | "upcoming", string>;
  refund: { open: string; confirmed: string };
  tracking: { title: string; carrier: string; number: string; link: string; none: string };
  destination: string;
  items: string;
  total: string;
  payment: string;
  help: string;
  paymentState: string;
}

/**
 * FOLLOWING AN ORDER — mobile first, and only ever what the order says.
 *
 * The headline and the four steps come from `customerView`, which marks a
 * step done only from the order's own milestones: paying never shows a parcel
 * as shipped, and "ready to ship" is still "being prepared" to a customer.
 * Off the normal path there is no bar, only a sentence. Tracking appears when
 * a shipment has it — the carrier's link opens in a new tab with no referrer.
 *
 * No delivery date is computed or promised; the only estimate NEOGEN has is
 * the one the checkout already showed, and it lives on the receipt.
 */
export function OrderStatus({
  order,
  view,
  copy,
  localeTag,
  helpPhone,
}: {
  order: Order;
  view: CustomerView;
  copy: OrderStatusCopy;
  localeTag: string;
  helpPhone: { href: string; display: string };
}) {
  const date = (iso: string) =>
    new Intl.DateTimeFormat(localeTag, {
      dateStyle: "medium",
      timeZone: "America/Mexico_City",
    }).format(new Date(iso));
  const units = order.lines.reduce((n, l) => n + l.quantity, 0);
  const tracking = view.shipment;

  return (
    <div className={styles.status}>
      <div className={styles.plate}>
        <div>
          <Mono size="2xs" className={styles.key}>
            {copy.referenceLabel}
          </Mono>
          <p className={styles.reference}>{order.id}</p>
        </div>
        <Mono size="2xs" className={styles.key}>
          {copy.placedLabel} — {date(order.createdAt)}
        </Mono>
      </div>

      <section className={styles.now} data-headline={view.headline} aria-live="polite">
        {/* The headline is the page's h1; this block says what it means. */}
        <p className={styles.body}>{copy.body[view.headline]}</p>
        {view.refund ? (
          <p className={styles.body}>
            {view.refund.status === "confirmed"
              ? copy.refund.confirmed.replace(
                  "{amount}",
                  formatPrice(view.refund.amount, localeTag),
                )
              : copy.refund.open}
          </p>
        ) : null}
      </section>

      {view.steps ? (
        <ol className={styles.steps} aria-label={copy.steps.label}>
          {view.steps.map((step) => (
            <li
              key={step.id}
              className={styles.step}
              data-status={step.status}
              aria-current={step.status === "current" ? "step" : undefined}
            >
              <span className={styles.marker} aria-hidden="true" />
              <span className={styles.stepName}>{copy.steps[step.id]}</span>
              <span className={styles.stepMeta}>
                <span className="sr-only">{copy.steps[step.status]}. </span>
                {step.at ? date(step.at) : step.status === "current" ? copy.steps.current : ""}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {view.steps || tracking ? (
        <section className={styles.block} aria-labelledby="status-tracking">
          <h3 id="status-tracking" className={styles.blockTitle}>
            {copy.tracking.title}
          </h3>
          {tracking && (tracking.carrier || tracking.trackingNumber) ? (
            <dl className={styles.facts}>
              {tracking.carrier ? (
                <>
                  <dt>{copy.tracking.carrier}</dt>
                  <dd>{tracking.carrier}</dd>
                </>
              ) : null}
              {tracking.trackingNumber ? (
                <>
                  <dt>{copy.tracking.number}</dt>
                  <dd className={styles.mono}>{tracking.trackingNumber}</dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className={styles.muted}>{copy.tracking.none}</p>
          )}
          {tracking?.trackingUrl ? (
            <a
              href={tracking.trackingUrl}
              className={styles.action}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.tracking.link} ↗
            </a>
          ) : null}
        </section>
      ) : null}

      <section className={styles.block} aria-labelledby="status-items">
        <h3 id="status-items" className={styles.blockTitle}>
          {copy.items} · {units}
        </h3>
        <ul className={styles.lines}>
          {order.lines.map((line, i) => (
            <li key={i} className={styles.line}>
              <span>
                {line.name}
                <span className={styles.muted}> · {line.presentation}</span>
              </span>
              <span className={styles.qty}>×{line.quantity}</span>
            </li>
          ))}
        </ul>
        <dl className={styles.facts}>
          <dt>{copy.total}</dt>
          <dd className={styles.strong}>{formatPrice(order.totals.total, localeTag)}</dd>
          <dt>{copy.payment}</dt>
          <dd>{copy.paymentState}</dd>
          <dt>{copy.destination}</dt>
          <dd>
            {order.shipping.city}, {order.shipping.state} · {order.shipping.postalCode}
          </dd>
        </dl>
      </section>

      <p className={styles.help}>
        {copy.help} <a href={helpPhone.href}>{helpPhone.display}</a>
      </p>
    </div>
  );
}
