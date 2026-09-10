import Link from "next/link";

import { Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";
import { siteConfig } from "@/config/site";

import styles from "./OrderSummary.module.css";

import type { Money } from "@/data/commerce";
import type { DeliverySelection, PricedLine } from "@/domain/checkout";

export interface SummaryCopy {
  title: string;
  itemsLabel: string;
  linesLabel: string;
  quantity: string;
  subtotal: string;
  shipping: string;
  shippingFree: string;
  shippingPending: string;
  total: string;
  totalPending: string;
  estimate: string;
  /** "{amount} más para envío gratis" */
  freeShippingRemaining: string;
  freeShippingReached: string;
  note: string;
  editBag: string;
}

/**
 * THE ORDER SUMMARY — the same numbers, on every screen of the flow.
 *
 * Its job is continuity. A customer who saw MX$37,500 in the bag must see
 * MX$37,500 at contact, at shipping, at delivery and at review, and any change
 * must be announced rather than discovered. So this component takes the
 * SERVER'S priced snapshot — never the browser's bag — and every step renders
 * the same one.
 *
 * THE FREE-SHIPPING METER CARRIES OVER FROM THE BAG deliberately. It is the
 * only merchandising in this flow, it rests on a confirmed business fact
 * (MX$10,000), and dropping it at the checkout boundary would break the one
 * piece of momentum the bag builds.
 *
 * WHAT IT REFUSES TO PRINT. A total, when there is no shipping rate. Below the
 * threshold the rate model does not exist, so the shipping row says so and the
 * total row says so — rather than showing a goods-only figure that a customer
 * would reasonably read as the amount they will pay.
 */
export function OrderSummary({
  lines,
  subtotal,
  delivery,
  shipping,
  total,
  copy,
  localeTag,
  bagHref,
}: {
  lines: readonly PricedLine[];
  subtotal: Money;
  /** The chosen method, once there is one — for the estimate row. */
  delivery: DeliverySelection | null;
  /**
   * Shipping, or null when genuinely unknown.
   *
   * Passed in rather than derived from `delivery`, because free shipping is a
   * property of the SUBTOTAL and is therefore knowable before a method is
   * chosen. See `provisionalShipping`.
   */
  shipping: Money | null;
  /** Null when shipping is unknown — a goods-only figure would read as the total. */
  total: Money | null;
  copy: SummaryCopy;
  localeTag: string;
  bagHref: string;
}) {
  const units = lines.reduce((n, l) => n + l.quantity, 0);
  const threshold = siteConfig.fulfilment.freeShippingThreshold;
  const remaining = Math.max(0, threshold - subtotal.amount);
  const progress =
    threshold > 0 ? Math.min(100, Math.round((subtotal.amount / threshold) * 100)) : 100;

  return (
    <section className={styles.panel} aria-labelledby="checkout-summary">
      <header className={styles.head}>
        <Mono size="2xs" className={styles.title} id="checkout-summary">
          {copy.title}
        </Mono>
        <Mono size="2xs" className={styles.count}>
          {copy.itemsLabel} — {String(units).padStart(2, "0")}
        </Mono>
      </header>

      {/*
       * A capped, scrollable list rather than a disclosure.
       *
       * On a phone this panel sits ABOVE the form (see the CSS `order`), so an
       * eight-line order would otherwise push the fields off the screen. A
       * `<details>` would solve that but cannot be opened by default on
       * desktop and closed on mobile without JavaScript — and this flow ships
       * none. Capping the height keeps every line reachable, hides nothing,
       * and keeps the total in view.
       *
       * `tabIndex` because a scrollable region that cannot be reached by
       * keyboard is unreachable content for anyone not using a pointer.
       */}
      <div className={styles.linesWrap} tabIndex={0} role="group" aria-label={copy.linesLabel}>
        <ul className={styles.lines}>
          {lines.map((line) => (
            <li key={line.variantId} className={styles.line}>
              <div className={styles.lineMain}>
                <span className={styles.lineName}>{line.name}</span>
                <Mono size="2xs" className={styles.lineMeta}>
                  {line.presentation} · {copy.quantity} {line.quantity}
                </Mono>
              </div>
              <Mono size="2xs" className={styles.lineTotal}>
                {formatPrice(line.lineTotal, localeTag)}
              </Mono>
            </li>
          ))}
        </ul>
      </div>

      {/* --- free shipping ------------------------------------------------ */}
      <div className={styles.freeShip} data-reached={progress >= 100 ? "true" : undefined}>
        <div
          className={styles.meter}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={copy.shippingFree}
        >
          <span className={styles.meterFill} style={{ inlineSize: `${progress}%` }} />
        </div>
        <Mono size="2xs" className={styles.freeShipNote}>
          {remaining > 0
            ? copy.freeShippingRemaining.replace(
                "{amount}",
                formatPrice({ amount: remaining, currency: "MXN" }, localeTag),
              )
            : copy.freeShippingReached}
        </Mono>
      </div>

      <dl className={styles.totals}>
        <div className={styles.row}>
          <Mono as="dt" size="2xs" className={styles.key}>
            {copy.subtotal}
          </Mono>
          <Mono as="dd" size="2xs" className={styles.value}>
            {formatPrice(subtotal, localeTag)}
          </Mono>
        </div>

        <div className={styles.row}>
          <Mono as="dt" size="2xs" className={styles.key}>
            {copy.shipping}
          </Mono>
          <Mono as="dd" size="2xs" className={styles.value}>
            {/* Zero once the threshold is met — a confirmed fact. Otherwise no
                figure at all: no rate model has been chosen. */}
            {shipping
              ? shipping.amount === 0
                ? copy.shippingFree
                : formatPrice(shipping, localeTag)
              : copy.shippingPending}
          </Mono>
        </div>

        {delivery ? (
          <div className={styles.row}>
            <Mono as="dt" size="2xs" className={styles.key}>
              {copy.estimate}
            </Mono>
            <Mono as="dd" size="2xs" className={styles.value}>
              {String(delivery.estimateDays)}
            </Mono>
          </div>
        ) : null}

        <div className={`${styles.row} ${styles.grand}`}>
          <Mono as="dt" size="2xs" className={styles.key}>
            {copy.total}
          </Mono>
          {total ? (
            <dd className={styles.grandValue}>{formatPrice(total, localeTag)}</dd>
          ) : (
            <Mono as="dd" size="2xs" className={styles.pending}>
              {copy.totalPending}
            </Mono>
          )}
        </div>
      </dl>

      <Link href={bagHref} className={styles.editBag}>
        {copy.editBag}
      </Link>

      <Mono size="2xs" className={styles.note}>
        {copy.note}
      </Mono>
    </section>
  );
}
