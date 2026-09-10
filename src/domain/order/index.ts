import { siteConfig } from "@/config/site";
import { routeForAddress } from "@/domain/checkout/delivery";

import { canTransition } from "./types";

import type { Money } from "@/data/commerce";
import type { CheckoutDraft, DeliverySelection, PricedLine } from "@/domain/checkout/types";
import type { Order, OrderLine, OrderTotals, PaymentState } from "./types";

export type {
  Order,
  OrderEvent,
  OrderEventKind,
  OrderLine,
  OrderStatus,
  OrderTotals,
  PaymentAttempt,
  PaymentState,
} from "./types";
export { canTransition, isSettled, TRANSITIONS } from "./types";
export {
  alreadySeen,
  applyPaymentEvent,
  recordAttempt,
  type ApplyOutcome,
  type ApplyResult,
  type NormalisedPaymentEvent,
} from "./events";
export { mutate, type OrderRepository, type SaveResult } from "./repository";

const mxn = (amount: number): Money => ({ amount, currency: "MXN" });

/**
 * WHAT AN ORDER COSTS.
 *
 * Returns NULL when it cannot be answered, which is the whole design. The
 * owner's shipping answer was "unsure, calculated probably" — so below the
 * confirmed MX$10,000 free-shipping threshold there is no rate, and this
 * refuses to produce a total rather than inventing one. The delivery step
 * explains that to the customer; `placementBlock` enforces it.
 *
 * NO TAX LINE. IVA is to be INCLUDED in displayed prices once they are final,
 * so adding it here would charge it twice.
 */
export function quote(
  lines: readonly PricedLine[],
  delivery: DeliverySelection | null,
): OrderTotals | null {
  if (lines.length === 0) return null;
  if (!delivery || delivery.price === null) return null;

  const subtotal = lines.reduce((n, l) => n + l.lineTotal.amount, 0);
  return {
    subtotal: mxn(subtotal),
    shipping: delivery.price,
    total: mxn(subtotal + delivery.price.amount),
  };
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

/**
 * FREEZE A DRAFT INTO AN ORDER.
 *
 * The snapshot happens HERE and only here. Everything downstream — the payment
 * attempt, the confirmation page, a future receipt — reads the order and never
 * the draft or the bag, so a bag edited in another tab after checkout began
 * cannot change what was agreed.
 *
 * The draft's snapshot is used AS IS, without re-pricing. That is intentional
 * and it is not a hole: the caller (`server/checkout/actions.ts`) reprices and
 * compares fingerprints BEFORE calling this, and refuses on a mismatch. Doing
 * it again here would silently accept the new price — the opposite of the
 * required behaviour — so the freshness check belongs to the step that can
 * show the customer what changed.
 *
 * Returns null rather than throwing when the draft is not orderable. Every
 * reason is enumerated by `placementBlock`, which the review screen renders;
 * this is the last enforcement, not the explanation.
 */
export function createOrder(
  draft: CheckoutDraft,
  contact: Order["contact"],
  shipping: Order["shipping"],
  now: () => string = () => new Date().toISOString(),
  id: () => string = newOrderId,
): Order | null {
  const totals = quote(draft.snapshot.lines, draft.delivery);
  if (!totals || !draft.delivery) return null;

  const at = now();
  return {
    id: id(),
    createdAt: at,
    updatedAt: at,
    /* Set to 1 by the repository on create; stated here so the object is
       complete and never carries an undefined version. */
    version: 1,
    state: "created",
    status: "placed",
    lines: draft.snapshot.lines.map(freeze),
    totals,
    contact,
    shipping,
    delivery: draft.delivery,
    route: routeForAddress(shipping),
    acknowledged: [...draft.acknowledged],
    providerRef: null,
    provider: null,
    attempts: [],
    events: [
      { seq: 1, at, kind: "created", providerEventId: null, from: null, to: "created", note: null },
    ],
  };
}

/** Copy a line so an order cannot share structure with the draft it came from. */
function freeze(line: PricedLine): OrderLine {
  return {
    variantId: line.variantId,
    slug: line.slug,
    name: line.name,
    presentation: line.presentation,
    unitPrice: { ...line.unitPrice },
    quantity: line.quantity,
    lineTotal: { ...line.lineTotal },
  };
}

/**
 * Advance an order, or refuse.
 *
 * Returns null on an illegal transition rather than throwing. For provider
 * callbacks use `applyPaymentEvent` instead — it adds deduplication, reference
 * matching and an audit entry, all of which a bare transition skips.
 */
export function transition(order: Order, to: PaymentState, at?: string): Order | null {
  if (!canTransition(order.state, to)) return null;
  const stamp = at ?? new Date().toISOString();
  return {
    ...order,
    state: to,
    updatedAt: stamp,
    events: [
      ...order.events,
      {
        seq: order.events.length + 1,
        at: stamp,
        kind: "status_changed",
        providerEventId: null,
        from: order.state,
        to,
        note: null,
      },
    ],
  };
}

/** Estimated delivery window in business days, from the confirmed config. */
export function estimateDays(order: Order): number {
  return siteConfig.fulfilment.estimateDays[order.route];
}

/**
 * Is this order paid?
 *
 * A function rather than a comparison at each call site, because the
 * confirmation page must never claim payment on anything else, and one
 * predicate is easier to audit than nine `=== "paid"` checks.
 */
export function isPaid(order: Order): boolean {
  return order.state === "paid";
}
