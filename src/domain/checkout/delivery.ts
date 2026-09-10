import { siteConfig } from "@/config/site";

import type { Money } from "@/data/commerce";
import type { DeliveryMethod, DeliveryMethodId, DeliverySelection, MxAddress } from "./types";

const mxn = (amount: number): Money => ({ amount, currency: "MXN" });

/**
 * DELIVERY — the model, built to the confirmed facts and no further.
 *
 * WHAT IS CONFIRMED: national shipping exists; Guadalajara and Durango are
 * next-day; free shipping at MX$10,000. All three are in `siteConfig`, stated
 * by the owner.
 *
 * WHAT IS NOT: the rate model ("calculated probably"), the courier, and
 * whether anything needs cold chain. So this module derives a method's price
 * ONLY from the free-shipping threshold. Below it, `price` is null and the
 * checkout cannot total the order — which is the honest outcome, and one the
 * delivery screen explains rather than a dead end the customer has to guess at.
 *
 * NO COURIER NAMES ANYWHERE. A method is a service level NEOGEN offers, not a
 * carrier it has contracted, and printing a carrier before one is chosen would
 * be the same fabrication as printing a rate.
 */

/** Cities the owner named as next-day, matched accent- and case-insensitively. */
function normalise(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Which fulfilment route an address falls into.
 *
 * Matched on CITY, and also on the state code for Durango and Jalisco: someone
 * in Guadalajara routinely writes "Zapopan" or "Tlaquepaque", which is the same
 * metropolitan area and the same next-day run. Widening to the state is the
 * closest honest approximation available without a coverage list, and it errs
 * toward the faster estimate for neighbouring municipalities rather than
 * against them.
 */
export function routeForAddress(
  address: Pick<MxAddress, "city" | "state">,
): "priority" | "national" {
  const city = normalise(address.city);
  const named = siteConfig.fulfilment.priorityCities.some((c) => city.includes(normalise(c)));
  /* JAL = Jalisco (Guadalajara), DUR = Durango. */
  const priorityState = address.state === "JAL" || address.state === "DUR";
  return named || priorityState ? "priority" : "national";
}

/**
 * The methods available for one address at one subtotal.
 *
 * Exactly one is returned today, because the routes are mutually exclusive:
 * an address is either in the priority zone or it is not, and offering a
 * customer a slower option for the same (unknown) price would be a choice
 * without a reason. The signature returns a LIST so that adding a genuine
 * second service level — express, pickup, a courier tier — needs no call-site
 * change.
 */
/**
 * WHAT SHIPPING COSTS BEFORE A METHOD IS CHOSEN.
 *
 * Free shipping is a property of the SUBTOTAL, not of the route: at or above
 * MX$10,000 it is free wherever the package goes. So the amount is knowable
 * from the first step of checkout, and the summary can show a real total
 * rather than deferring it.
 *
 * That matters because the alternative was actively contradictory: the
 * free-shipping meter said "reached" while the shipping row beside it said
 * "to be confirmed". Both were technically defensible — the meter reads the
 * subtotal, the row read the unselected method — and together they were
 * nonsense to a customer.
 *
 * Below the threshold this is still null, because that is still unknown.
 */
export function provisionalShipping(subtotal: Money): Money | null {
  return subtotal.amount >= siteConfig.fulfilment.freeShippingThreshold ? mxn(0) : null;
}

export function methodsFor(
  address: Pick<MxAddress, "city" | "state">,
  subtotal: Money,
): readonly DeliveryMethod[] {
  const route = routeForAddress(address);
  /* One definition of the threshold rule, shared with the summary. */
  const price = provisionalShipping(subtotal);

  const method: DeliveryMethod = {
    id: route === "priority" ? "local-priority" : "national-standard",
    route,
    estimateDays: siteConfig.fulfilment.estimateDays[route],
    /* The ONLY rate this system knows. Everything else is null. */
    price,
    basis: price ? "free-threshold" : "rate-model-pending",
    /* Cold chain undetermined — see siteConfig.tbd.coldChain. */
    handling: null,
  };

  return [method];
}

export function methodById(
  address: Pick<MxAddress, "city" | "state">,
  subtotal: Money,
  id: DeliveryMethodId,
): DeliveryMethod | null {
  return methodsFor(address, subtotal).find((m) => m.id === id) ?? null;
}

/**
 * Freeze a method into the draft.
 *
 * The price travels with the selection rather than being recomputed at
 * display time, so the delivery cost shown on the review screen is the one
 * the customer chose — and any later divergence is a detectable mismatch
 * rather than a number that quietly moved.
 */
export function select(method: DeliveryMethod): DeliverySelection {
  return {
    methodId: method.id,
    route: method.route,
    estimateDays: method.estimateDays,
    price: method.price,
  };
}

/** Whether an order carrying this selection can be totalled at all. */
export function isQuotable(selection: DeliverySelection | null): boolean {
  return selection !== null && selection.price !== null;
}
