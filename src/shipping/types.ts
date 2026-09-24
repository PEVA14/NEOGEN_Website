import type { Money } from "@/data/commerce";
import type { Order, ShipmentState } from "@/domain/order/types";

/**
 * THE SHIPPING PROVIDER CONTRACT — built like `payments/types.ts`, for the
 * same reason: the first carrier or aggregator NEOGEN integrates must not
 * reshape the order, and a second must be able to arrive the same way.
 *
 * NO PROVIDER IS INTEGRATED. The owner has not chosen a national courier
 * (`siteConfig.tbd.nationalCourier` is null) and there is no rate model below
 * the free-shipping threshold, so the only adapter is `none`, which answers
 * every call with `unconfigured`. Parcels booked outside the system are
 * recorded by an operator as `manual` shipments — a record of what happened,
 * not a provider pretending to have done it.
 *
 * What an adapter would own, and nothing outside it may know: the carrier's
 * vocabulary, its authentication, its label format, and the mapping from its
 * tracking statuses to `ShipmentState`.
 */
export interface Parcel {
  /** Grams and centimetres. Unknown today — nobody has weighed a packed order. */
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface Quote {
  service: string;
  carrier: string;
  price: Money;
  /** The carrier's own estimate, in business days — never NEOGEN's promise. */
  estimateDays: number | null;
  /** Opaque, for `createShipment`. */
  quoteRef: string;
}

export interface CreatedShipment {
  providerRef: string;
  carrier: string;
  service: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelRef: string | null;
}

export interface TrackingSnapshot {
  providerRef: string;
  state: ShipmentState;
  /** Dedup key for this FACT (parcel + status), exactly like a payment snapshot. */
  eventId: string;
  at: string;
}

export type ShippingError =
  { code: "unconfigured" } | { code: "refused"; detail: string } | { code: "provider_error" };

export type ShippingResult<T> = { ok: true; value: T } | { ok: false; error: ShippingError };

export interface ShippingProvider {
  readonly id: string;
  isConfigured(): boolean;
  quote(order: Order, parcel: Parcel): Promise<ShippingResult<readonly Quote[]>>;
  /** Book a parcel. The idempotency key is the NEOGEN shipment id. */
  createShipment(
    order: Order,
    parcel: Parcel,
    quoteRef: string,
    idempotencyKey: string,
  ): Promise<ShippingResult<CreatedShipment>>;
  /** A short-lived URL to the label document. Never stored. */
  getLabel(providerRef: string): Promise<ShippingResult<{ url: string }>>;
  getTracking(providerRef: string): Promise<ShippingResult<TrackingSnapshot>>;
  cancelShipment(providerRef: string): Promise<ShippingResult<{ cancelled: true }>>;
}
