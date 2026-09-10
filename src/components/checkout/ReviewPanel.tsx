import Link from "next/link";

import { Body, Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";

import { formatDays, type DayCount } from "./days";

import styles from "./ReviewPanel.module.css";

import { formatPhoneDisplay } from "@/domain/checkout";

import type { Contact, MxAddress, DeliverySelection, PricedLine } from "@/domain/checkout";
import type { OrderTotals } from "@/domain/order";

export interface ReviewCopy {
  items: {
    title: string;
    product: string;
    presentation: string;
    quantity: string;
    unit: string;
    total: string;
  };
  contact: { title: string; email: string; name: string; phone: string };
  shipping: { title: string; recipient: string; address: string; notes: string };
  delivery: {
    title: string;
    method: string;
    estimate: string;
    cost: string;
    free: string;
    pending: string;
  };
  methodNames: Record<DeliverySelection["methodId"], string>;
  totals: { subtotal: string; shipping: string; total: string; pending: string; note: string };
  edit: string;
  /** Singular and plural — see `formatDays`. */
  estimateDays: DayCount;
  snapshotLabel: string;
}

/**
 * THE REVIEW — the screen that has to answer one question.
 *
 * "Is this exactly what I'm ordering?" Everything here exists to answer it,
 * and everything that would compete with it is absent: no upsell, no
 * newsletter, no shipping-protection add-on. This is the last screen before a
 * commitment and its job is certainty.
 *
 * FOUR SECTIONS, EACH SEPARATELY EDITABLE. The items, the contact, the
 * address and the delivery method, each with an edit link back to the step
 * that owns it. Editing one must not restart the flow — every step's
 * completeness is derived, so returning to fix a phone number leaves the
 * address and the delivery choice exactly as they were.
 *
 * EVERY NUMBER COMES FROM THE SERVER'S SNAPSHOT. The unit prices, the line
 * totals and the grand total are the same values the order will be created
 * with, taken from the same object — so there is no last transformation
 * between what is reviewed and what is charged. The snapshot's timestamp is
 * printed, because a price a customer is asked to approve should say when it
 * was quoted.
 */
export function ReviewPanel({
  lines,
  contact,
  address,
  delivery,
  totals,
  pricedAt,
  copy,
  localeTag,
  editHrefs,
  formatAddressLine,
}: {
  lines: readonly PricedLine[];
  contact: Contact;
  address: MxAddress;
  delivery: DeliverySelection;
  totals: OrderTotals | null;
  pricedAt: string;
  copy: ReviewCopy;
  localeTag: string;
  editHrefs: { items: string; contact: string; shipping: string; delivery: string };
  /** Address formatting comes from the domain — passed as a STRING, since
      functions cannot cross into a client boundary and this may become one. */
  formatAddressLine: string;
}) {
  return (
    <div className={styles.review}>
      {/* --- 1. ITEMS ---------------------------------------------------- */}
      <section className={styles.section} aria-labelledby="review-items">
        <SectionHead
          id="review-items"
          title={copy.items.title}
          edit={{ href: editHrefs.items, label: copy.edit }}
        />

        {/*
         * A real table. These are five columns of tabular data about five
         * different things, and a screen reader needs the column headers to
         * read a cell meaningfully — which is exactly what a table gives and
         * a stack of divs does not.
         */}
        {/*
         * FOCUSABLE, because it scrolls.
         *
         * Five money columns cannot fit at 375px, so the table gets its own
         * horizontal scroller. A scroll container that cannot be reached by
         * keyboard is unreachable content for anyone not using a pointer —
         * axe reports it as `scrollable-region-focusable`, and it caught this
         * one. `tabIndex` makes it focusable and the label says what it holds,
         * so arrow keys can pan it.
         */}
        <div className={styles.tableWrap} tabIndex={0} role="group" aria-label={copy.items.title}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.items.product}</th>
                <th scope="col">{copy.items.presentation}</th>
                <th scope="col" className={styles.numeric}>
                  {copy.items.quantity}
                </th>
                <th scope="col" className={styles.numeric}>
                  {copy.items.unit}
                </th>
                <th scope="col" className={styles.numeric}>
                  {copy.items.total}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.variantId}>
                  <th scope="row" className={styles.productCell}>
                    {line.name}
                  </th>
                  <td>{line.presentation}</td>
                  <td className={styles.numeric}>{line.quantity}</td>
                  <td className={styles.numeric}>{formatPrice(line.unitPrice, localeTag)}</td>
                  <td className={styles.numeric}>{formatPrice(line.lineTotal, localeTag)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className={styles.money}>
          <div className={styles.moneyRow}>
            <Mono as="dt" size="2xs" className={styles.moneyKey}>
              {copy.totals.subtotal}
            </Mono>
            <Mono as="dd" size="2xs" className={styles.moneyValue}>
              {totals ? formatPrice(totals.subtotal, localeTag) : "—"}
            </Mono>
          </div>
          <div className={styles.moneyRow}>
            <Mono as="dt" size="2xs" className={styles.moneyKey}>
              {copy.totals.shipping}
            </Mono>
            <Mono as="dd" size="2xs" className={styles.moneyValue}>
              {delivery.price
                ? delivery.price.amount === 0
                  ? copy.delivery.free
                  : formatPrice(delivery.price, localeTag)
                : copy.delivery.pending}
            </Mono>
          </div>
          <div className={`${styles.moneyRow} ${styles.grand}`}>
            <Mono as="dt" size="2xs" className={styles.moneyKey}>
              {copy.totals.total}
            </Mono>
            {totals ? (
              <dd className={styles.grandValue}>{formatPrice(totals.total, localeTag)}</dd>
            ) : (
              <Mono as="dd" size="2xs" className={styles.moneyValue}>
                {copy.totals.pending}
              </Mono>
            )}
          </div>
        </dl>

        <Mono size="2xs" className={styles.snapshot}>
          {copy.snapshotLabel} —{" "}
          {new Intl.DateTimeFormat(localeTag, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(pricedAt))}
        </Mono>
      </section>

      {/* --- 2. CONTACT / 3. SHIPPING / 4. DELIVERY --------------------- */}
      <div className={styles.details}>
        <section className={styles.section} aria-labelledby="review-contact">
          <SectionHead
            id="review-contact"
            title={copy.contact.title}
            edit={{ href: editHrefs.contact, label: copy.edit }}
          />
          <Rows
            rows={[
              { key: copy.contact.name, value: contact.name },
              { key: copy.contact.email, value: contact.email },
              { key: copy.contact.phone, value: formatPhoneDisplay(contact.phone) },
            ]}
          />
        </section>

        <section className={styles.section} aria-labelledby="review-shipping">
          <SectionHead
            id="review-shipping"
            title={copy.shipping.title}
            edit={{ href: editHrefs.shipping, label: copy.edit }}
          />
          <Rows
            rows={[
              { key: copy.shipping.recipient, value: address.recipient },
              { key: copy.shipping.address, value: formatAddressLine },
              ...(address.notes ? [{ key: copy.shipping.notes, value: address.notes }] : []),
            ]}
          />
        </section>

        <section className={styles.section} aria-labelledby="review-delivery">
          <SectionHead
            id="review-delivery"
            title={copy.delivery.title}
            edit={{ href: editHrefs.delivery, label: copy.edit }}
          />
          <Rows
            rows={[
              { key: copy.delivery.method, value: copy.methodNames[delivery.methodId] },
              {
                key: copy.delivery.estimate,
                value: formatDays(delivery.estimateDays, copy.estimateDays),
              },
              {
                key: copy.delivery.cost,
                value: delivery.price
                  ? delivery.price.amount === 0
                    ? copy.delivery.free
                    : formatPrice(delivery.price, localeTag)
                  : copy.delivery.pending,
              },
            ]}
          />
        </section>
      </div>

      <Mono size="2xs" className={styles.note}>
        {copy.totals.note}
      </Mono>
    </div>
  );
}

function SectionHead({
  id,
  title,
  edit,
}: {
  id: string;
  title: string;
  edit: { href: string; label: string };
}) {
  return (
    <header className={styles.sectionHead}>
      <Mono size="2xs" className={styles.sectionTitle} id={id}>
        {title}
      </Mono>
      {/*
       * `aria-label` carries the section name, because four links all reading
       * "Editar" tell a listener nothing about which one they are on.
       *
       * AN ARIA LABEL RATHER THAN A VISUALLY-HIDDEN SPAN, which is what this
       * was. The span used `clip-path` with `position: absolute` and no
       * insets — visually gone, but still laid out at its static position,
       * which pushed the document 50px wider than the viewport at 375px and
       * gave the review screen real horizontal overflow. A label has no box,
       * so it cannot do that, and it needs no breakpoint to manage.
       */}
      <Link href={edit.href} className={styles.edit} aria-label={`${edit.label} — ${title}`}>
        {edit.label}
      </Link>
    </header>
  );
}

function Rows({ rows }: { rows: readonly { key: string; value: string }[] }) {
  return (
    <dl className={styles.rows}>
      {rows.map((row) => (
        <div key={row.key} className={styles.row}>
          <Mono as="dt" size="2xs" className={styles.rowKey}>
            {row.key}
          </Mono>
          <Body as="dd" size="sm" className={styles.rowValue}>
            {row.value}
          </Body>
        </div>
      ))}
    </dl>
  );
}
