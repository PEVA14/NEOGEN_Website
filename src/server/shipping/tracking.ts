import "server-only";

import {
  activeBooking,
  answerBooking,
  applyTracking,
  carrierCancelled,
  failBooking,
  mutate,
  needsBooking,
  SYSTEM,
} from "@/domain/order";
import { afterOrderChange } from "@/server/orders";
import { signal } from "@/server/observe";
import { orderRepository } from "@/server/persistence";

import { bookShipment, findByShipment, refreshShipment } from "./booking";

import type { Order } from "@/domain/order";
import type { ShipmentSnapshot, TrackingEvent } from "@/shipping";

/**
 * TRACKING — the provider's word on a parcel, applied to NEOGEN's shipment
 * (D1). A webhook and a refresh both end in `applyTracking`, so how a fact
 * arrived cannot change what it means. Deduplicated by event id; an older
 * fact after a newer one changes nothing. Then the usual `afterOrderChange`:
 * stock is consumed when the parcel leaves, and the customer's messages
 * (shipped, tracking, delivered, a delivery problem) are queued once each.
 */
export type TrackingOutcome = "applied" | "duplicate" | "stale" | "unknown_shipment" | "failed";

export async function applyTrackingEvent(
  provider: string,
  event: TrackingEvent,
): Promise<TrackingOutcome> {
  const order = await findByShipment(provider, event.providerRef);
  if (!order) {
    /* A shipment NEOGEN has not recorded yet (its booking's answer is still
       in flight) — the refresh path will pick it up. */
    signal("shipping.webhook_unknown", "warn", { provider });
    return "unknown_shipment";
  }
  const shipment = order.shipments.find((s) => s.providerRef === event.providerRef);
  if (!shipment) return "unknown_shipment";
  if (order.events.some((e) => e.providerEventId === event.eventId)) return "duplicate";

  let refusal: string | null = null;
  const result = await mutate(orderRepository(), order.id, (current) => {
    const r = applyTracking(current, shipment.id, event, new Date().toISOString());
    refusal = r.ok ? null : r.reason;
    return r.ok ? r.order : null;
  });
  if (!result.ok) return result.reason === "not_found" ? "unknown_shipment" : "failed";
  if (refusal === "duplicate") return "duplicate";
  if (refusal) return "stale";
  await afterOrderChange(result.order);
  return "applied";
}

/** Apply a full provider snapshot (a refresh): the booking's answer, then the parcel. */
export async function applySnapshot(
  order: Order,
  snapshot: ShipmentSnapshot,
  shipmentId: string,
): Promise<Order | null> {
  const at = new Date().toISOString();
  const result = await mutate(orderRepository(), order.id, (current) => {
    let next = current;
    let changed = false;
    if (snapshot.booking === "failed") {
      const r = failBooking(next, shipmentId, "provider_failed", false, at);
      if (r.ok) [next, changed] = [r.order, true];
    } else {
      const r = answerBooking(
        next,
        shipmentId,
        {
          providerRef: snapshot.providerRef,
          created: snapshot.booking === "created" || snapshot.booking === "cancelled",
          carrier: snapshot.carrier,
          trackingNumber: snapshot.trackingNumber,
          trackingUrl: snapshot.trackingUrl,
          labelAvailable: snapshot.labelAvailable,
          cost: snapshot.cost,
          providerStatus: snapshot.providerStatus,
        },
        at,
      );
      if (r.ok && JSON.stringify(r.order.shipments) !== JSON.stringify(next.shipments)) {
        [next, changed] = [r.order, true];
      }
    }
    if (snapshot.booking === "cancelled") {
      const r = carrierCancelled(next, shipmentId, SYSTEM, at);
      if (r.ok) [next, changed] = [r.order, true];
    } else if (snapshot.tracking) {
      const r = applyTracking(
        next,
        shipmentId,
        {
          eventId: `${current.shipments.find((s) => s.id === shipmentId)?.provider}:${snapshot.providerRef}:${snapshot.providerStatus ?? ""}`,
          state: snapshot.tracking.state,
          exception: snapshot.tracking.exception,
          trackingNumber: snapshot.trackingNumber,
          trackingUrl: snapshot.trackingUrl,
          providerStatus: snapshot.providerStatus ?? "",
        },
        at,
      );
      if (r.ok) [next, changed] = [r.order, true];
    }
    return changed ? next : null;
  });
  if (!result.ok) return null;
  return afterOrderChange(result.order);
}

/** Refresh one order's provider shipment — the console's button and the reconcile. */
export function refreshOrderShipment(orderId: string) {
  return refreshShipment(orderId, applySnapshot);
}

/**
 * THE SHIPPING RECONCILE (D1) — run by the scheduled job with the payment
 * reconcile. Paid orders still without a label get their booking (again —
 * the same idempotent path); booked parcels not yet delivered are refreshed
 * from the provider, which also covers a webhook that never arrived or
 * arrived before NEOGEN knew the shipment's id. Bounded by count and time;
 * counts only in its answer.
 */
export async function reconcileShipments(
  options: { limit?: number; budgetMs?: number } = {},
): Promise<{ booked: number; refreshed: number; failed: number; checked: number }> {
  const limit = options.limit ?? 50;
  const budgetMs = options.budgetMs ?? 40_000;
  const started = Date.now();
  const repository = orderRepository();
  const summary = { booked: 0, refreshed: 0, failed: 0, checked: 0 };
  const seen = new Set<string>();
  for (const view of ["to_fulfil", "preparing", "ready_to_ship", "in_transit"] as const) {
    const { orders } = await repository.list({ view, limit, now: new Date().toISOString() });
    for (const order of orders) {
      if (seen.has(order.id) || Date.now() - started > budgetMs) continue;
      seen.add(order.id);
      const booking = activeBooking(order);
      if (
        needsBooking(order) ||
        (booking?.booking?.status === "requested" && !booking.providerRef)
      ) {
        summary.checked += 1;
        const outcome = await bookShipment(order.id, { afterChange: afterOrderChange });
        if (outcome === "booked" || outcome === "creating") summary.booked += 1;
        else if (outcome === "failed" || outcome === "retry_later") summary.failed += 1;
      } else if (
        booking?.providerRef &&
        ["pending", "in_transit", "exception"].includes(booking.state)
      ) {
        summary.checked += 1;
        const outcome = await refreshOrderShipment(order.id);
        if (outcome === "refreshed") summary.refreshed += 1;
        else if (outcome === "unreachable") summary.failed += 1;
      }
    }
  }
  signal("shipping.reconciled", summary.failed > 0 ? "warn" : "info", {
    count: summary.checked,
    settled: summary.booked,
    released: summary.refreshed,
    failed: summary.failed,
  });
  return summary;
}
