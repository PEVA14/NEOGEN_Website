import { activeShipment, openRefund } from "./operations";

import type { Order, Refund, Shipment } from "./types";

/**
 * WHAT A CUSTOMER IS TOLD ABOUT THEIR ORDER — derived, never embellished.
 *
 * One headline and, while the order is moving normally, four steps:
 *
 *   paid → preparing → shipped → delivered
 *
 * A step is `done` only when the order's own record says it happened (a
 * milestone the provider or an operator set), `current` when the order is in
 * it, and `upcoming` otherwise. Paying does not make a parcel "shipped";
 * "ready to ship" is shown as part of preparing, because to a customer the
 * parcel has not left. Off the normal path — unpaid, cancelled, refunded,
 * disputed, held, returned — there is no progress bar at all, only a plain
 * statement, because a bar would imply movement that is not happening.
 */
export type CustomerHeadline =
  | "unpaid"
  | "confirmed"
  | "preparing"
  | "ready"
  | "in_transit"
  | "exception"
  | "delivered"
  | "returned"
  | "review"
  | "disputed"
  | "cancelled"
  | "refunded";

export type StepId = "paid" | "preparing" | "shipped" | "delivered";

export interface CustomerStep {
  id: StepId;
  status: "done" | "current" | "upcoming";
  /** When it was reached — only for `done` steps, from the order's milestones. */
  at: string | null;
}

export interface CustomerView {
  headline: CustomerHeadline;
  /** Null off the normal path: no bar is drawn. */
  steps: readonly CustomerStep[] | null;
  shipment: Shipment | null;
  refund: Refund | null;
}

function headlineFor(order: Order, shipment: Shipment | null): CustomerHeadline {
  if (order.state === "refunded") return "refunded";
  if (order.state === "disputed") return "disputed";
  if (order.fulfilment.state === "cancelled" || order.state === "cancelled") return "cancelled";
  if (order.state !== "paid") return "unpaid";
  if (shipment?.state === "returned") return "returned";
  if (shipment?.state === "delivered") return "delivered";
  if (shipment?.state === "exception") return "exception";
  if (shipment?.state === "in_transit") return "in_transit";
  switch (order.fulfilment.state) {
    case "on_hold":
      return "review";
    case "preparing":
      return "preparing";
    case "ready_to_ship":
      return "ready";
    case "fulfilled":
      return "in_transit";
    default:
      return "confirmed";
  }
}

const ON_PATH: readonly CustomerHeadline[] = [
  "confirmed",
  "preparing",
  "ready",
  "in_transit",
  "exception",
  "delivered",
];

export function customerView(order: Order): CustomerView {
  const shipment = activeShipment(order);
  const headline = headlineFor(order, shipment);
  const refund =
    openRefund(order) ?? order.refunds.findLast((r) => r.status === "confirmed") ?? null;

  if (!ON_PATH.includes(headline)) {
    return { headline, steps: null, shipment: headline === "returned" ? shipment : null, refund };
  }

  const reached: Record<StepId, string | null> = {
    paid: order.milestones.paid ?? null,
    preparing: order.milestones.preparing ?? order.milestones.ready ?? null,
    shipped: shipment?.shippedAt ?? null,
    delivered: shipment?.deliveredAt ?? null,
  };
  const currentStep: StepId =
    headline === "delivered"
      ? "delivered"
      : headline === "in_transit" || headline === "exception"
        ? "shipped"
        : headline === "preparing" || headline === "ready"
          ? "preparing"
          : "paid";

  const order_: StepId[] = ["paid", "preparing", "shipped", "delivered"];
  const currentIndex = order_.indexOf(currentStep);
  const steps = order_.map((id, i): CustomerStep => {
    if (
      i < currentIndex ||
      (id === "paid" && reached.paid) ||
      (id === "delivered" && reached.delivered)
    ) {
      return { id, status: "done", at: reached[id] };
    }
    if (i === currentIndex) return { id, status: "current", at: null };
    return { id, status: "upcoming", at: null };
  });

  return { headline, steps, shipment, refund };
}
