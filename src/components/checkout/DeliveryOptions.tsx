import { Body, Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";

import { formatDays, type DayCount } from "./days";

import styles from "./DeliveryOptions.module.css";

import type { DeliveryMethod, DeliveryMethodId } from "@/domain/checkout";

export interface DeliveryCopy {
  legend: string;
  methods: Record<DeliveryMethodId, { title: string; detail: string }>;
  estimate: string;
  /** Singular and plural — see `formatDays`. */
  estimateDays: DayCount;
  cost: string;
  free: string;
  ratePending: string;
  /** Explains why the flow stops when no rate applies. */
  ratePendingNote: string;
  handlingPending: string;
  none: string;
}

/**
 * DELIVERY METHODS — real radios, honest prices.
 *
 * WHY THE PRICE CAN READ "POR CONFIRMAR" AND STILL BLOCK THE ORDER.
 * -----------------------------------------------------------------
 * NEOGEN has one confirmed shipping fact: free above MX$10,000. The rate model
 * below that threshold does not exist — the owner's answer was "unsure,
 * calculated probably" — so a method priced below it has `price: null`, and
 * an order that cannot be totalled cannot be placed.
 *
 * The alternative would be to invent a figure, and there is no version of that
 * which is acceptable: too low and NEOGEN absorbs it, too high and the
 * customer is overcharged, and either way the number on the confirmation is
 * fiction. So the row states the situation, the note explains it, and the
 * customer is told what would resolve it — reaching the threshold — which is
 * useful information rather than a dead end.
 *
 * NO COURIER IS NAMED. A method is a service level NEOGEN offers, not a
 * carrier it has contracted, and no carrier has been chosen.
 *
 * `handling` is null for every method: whether any compound needs
 * temperature-controlled shipping has not been determined, and a method that
 * silently claimed "standard handling" would be determining it.
 */
export function DeliveryOptions({
  methods,
  selected,
  copy,
  localeTag,
}: {
  methods: readonly DeliveryMethod[];
  selected: DeliveryMethodId | null;
  copy: DeliveryCopy;
  localeTag: string;
}) {
  if (methods.length === 0) {
    return (
      <Body tone="muted" size="sm">
        {copy.none}
      </Body>
    );
  }

  return (
    <fieldset className={styles.set}>
      <legend className={styles.legend}>
        <Mono size="2xs">{copy.legend}</Mono>
      </legend>

      {methods.map((method) => {
        const name = copy.methods[method.id];
        return (
          <label
            key={method.id}
            className={styles.option}
            data-unquotable={method.price === null ? "true" : undefined}
          >
            <input
              type="radio"
              name="method"
              value={method.id}
              /*
               * Pre-selected when it is the only option AND already chosen, or
               * simply the only option. One choice that the customer still has
               * to click is friction with no purpose — but nothing is
               * pre-selected when there are several, because guessing a
               * delivery method is guessing what someone will pay for.
               */
              defaultChecked={selected === method.id || methods.length === 1}
              required
              className={styles.radio}
            />

            <span className={styles.body}>
              <span className={styles.titleRow}>
                <span className={styles.title}>{name.title}</span>
                <Mono size="2xs" className={styles.price}>
                  {method.price
                    ? method.price.amount === 0
                      ? copy.free
                      : formatPrice(method.price, localeTag)
                    : copy.ratePending}
                </Mono>
              </span>

              <Mono size="2xs" className={styles.meta}>
                {copy.estimate} — {formatDays(method.estimateDays, copy.estimateDays)}
              </Mono>

              <Body size="sm" tone="muted" className={styles.detail}>
                {name.detail}
              </Body>

              {/* Only where it is true, and it is true for every method today. */}
              {method.price === null ? (
                <Mono size="2xs" className={styles.pendingNote}>
                  {copy.ratePendingNote}
                </Mono>
              ) : null}
            </span>
          </label>
        );
      })}

      <Mono size="2xs" className={styles.handling}>
        {copy.handlingPending}
      </Mono>
    </fieldset>
  );
}
