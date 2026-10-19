import "server-only";

import {
  activeBooking,
  answerBooking,
  carrierCancelled,
  carrierCancelRefused,
  failBooking,
  mutate,
  needsBooking,
  rebook,
  requestBooking,
  shipmentRefKey,
} from "@/domain/order";
import { signal } from "@/server/observe";
import { orderRepository } from "@/server/persistence";
import { shippingProviderById } from "@/shipping";
import { destinationFor } from "@/shipping/adapters/skydropx";

import type { Actor, Order, OrderRepository } from "@/domain/order";
import type { ShipmentSnapshot, ShippingProvider } from "@/shipping";

/**
 * BUYING THE LABEL FOR A PAID ORDER (D1) — once.
 *
 * Called after the order's payment is confirmed (scheduled after the
 * response, `scheduleBooking`), by the reconcile, and by an operator. Any
 * of them may run it again, or at the same time; the result is still one
 * label, because of three layers:
 *
 *   1. A booking RECORD is saved under the order's version lock before the
 *      provider is called (`requestBooking`). The second process to arrive
 *      finds it and joins it instead of starting another.
 *   2. The provider deduplicates by rate: Skydropx's `unique_shipment`
 *      replays the first answer for the same `rate_id` for 96 hours, and
 *      answers 409 while the first request is still running. So a request
 *      that timed out after Skydropx accepted it, repeated, returns THAT
 *      shipment — never a second one.
 *   3. A re-quote (the rate expired) is compare-and-set on the old rate id
 *      (`rebook`), and only ever happens before a shipment id is known.
 *
 * NEVER BEFORE PAYMENT. `needsBooking` requires `paid`, a quoted rate, no
 * cancellation, no dispute or hold and no active shipment. Declined,
 * abandoned, unresolved and cancelled orders never reach the provider.
 *
 * A FAILURE IS AN OPERATIONS PROBLEM, NOT AN UNPAID ORDER: the booking is
 * marked, the console flags it (`shipping_failed` / `shipping_unbooked`),
 * and the payment and the stock hold are untouched.
 */
export type BookingOutcome =
  "booked" | "creating" | "retry_later" | "failed" | "skipped" | "unconfigured";

function providerFor(order: Order): ShippingProvider | null {
  const provider = order.delivery.quote
    ? shippingProviderById(order.delivery.quote.provider)
    : null;
  return provider?.isConfigured() ? provider : null;
}

async function apply(
  repository: OrderRepository,
  orderId: string,
  op: (order: Order) => ReturnType<typeof answerBooking>,
): Promise<Order | null> {
  const result = await mutate(repository, orderId, (current) => {
    const r = op(current);
    return r.ok ? r.order : null;
  });
  return result.ok ? result.order : null;
}

function answerFrom(snapshot: ShipmentSnapshot) {
  return {
    providerRef: snapshot.providerRef,
    created: snapshot.booking === "created",
    carrier: snapshot.carrier,
    trackingNumber: snapshot.trackingNumber,
    trackingUrl: snapshot.trackingUrl,
    labelAvailable: snapshot.labelAvailable,
    cost: snapshot.cost,
    providerStatus: snapshot.providerStatus,
  };
}

export async function bookShipment(
  orderId: string,
  options: { afterChange?: (order: Order) => Promise<unknown> } = {},
): Promise<BookingOutcome> {
  const repository = orderRepository();
  let order = await repository.get(orderId);
  if (!order) return "skipped";
  const provider = providerFor(order);
  if (!provider) return order.delivery.quote ? "unconfigured" : "skipped";
  const parcel = provider.parcel();
  if (!parcel) return "unconfigured";

  /* 1. The record, before anything leaves the building. */
  if (needsBooking(order)) {
    const requested = await apply(repository, orderId, (o) =>
      requestBooking(o, new Date().toISOString()),
    );
    order = requested ?? (await repository.get(orderId));
    if (!order) return "skipped";
  }
  const shipment = activeBooking(order);
  if (!shipment?.booking) return "skipped";
  if (shipment.booking.status === "created" && shipment.providerRef) return "booked";
  if (shipment.booking.status === "failed") return "failed";
  /*
   * A cancelled order never buys a NEW label. If an earlier attempt may have
   * reached the provider, the console flags it for an operator to check.
   */
  if (order.cancellation || order.state !== "paid") return "skipped";

  /* 2. The provider, under the booking's rate. */
  const rateId = shipment.booking.rateId;
  let result = await provider.createShipment(order, parcel, rateId, shipment.id);

  /* 3. One re-quote if the rate itself was refused (expired, or withdrawn). */
  if (
    !result.ok &&
    result.error.code === "refused" &&
    result.error.detail === "rate_not_found" &&
    !shipment.providerRef
  ) {
    const q = order.delivery.quote!;
    const fresh = await provider.quote(destinationFor(order), parcel);
    const same = fresh.ok
      ? fresh.value.options.find(
          (o) => o.carrierCode === q.carrierCode && o.serviceCode === q.serviceCode,
        )
      : undefined;
    if (same) {
      const rebooked = await apply(repository, orderId, (o) =>
        rebook(
          o,
          shipment.id,
          rateId,
          { rateId: same.rateId, quotationId: same.quotationId, cost: same.cost },
          new Date().toISOString(),
        ),
      );
      if (rebooked) {
        order = rebooked;
        result = await provider.createShipment(order, parcel, same.rateId, shipment.id);
      }
    }
  }

  const at = new Date().toISOString();
  if (result.ok) {
    const answered = await apply(repository, orderId, (o) =>
      answerBooking(o, shipment.id, answerFrom(result.value), at),
    );
    if (answered && options.afterChange) await options.afterChange(answered);
    return result.value.booking === "created" ? "booked" : "creating";
  }

  /* A refusal is recorded by its reason (rate_not_found, insufficient_credits,
     carta_porte…), so an operator sees what to fix. */
  const code = result.error.code === "refused" ? result.error.detail : result.error.code;
  const retryable = result.error.code !== "refused" && result.error.code !== "configuration";
  signal("shipping.provider_error", retryable ? "warn" : "error", {
    orderId,
    code,
    view: "booking",
  });
  const failed = await apply(repository, orderId, (o) =>
    failBooking(o, shipment.id, code, retryable, at),
  );
  if (failed && options.afterChange) await options.afterChange(failed);
  return retryable ? "retry_later" : "failed";
}

/**
 * Ask the provider where a booked shipment stands, and apply it: the label
 * becoming available, tracking appearing, the parcel moving. The same
 * operations a webhook uses, so the two cannot disagree.
 */
export async function refreshShipment(
  orderId: string,
  apply_: (order: Order, snapshot: ShipmentSnapshot, shipmentId: string) => Promise<Order | null>,
): Promise<"refreshed" | "unchanged" | "unreachable" | "skipped"> {
  const order = await orderRepository().get(orderId);
  const shipment = order ? activeBooking(order) : null;
  if (!order || !shipment?.providerRef) return "skipped";
  const provider = shippingProviderById(shipment.provider);
  if (!provider?.isConfigured()) return "skipped";
  const result = await provider.getShipment(shipment.providerRef);
  if (!result.ok) return "unreachable";
  const updated = await apply_(order, result.value, shipment.id);
  return updated ? "refreshed" : "unchanged";
}

/** Cancel a label at its provider — a separate act from cancelling the order. */
export async function cancelLabel(
  orderId: string,
  shipmentId: string,
  actor: Actor,
): Promise<"cancelled" | "refused" | "unreachable" | "skipped"> {
  const repository = orderRepository();
  const order = await repository.get(orderId);
  const shipment = order?.shipments.find((s) => s.id === shipmentId);
  if (!order || !shipment?.providerRef) return "skipped";
  const provider = shippingProviderById(shipment.provider);
  if (!provider?.isConfigured()) return "skipped";
  const result = await provider.cancelShipment(shipment.providerRef, "Pedido cancelado");
  const at = new Date().toISOString();
  if (result.ok) {
    await apply(repository, orderId, (o) => carrierCancelled(o, shipmentId, actor, at));
    return "cancelled";
  }
  if (result.error.code === "refused") {
    await apply(repository, orderId, (o) =>
      carrierCancelRefused(
        o,
        shipmentId,
        result.error.code === "refused" ? result.error.detail : "",
        actor,
        at,
      ),
    );
    return "refused";
  }
  return "unreachable";
}

/** The order a provider shipment id belongs to. */
export function findByShipment(provider: string, providerRef: string): Promise<Order | null> {
  return orderRepository().findByProviderRef(shipmentRefKey(provider, providerRef));
}
