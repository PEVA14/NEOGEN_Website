import { siteConfig } from "@/config/site";

import { canTransition } from "./types";

import type { Money } from "@/data/commerce";
import type { Bag } from "@/domain/bag";
import type { Order, OrderLine, OrderTotals, PaymentState, ShippingAddress } from "./types";

export type { Order, OrderLine, OrderTotals, PaymentState, ShippingAddress } from "./types";
export { canTransition, isSettled, TRANSITIONS } from "./types";

const mxn = (amount: number): Money => ({ amount, currency: "MXN" });

/**
 * Cities the owner confirmed as next-day, matched case- and accent-insensitively
 * because a customer types "guadalajara" as often as "Guadalajara".
 */
function routeFor(address: ShippingAddress | null): Order["route"] {
  if (!address) return null;
  const normalise = (s: string) =>
    s.toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const city = normalise(address.city);
  const priority = siteConfig.fulfilment.priorityCities.map(normalise);
  return priority.some((p) => city.includes(p)) ? "priority" : "national";
}

/**
 * FREEZE A BAG INTO AN ORDER.
 *
 * The snapshot happens HERE and only here. Everything downstream — payment,
 * confirmation, a receipt — reads the order, never the bag, so a bag edited in
 * another tab after checkout began cannot change what was agreed.
 *
 * Shipping is zero when the threshold is met, which is a confirmed fact. Below
 * it there is no rate model, so an order cannot yet be created — `quote`
 * returns null and the caller must not proceed. That is deliberately a hard
 * stop rather than a guess: charging a made-up shipping figure is worse than
 * not being able to check out.
 */
export function quoteTotals(bag: Bag): OrderTotals | null {
  const subtotal = bag.lines.reduce((n, l) => n + l.unitPrice.amount * l.quantity, 0);
  if (subtotal < siteConfig.fulfilment.freeShippingThreshold) return null;
  return { subtotal: mxn(subtotal), shipping: mxn(0), total: mxn(subtotal) };
}

export function bagToLines(bag: Bag): OrderLine[] {
  return bag.lines.map((line) => ({
    variantId: line.variantId,
    slug: line.slug,
    name: line.name,
    presentation: line.presentation,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    lineTotal: mxn(line.unitPrice.amount * line.quantity),
  }));
}

/**
 * A customer-facing reference.
 *
 * `NG-` plus a base-36 timestamp and a short random tail: sortable by
 * creation, short enough to read over the phone, and carrying no sequence a
 * competitor could count. Not a security token — orders are authorised by
 * session, never by knowing an id.
 */
export function newOrderId(now = Date.now(), random = Math.random): string {
  const stamp = now.toString(36).toUpperCase();
  const tail = Math.floor(random() * 36 ** 3)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `NG-${stamp}-${tail}`;
}

export function createOrder(
  bag: Bag,
  details: { email?: string | null; shipping?: ShippingAddress | null } = {},
): Order | null {
  const totals = quoteTotals(bag);
  if (!totals || bag.lines.length === 0) return null;

  return {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    state: "created",
    lines: bagToLines(bag),
    totals,
    email: details.email ?? null,
    shipping: details.shipping ?? null,
    route: routeFor(details.shipping ?? null),
    providerRef: null,
    provider: null,
  };
}

/**
 * Advance an order, or refuse.
 *
 * Returns null on an illegal transition rather than throwing, because the
 * caller that hits one is a webhook handler receiving a redelivered or
 * out-of-order event — an ordinary condition to acknowledge and ignore, not an
 * exception to surface.
 */
export function transition(order: Order, to: PaymentState): Order | null {
  if (!canTransition(order.state, to)) return null;
  return { ...order, state: to };
}

/** Estimated delivery window in business days, from the confirmed config. */
export function estimateDays(order: Order): number | null {
  if (!order.route) return null;
  return siteConfig.fulfilment.estimateDays[order.route];
}
