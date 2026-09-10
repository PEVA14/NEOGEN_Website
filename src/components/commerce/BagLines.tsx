"use client";

import Link from "next/link";
import { useTransition } from "react";

import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui";
import { ORDER_LIMITS } from "@/data/commerce/limits";
import { formatPrice } from "@/data/commerce/format";
import { useBag } from "@/domain/bag";
import { beginCheckout } from "@/server/checkout/actions";

import type { Locale } from "@/i18n/config";

import styles from "./BagLines.module.css";

export interface BagCopy {
  countLabel: string;
  empty: string;
  emptyNote: string;
  browse: string;
  presentation: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  remove: string;
  decrease: string;
  increase: string;
  subtotal: string;
  shipping: string;
  shippingFree: string;
  shippingPending: string;
  total: string;
  /** "{amount} más para envío gratis" */
  freeShippingRemaining: string;
  freeShippingReached: string;
  checkout: string;
  checkoutBusy: string;
  checkoutPending: string;
  totalsNote: string;
}

/**
 * THE BAG.
 *
 * One client island covering the whole page body, because every part of it —
 * lines, quantities, totals, the free-shipping meter — reads the same live
 * state, and splitting it would mean several islands re-deriving one bag.
 *
 * FREE-SHIPPING PROGRESS IS THE MERCHANDISING HERE, and it is the only
 * merchandising on the page that rests on a confirmed business fact: the
 * MX$10,000 threshold. No discounts, no bundles, no invented urgency — those
 * need data that does not exist. A meter toward a real threshold is honest and
 * it is the strongest lever available.
 */
export function BagLines({
  copy,
  productBase,
  catalogHref,
  checkoutEnabled,
  localeTag,
  locale,
}: {
  copy: BagCopy;
  /** URL prefix for a product page — the slug is appended. */
  productBase: string;
  catalogHref: string;
  /** `bagEnabled()` — the commerce flag. NOT `paymentAvailable()`: entering
      checkout needs prices and a business decision, not a processor. */
  checkoutEnabled: boolean;
  /** BCP-47 tag for `Intl`. See `AddToBag` for why this is not a function. */
  localeTag: string;
  /** Locale code, so the server action knows where to redirect. */
  locale: Locale;
}) {
  const { bag, totals, hydrated, setQuantity, remove } = useBag();
  const [handingOff, startHandoff] = useTransition();

  /**
   * THE BAG → CHECKOUT HANDOFF.
   *
   * The one moment client state becomes server state, and the only thing the
   * browser is allowed to assert: variant ids, quantities, and the unit price
   * it displayed. The server reprices every line from the registry — the
   * claimed price is used ONLY to notice that a price has moved and tell the
   * customer, never to charge — and stores the result under a cookie id.
   *
   * So the bag is not sent to checkout. It is a proposal that the server
   * accepts, corrects or rejects, which is why a hand-edited `localStorage`
   * cannot change what anyone pays.
   */
  const handoff = () => {
    startHandoff(async () => {
      await beginCheckout(
        bag.lines.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
          claimedUnitPrice: line.unitPrice.amount,
        })),
        locale,
      );
    });
  };

  /*
   * Before hydration the bag is unknown, not empty. Announcing "your bag is
   * empty" during that window is simply false for anyone who has one, so the
   * page holds the readout and says nothing else.
   */
  if (!hydrated) {
    return (
      <div className={styles.loading} aria-busy="true">
        <p className={styles.count}>
          <span className={styles.countValue}>—</span>
          <Mono size="2xs" className={styles.countLabel}>
            {copy.countLabel}
          </Mono>
        </p>
      </div>
    );
  }

  if (bag.count === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.count}>
          <span className={styles.countValue}>00</span>
          <Mono size="2xs" className={styles.countLabel}>
            {copy.countLabel}
          </Mono>
        </p>
        <p className={styles.emptyTitle}>{copy.empty}</p>
        <p className={styles.emptyNote}>{copy.emptyNote}</p>
        <Link href={catalogHref} className={styles.browseLink}>
          {copy.browse} →
        </Link>
      </div>
    );
  }

  const progress = Math.round(totals.freeShippingProgress * 100);

  return (
    <div className={styles.layout}>
      <div className={styles.lines}>
        <div className={styles.linesHead}>
          <Mono size="2xs" className={styles.countLabel}>
            {copy.countLabel} — {String(bag.count).padStart(2, "0")}
          </Mono>
        </div>

        <ul className={styles.list}>
          {bag.lines.map((line) => (
            <li key={line.variantId} className={styles.line}>
              {/* The same diagrammatic plate the cards use, at thumbnail
                  scale — a bag line without an image reads as a spreadsheet. */}
              <Link
                href={`${productBase}/${line.slug}`}
                className={styles.thumb}
                tabIndex={-1}
                aria-hidden="true"
              >
                <VialSilhouette className={styles.thumbArt} />
              </Link>

              <div className={styles.lineMain}>
                <Link href={`${productBase}/${line.slug}`} className={styles.lineName}>
                  {line.name}
                </Link>
                <Mono size="2xs" className={styles.lineMeta}>
                  {copy.presentation} · {line.presentation}
                </Mono>
                <Mono size="2xs" className={styles.lineMeta}>
                  {copy.unitPrice} · {formatPrice(line.unitPrice, localeTag)}
                </Mono>
              </div>

              <div className={styles.lineControls}>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.step}
                    onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                    aria-label={`${copy.decrease} — ${line.name}`}
                  >
                    −
                  </button>
                  <output className={styles.stepCount} aria-live="polite">
                    {line.quantity}
                  </output>
                  <button
                    type="button"
                    className={styles.step}
                    onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                    disabled={line.quantity >= ORDER_LIMITS.max}
                    aria-label={`${copy.increase} — ${line.name}`}
                  >
                    +
                  </button>
                </div>

                <span className={styles.lineTotal}>
                  {formatPrice(
                    {
                      amount: line.unitPrice.amount * line.quantity,
                      currency: line.unitPrice.currency,
                    },
                    localeTag,
                  )}
                </span>

                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => remove(line.variantId)}
                  aria-label={`${copy.remove} — ${line.name}`}
                >
                  {copy.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className={styles.summary} aria-labelledby="bag-summary">
        <Mono size="2xs" className={styles.summaryTitle} id="bag-summary">
          {copy.total}
        </Mono>

        {/* --- Free shipping ------------------------------------------- */}
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
            {totals.freeShippingRemaining
              ? copy.freeShippingRemaining.replace(
                  "{amount}",
                  formatPrice(totals.freeShippingRemaining, localeTag),
                )
              : copy.freeShippingReached}
          </Mono>
        </div>

        <dl className={styles.totals}>
          <div className={styles.totalRow}>
            <Mono as="dt" size="2xs" className={styles.totalKey}>
              {copy.subtotal}
            </Mono>
            <Mono as="dd" size="2xs" className={styles.totalValue}>
              {formatPrice(totals.subtotal, localeTag)}
            </Mono>
          </div>
          <div className={styles.totalRow}>
            <Mono as="dt" size="2xs" className={styles.totalKey}>
              {copy.shipping}
            </Mono>
            <Mono as="dd" size="2xs" className={styles.totalValue}>
              {/* Zero once the threshold is met — a confirmed fact. Below it,
                  no figure at all: no rate model has been chosen. */}
              {totals.shipping ? copy.shippingFree : copy.shippingPending}
            </Mono>
          </div>
          <div className={`${styles.totalRow} ${styles.grand}`}>
            <Mono as="dt" size="2xs" className={styles.totalKey}>
              {copy.total}
            </Mono>
            <dd className={styles.grandValue}>{formatPrice(totals.total, localeTag)}</dd>
          </div>
        </dl>

        <button
          type="button"
          className={styles.checkout}
          onClick={handoff}
          disabled={!checkoutEnabled || handingOff}
          aria-busy={handingOff || undefined}
        >
          {handingOff ? copy.checkoutBusy : copy.checkout}
        </button>

        {!checkoutEnabled ? (
          <Mono size="2xs" className={styles.pending}>
            {copy.checkoutPending}
          </Mono>
        ) : null}

        <Mono size="2xs" className={styles.pending}>
          {copy.totalsNote}
        </Mono>
      </aside>
    </div>
  );
}
