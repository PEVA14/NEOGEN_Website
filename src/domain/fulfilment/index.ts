import { siteConfig } from "@/config/site";

/**
 * FULFILMENT — what NEOGEN may say about shipping, as data rather than as copy.
 *
 * WHY THIS MODULE EXISTS. A shipping promise is the easiest fabrication on a
 * commerce site to make by accident: it is written once in a hero, once in a
 * FAQ and once on a product page, and two of the three outlive the fact. The
 * owner confirmed a narrow set of fulfilment facts (`config/site.ts`) and left
 * the rest explicitly undecided, so every surface that speaks about delivery
 * reads THIS, and the facts it prints cannot drift from the ones the checkout
 * actually quotes (`domain/checkout/delivery.ts` derives from the same config).
 *
 * THE STAKEHOLDER ASK, AND WHY IT IS NOT WHAT SHIPS.
 * -------------------------------------------------
 * The message requested was "envíos a México en 24 horas", with same-day
 * delivery where supported. The confirmed facts do not carry either:
 *
 *   national shipping           yes
 *   Guadalajara / Durango       1 business day  — and the owner was explicit
 *                               that this is NEXT-day, not same-day
 *   everywhere else in Mexico   up to 7 business days
 *   made to order               up to 14 business days
 *   same-day service            does not exist
 *   dispatch window             never stated by anyone
 *   national courier            not chosen
 *
 * So "24 hours anywhere in Mexico" would be false for most of the country, and
 * "same-day" would contradict the owner's own answer. What ships instead is the
 * true and still commercially strong version: fast where it is genuinely fast,
 * named, with the rest of the country given its real estimate.
 *
 * `supports()` below is the machine-checkable half of that. An unsupported
 * claim is not merely absent from the copy — it is a value the code answers
 * `false` to, and `check:content` fails if either dictionary starts promising
 * one anyway.
 */

/**
 * A delivery claim a commerce site might want to make.
 *
 * Listed — including the ones NEOGEN cannot make — so the answer to "can we
 * say this?" is a lookup rather than a memory, and so the gate has something
 * to assert against.
 */
export type ShippingClaimId =
  /** Ships to the whole country. */
  | "national"
  /** A named zone reached in one business day. */
  | "next-day-priority"
  /** Delivered the day the order is placed. */
  | "same-day"
  /** Delivered anywhere in Mexico within 24 hours. */
  | "nationwide-24h"
  /** Dispatched (handed to a courier) within a stated window. */
  | "dispatch-window"
  /** A named carrier. */
  | "courier"
  /** A shipping cost below the free-shipping threshold. */
  | "rates-below-threshold"
  /** Temperature-controlled transport. */
  | "cold-chain"
  /** Collection in person. */
  | "pickup";

/**
 * May this claim be published?
 *
 * Every answer is derived from `siteConfig`, never hard-coded, so confirming a
 * fact in one place turns the corresponding claim on everywhere at once — and
 * nobody has to find the surfaces that were waiting for it.
 */
export function supports(claim: ShippingClaimId): boolean {
  const { fulfilment, tbd } = siteConfig;
  switch (claim) {
    case "national":
      return fulfilment.national;
    case "next-day-priority":
      return fulfilment.priorityCities.length > 0 && fulfilment.estimateDays.priority <= 1;
    case "same-day":
      /*
       * FALSE BY CONSTRUCTION, and it takes a real fact to change that. The
       * owner's answer was next-day for the priority cities and nothing at all
       * for same-day, so there is no field in `siteConfig` that could make this
       * true: a same-day service would need its own confirmed cities and cut-off
       * time before it could be modelled, let alone printed.
       */
      return false;
    case "nationwide-24h":
      /* Would need EVERY route inside one business day. The national estimate
         is seven, so this is false until a different courier arrangement makes
         it true — and then it becomes true here on its own. */
      return fulfilment.estimateDays.national <= 1 && fulfilment.estimateDays.madeToOrder <= 1;
    case "dispatch-window":
      /* Nobody has stated how quickly an order leaves. Dispatch is the honest
         way to phrase a fast promise the courier does not control — but only
         once there is a real number, and there is not. */
      return false;
    case "courier":
      return tbd.nationalCourier !== null;
    case "rates-below-threshold":
      return tbd.shippingRates !== null;
    case "cold-chain":
      return tbd.coldChain !== null;
    case "pickup":
      return fulfilment.pickup;
  }
}

/**
 * The confirmed numbers, in one object, for copy that has to interpolate them.
 *
 * Returned rather than exported as a constant so a caller cannot hold a
 * reference to the config and start reading fields next to it that are `null`.
 */
export interface FulfilmentFacts {
  national: boolean;
  /** Cities the owner named as one-business-day. */
  priorityCities: readonly string[];
  priorityDays: number;
  nationalDays: number;
  madeToOrderDays: number;
  /** MXN subtotal at or above which shipping costs nothing. */
  freeShippingThreshold: number;
}

export function fulfilmentFacts(): FulfilmentFacts {
  const { fulfilment } = siteConfig;
  return {
    national: fulfilment.national,
    priorityCities: fulfilment.priorityCities,
    priorityDays: fulfilment.estimateDays.priority,
    nationalDays: fulfilment.estimateDays.national,
    madeToOrderDays: fulfilment.estimateDays.madeToOrder,
    freeShippingThreshold: fulfilment.freeShippingThreshold,
  };
}

/**
 * The priority zone as a reader would say it: "Guadalajara y Durango".
 *
 * The conjunction is localized, so it is passed in. Two cities today; the join
 * is written for a list because a third is a config edit away.
 */
export function priorityZone(and: string): string {
  const cities = [...siteConfig.fulfilment.priorityCities];
  if (cities.length === 0) return "";
  if (cities.length === 1) return cities[0];
  return `${cities.slice(0, -1).join(", ")} ${and} ${cities[cities.length - 1]}`;
}
