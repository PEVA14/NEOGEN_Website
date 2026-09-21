import { Mono } from "@/components/typography";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/data/commerce/format";
import { fulfilmentFacts, priorityZone, supports } from "@/domain/fulfilment";

import styles from "./ShippingNote.module.css";

export interface ShippingCopy {
  label: string;
  /** "Envíos a todo México." */
  national: string;
  /** "{zone}: entrega estimada en {days} día hábil." */
  priority: string;
  /** "Resto del país: hasta {days} días hábiles." */
  standard: string;
  /** "Envío sin costo desde {amount}." */
  free: string;
  /** The conjunction used to join the priority cities — "y" / "and". */
  and: string;
}

/**
 * THE SHIPPING PROPOSITION — assembled from the facts, never written out.
 *
 * WHAT THIS COMPONENT IS REALLY FOR. The brief asked the site to promise
 * "envíos a México en 24 horas". The confirmed facts do not support it: one
 * business day is Guadalajara and Durango, the rest of the country is up to
 * seven, and same-day does not exist as a service. `domain/fulfilment` refuses
 * both claims structurally, and this component is what the honest version
 * looks like in the interface — a named fast zone, a real estimate for
 * everywhere else, and the free-shipping threshold, which is the line that
 * actually moves a basket.
 *
 * EVERY LINE IS DERIVED. The zone comes from `siteConfig.fulfilment
 * .priorityCities`, the days from `estimateDays`, the threshold from
 * `freeShippingThreshold` — the same values the checkout quotes and the same
 * ones `domain/checkout/delivery.ts` routes on. Confirm a new city and this
 * component says so on every surface it appears on, in the same deploy.
 *
 * A line whose claim is not supported is NOT RENDERED. There is no "estimate
 * pending" row: a fact we do not have is absent (`PROJECT_STATE.md` §4).
 */
export function ShippingNote({
  copy,
  localeTag,
  className,
}: {
  copy: ShippingCopy;
  localeTag: string;
  className?: string;
}) {
  const facts = fulfilmentFacts();
  const fill = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

  const lines: string[] = [];
  if (supports("national")) lines.push(copy.national);
  if (supports("next-day-priority")) {
    lines.push(
      fill(copy.priority, {
        zone: priorityZone(copy.and),
        days: String(facts.priorityDays),
      }),
    );
    lines.push(fill(copy.standard, { days: String(facts.nationalDays) }));
  }
  lines.push(
    fill(copy.free, {
      amount: formatPrice(
        { amount: facts.freeShippingThreshold, currency: siteConfig.market.currency },
        localeTag,
      ),
    }),
  );

  return (
    <div className={[styles.note, className].filter(Boolean).join(" ")}>
      <Mono size="2xs" className={styles.label}>
        {copy.label}
      </Mono>
      <ul className={styles.lines}>
        {lines.map((line) => (
          <li key={line}>
            <Mono size="2xs" className={styles.line}>
              {line}
            </Mono>
          </li>
        ))}
      </ul>
    </div>
  );
}
