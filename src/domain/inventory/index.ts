import { activeShipment } from "@/domain/order/operations";

import type { Order } from "@/domain/order/types";
import type { HoldRequest } from "./types";

export * from "./types";

/**
 * WHAT THE SHELF SHOULD SAY ABOUT THIS ORDER — derived, never counted.
 *
 *   consumed   the parcel left (fulfilled, or a carrier has it)
 *   released   cancelled before dispatch, or not paid and nothing in flight
 *   held       payment in flight or taken, parcel not yet out
 *
 * The server compares this with the store after every order change and moves
 * the difference, so a missed step (a crash between the order write and the
 * stock write) is repaired by the next change rather than lost.
 */
export type DesiredHold = "held" | "released" | "consumed";

export function desiredHold(order: Order): DesiredHold {
  const shipment = activeShipment(order);
  if (
    order.fulfilment.state === "fulfilled" ||
    (shipment !== null && shipment.state !== "pending" && shipment.state !== "cancelled")
  ) {
    return "consumed";
  }
  if (order.fulfilment.state === "cancelled") return "released";
  switch (order.state) {
    case "payment_processing":
    case "pending_payment":
    case "paid":
    case "disputed":
      return "held";
    default:
      return "released";
  }
}

/** One request per SKU, quantities summed — an order may list a SKU once, but be safe. */
export function holdLines(order: Order): HoldRequest[] {
  const by = new Map<string, number>();
  for (const line of order.lines) {
    by.set(line.variantId, (by.get(line.variantId) ?? 0) + line.quantity);
  }
  return [...by.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** Pure validation shared by both stores. */
export function validAdjustment(mode: "count" | "adjustment", quantity: number): boolean {
  if (!Number.isInteger(quantity) || Math.abs(quantity) > 100_000) return false;
  return mode === "count" ? quantity >= 0 : quantity !== 0;
}
