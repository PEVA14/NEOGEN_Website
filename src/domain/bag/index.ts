import { ORDER_LIMITS } from "@/data/commerce/limits";
import { siteConfig } from "@/config/site";

import type { Money } from "@/data/commerce";
import type { Bag, BagLine, BagTotals } from "./types";

export type { Bag, BagLine, BagTotals } from "./types";
export { EMPTY_BAG, readBag, writeBag } from "./storage";
export { useBag, type UseBag } from "./useBag";

const mxn = (amount: number): Money => ({ amount, currency: "MXN" });

/** Total units, not distinct lines. */
function countUnits(lines: readonly BagLine[]): number {
  return lines.reduce((n, line) => n + line.quantity, 0);
}

function withCount(lines: readonly BagLine[]): Bag {
  return { lines, count: countUnits(lines) };
}

/**
 * Clamp to the owner's limits.
 *
 * `max` is a provisional ceiling, not a stock statement — there is no stock
 * figure to cap against. Applied per LINE: the limit is on how many of one
 * presentation someone orders, which is the thing a typo produces.
 */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return ORDER_LIMITS.min;
  return Math.min(ORDER_LIMITS.max, Math.max(ORDER_LIMITS.min, Math.round(quantity)));
}

/**
 * Add units of a variant, merging into an existing line.
 *
 * Adding the same presentation twice increments rather than appending, because
 * two lines for one thing is a bug the customer has to clean up.
 */
export function addLine(bag: Bag, line: Omit<BagLine, "quantity">, quantity = 1): Bag {
  const existing = bag.lines.find((l) => l.variantId === line.variantId);
  if (existing) {
    return setQuantity(bag, line.variantId, existing.quantity + quantity);
  }
  return withCount([...bag.lines, { ...line, quantity: clampQuantity(quantity) }]);
}

/** Set an exact quantity. Dropping to zero removes the line. */
export function setQuantity(bag: Bag, variantId: string, quantity: number): Bag {
  if (quantity < ORDER_LIMITS.min) return removeLine(bag, variantId);
  return withCount(
    bag.lines.map((l) =>
      l.variantId === variantId ? { ...l, quantity: clampQuantity(quantity) } : l,
    ),
  );
}

export function removeLine(bag: Bag, variantId: string): Bag {
  return withCount(bag.lines.filter((l) => l.variantId !== variantId));
}

export function clearBag(): Bag {
  return withCount([]);
}

/**
 * WHAT THE BAG COSTS.
 *
 * Every line is priced in MXN by construction — the catalogue has one currency
 * and the type enforces it — so the subtotal is a plain sum with no conversion
 * to get wrong.
 */
export function totals(bag: Bag): BagTotals {
  const subtotal = bag.lines.reduce((n, line) => n + line.unitPrice.amount * line.quantity, 0);
  const threshold = siteConfig.fulfilment.freeShippingThreshold;
  const reached = subtotal >= threshold;

  return {
    subtotal: mxn(subtotal),
    /*
     * Free once the threshold is met — a real, owner-confirmed fact. Below it,
     * NULL rather than a number: no rate model has been chosen, so the amount
     * is genuinely unknown and the UI must not print one.
     */
    shipping: reached ? mxn(0) : null,
    total: mxn(subtotal),
    freeShippingRemaining: reached ? null : mxn(threshold - subtotal),
    freeShippingProgress: threshold > 0 ? Math.min(1, subtotal / threshold) : 1,
  };
}

/**
 * RECONCILE A RESTORED BAG AGAINST THE LIVE CATALOGUE.
 *
 * A bag can outlive the data it was built from: a variant is withdrawn, a
 * product is unpublished, a provisional price is corrected. Restoring one
 * blind would show a customer a price we no longer charge, or a line for
 * something we no longer sell.
 *
 * So a restored bag is checked. Lines whose variant has gone are DROPPED;
 * lines whose price has moved are updated and REPORTED, so the bag page can
 * say what changed instead of quietly charging the new number.
 */
export interface Reconciliation {
  bag: Bag;
  removed: readonly BagLine[];
  repriced: readonly { line: BagLine; was: Money }[];
}

export function reconcile(bag: Bag, priceOf: (variantId: string) => Money | null): Reconciliation {
  const removed: BagLine[] = [];
  const repriced: { line: BagLine; was: Money }[] = [];
  const lines: BagLine[] = [];

  for (const line of bag.lines) {
    const current = priceOf(line.variantId);
    if (!current) {
      removed.push(line);
      continue;
    }
    if (current.amount !== line.unitPrice.amount) {
      const updated = { ...line, unitPrice: current };
      repriced.push({ line: updated, was: line.unitPrice });
      lines.push(updated);
      continue;
    }
    lines.push(line);
  }

  return { bag: withCount(lines), removed, repriced };
}
