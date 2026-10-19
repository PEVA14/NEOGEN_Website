import type { Money } from "@/data/commerce";
import type { Order, ShipmentException, ShipmentState } from "@/domain/order/types";

/**
 * THE SHIPPING PROVIDER CONTRACT — built like `payments/types.ts`, for the
 * same reason: the carrier aggregator NEOGEN integrates must not reshape the
 * order, and a second must be able to arrive the same way.
 *
 * Skydropx is the V1 provider (owner decision B2, 2026-10-15). Parcels booked
 * outside the system are still recorded by an operator as `manual`
 * shipments — a record of what happened, not a provider pretending to have
 * done it.
 *
 * What an adapter owns, and nothing outside it may know: the provider's
 * vocabulary, its authentication, its label format, and the mapping from its
 * statuses to `ShipmentState`. NEOGEN stays the owner of the order: a
 * provider's word moves a SHIPMENT, never a payment.
 */

/** One packed order. Centimetres and kilograms, as configured by the owner. */
export interface Parcel {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
}

/** Where a quote goes — the fields a Mexican rate depends on. */
export interface QuoteDestination {
  postalCode: string;
  /** State name, e.g. "Jalisco". */
  state: string;
  /** City or municipality. */
  city: string;
  /** Colonia. */
  neighborhood: string;
}

/**
 * ONE PRICED OPTION, as the provider gave it. `cost` is what the provider
 * will charge NEOGEN (tax included) — never what the customer pays; that is
 * decided by NEOGEN's own rule (`domain/checkout/shipping`).
 */
export interface RateOption {
  rateId: string;
  quotationId: string;
  /** Display name, e.g. "FedEx". */
  carrier: string;
  /** Provider's carrier code, e.g. "fedex" — what allow/deny lists match. */
  carrierCode: string;
  service: string;
  serviceCode: string;
  cost: Money;
  /** The provider's own estimate in days. Null when it gave none — never guessed. */
  estimateDays: number | null;
}

export interface QuoteResult {
  quotationId: string;
  options: readonly RateOption[];
  quotedAt: string;
  /** When the provider stops honouring these rates. */
  expiresAt: string;
}

/** What the provider says about one booked shipment, already translated. */
export interface ShipmentSnapshot {
  providerRef: string;
  /** The booking itself: still being created, created, failed, or cancelled. */
  booking: "creating" | "created" | "failed" | "cancelled";
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  /** HTTPS only, or null. */
  trackingUrl: string | null;
  labelAvailable: boolean;
  /** What the provider charged for this shipment, when it says. */
  cost: Money | null;
  /** The parcel's movement, mapped. Null until the carrier reports anything. */
  tracking: { state: ShipmentState; exception: ShipmentException | null } | null;
  /** The provider's raw status words, for operators and audit only. */
  providerStatus: string | null;
}

/** One verified tracking fact from a webhook. */
export interface TrackingEvent {
  providerRef: string;
  /** Dedup key for this FACT (shipment + status), like a payment event. */
  eventId: string;
  state: ShipmentState;
  exception: ShipmentException | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  providerStatus: string;
}

export type ShippingWebhookVerdict =
  | { kind: "verified"; event: TrackingEvent }
  /**
   * Authentic, about the shipment ITSELF (its label was created, or it
   * could not be): read the shipment and apply what the provider says.
   */
  | { kind: "refresh"; providerRef: string }
  /** Authentic, but not about a parcel's movement. Acknowledge it. */
  | { kind: "ignored"; reason: string }
  | { kind: "unauthenticated" }
  | { kind: "malformed" };

export type ShippingError =
  | { code: "unconfigured" }
  /** Live labels are switched off for this deployment (SKYDROPX_LIVE_LABELS). */
  | { code: "not_allowed" }
  /** The provider refused the address itself. */
  | { code: "invalid_address" }
  /** A valid address no configured carrier serves. */
  | { code: "no_coverage" }
  /** The provider is still working on an identical request — ask again later. */
  | { code: "in_progress" }
  /** The provider refused the request (an expired rate, a shipment that cannot be cancelled). */
  | { code: "refused"; detail: string }
  /** No answer in time — the request may or may not have arrived. */
  | { code: "timeout" }
  /** The provider refused NEOGEN's own configuration (origin, parcel, codes). */
  | { code: "configuration" }
  | { code: "provider_error" };

export type ShippingResult<T> = { ok: true; value: T } | { ok: false; error: ShippingError };

export interface ShippingProvider {
  readonly id: string;
  isConfigured(): boolean;
  /** "sandbox" or "live". Null when unconfigured. */
  mode(): "sandbox" | "live" | null;
  /** The parcel every order ships in, from configuration. Null when not configured. */
  parcel(): Parcel | null;
  quote(destination: QuoteDestination, parcel: Parcel): Promise<ShippingResult<QuoteResult>>;
  /**
   * Book a parcel on a quoted rate. Idempotent: the same rate always means
   * the same shipment at the provider (Skydropx `unique_shipment`), and the
   * key is NEOGEN's shipment id.
   */
  createShipment(
    order: Order,
    parcel: Parcel,
    rateId: string,
    idempotencyKey: string,
  ): Promise<ShippingResult<ShipmentSnapshot>>;
  getShipment(providerRef: string): Promise<ShippingResult<ShipmentSnapshot>>;
  /** A short-lived URL to the label document. Never stored, never shown to a customer. */
  getLabel(providerRef: string): Promise<ShippingResult<{ url: string }>>;
  cancelShipment(providerRef: string, reason: string): Promise<ShippingResult<{ accepted: true }>>;
  verifyWebhook(input: { headers: Headers; body: string }): Promise<ShippingWebhookVerdict>;
}
