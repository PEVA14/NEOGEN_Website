import type { ShipmentException, ShipmentState } from "@/domain/order/types";
import type { RateOption, ShipmentSnapshot } from "../../types";

/**
 * SKYDROPX'S WORDS → NEOGEN'S — the only place they are translated.
 *
 * Read from the official API reference (`/es-MX/api-docs.json`, OpenAPI
 * 3.0.1 "Skydropx API v1", fetched 2026-10-15). A word not listed here is
 * never guessed into a state: it maps to null, the event is ignored and the
 * raw status is kept for an operator.
 */

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Only https links leave this module. */
export function httpsOrNull(value: unknown): string | null {
  const s = str(value).trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * A rate the customer may be offered: the provider says it succeeded, it has
 * a positive total in pesos, and it is not one of the documented "no price"
 * states. The docs list `approved` as the found state and show
 * `price_found_*` in examples; both are accepted — a rate's `success` and
 * `total` are what decide.
 */
const NO_PRICE = new Set([
  "pending",
  "not_applicable",
  "no_coverage",
  "tariff_price_not_found",
  "error",
  "errored",
]);

export function rateOptions(quotation: unknown): RateOption[] {
  const q = (quotation ?? {}) as { id?: unknown; rates?: unknown };
  const quotationId = str(q.id);
  const rates = Array.isArray(q.rates) ? q.rates : [];
  const out: RateOption[] = [];
  for (const raw of rates) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const total = num(r.total);
    if (r.success !== true || total === null || total <= 0) continue;
    /* "Si es true, el shipment fallará al crearse hasta completar la
       verificación" — never offer a rate whose label cannot be bought. */
    if (r.requires_origin_verification === true) continue;
    if (NO_PRICE.has(str(r.status))) continue;
    if (str(r.currency_code) && str(r.currency_code) !== "MXN") continue;
    if (!str(r.id) || !str(r.provider_name)) continue;
    const days = num(r.days);
    out.push({
      rateId: str(r.id),
      quotationId,
      carrier: str(r.provider_display_name) || str(r.provider_name),
      carrierCode: str(r.provider_name).toLowerCase(),
      service: str(r.provider_service_name) || str(r.provider_service_code),
      serviceCode: str(r.provider_service_code).toLowerCase(),
      /* Pesos with centavos as the provider gives them; NEOGEN rounds once, up. */
      cost: { amount: Math.ceil(total), currency: "MXN" },
      estimateDays: days !== null && days >= 0 && Number.isInteger(days) ? days : null,
    });
  }
  return out;
}

/**
 * PARCEL STATUS (webhook `packages.status`, package `tracking_status`) →
 * shipment state. From the "Webhooks" section: created, picked_up,
 * in_transit, last_mile, delivery_attempt, delivered, delivered_to_branch,
 * exception, in_return (with `returned_status`), canceled, error.
 */
export function trackingState(
  status: string,
  returnedStatus: string | null = null,
): { state: ShipmentState; exception: ShipmentException | null } | null {
  switch (status.toLowerCase()) {
    case "created":
      return { state: "pending", exception: null };
    case "picked_up":
    case "in_transit":
    case "last_mile":
      return { state: "in_transit", exception: null };
    case "delivery_attempt":
      return { state: "exception", exception: "delivery_attempt" };
    case "delivered_to_branch":
      return { state: "exception", exception: "at_branch" };
    case "exception":
      return { state: "exception", exception: "carrier" };
    case "delivered":
      return { state: "delivered", exception: null };
    case "in_return":
      return returnedStatus?.toLowerCase() === "delivered"
        ? { state: "returned", exception: null }
        : { state: "exception", exception: "returning" };
    case "canceled":
    case "cancelled":
      return { state: "cancelled", exception: null };
    default:
      /* `error` (the shipment was never created) and anything unlisted. */
      return null;
  }
}

/** Shipment `workflow_status` → the booking's own state. Unknown stays "creating". */
function bookingState(workflow: string): ShipmentSnapshot["booking"] {
  switch (workflow.toLowerCase()) {
    case "success":
    case "completed":
    case "created":
      return "created";
    case "error":
    case "failed":
    case "errored":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "creating";
  }
}

/**
 * A shipment response (`POST /shipments`, `GET /shipments/{id}`, JSON:API:
 * `data` plus `included` packages) → snapshot. Null when the body does not
 * identify a shipment — nothing is half-translated.
 */
export function shipmentSnapshot(body: unknown): ShipmentSnapshot | null {
  const b = (body ?? {}) as { data?: unknown; included?: unknown };
  const data = (b.data ?? {}) as { id?: unknown; attributes?: Record<string, unknown> };
  const id = str(data.id) || str(data.attributes?.id);
  if (!id) return null;
  const a = data.attributes ?? {};
  const included = Array.isArray(b.included) ? (b.included as Record<string, unknown>[]) : [];
  const pkg = included.find((i) => str(i?.type).startsWith("package"));
  const p = (pkg?.attributes ?? {}) as Record<string, unknown>;
  const trackingStatus = str(p.tracking_status);
  const total = num(a.total);
  /* `error_detail` is documented as present "cuando el envío falla" — a
     failure whatever `workflow_status` says (its values are not enumerated). */
  const failed = a.error_detail !== null && typeof a.error_detail === "object";
  return {
    providerRef: id,
    booking: failed ? "failed" : bookingState(str(a.workflow_status)),
    carrier: str(a.carrier_name) || null,
    service: null,
    trackingNumber: str(p.tracking_number) || str(a.master_tracking_number) || null,
    trackingUrl: httpsOrNull(p.tracking_url_provider),
    labelAvailable: httpsOrNull(p.label_url) !== null,
    cost: total !== null && total > 0 ? { amount: Math.ceil(total), currency: "MXN" } : null,
    tracking: trackingStatus ? trackingState(trackingStatus) : null,
    providerStatus: [str(a.workflow_status), trackingStatus].filter(Boolean).join(" / ") || null,
  };
}

/** The label document's URL in a shipment response, https only. */
export function labelUrl(body: unknown): string | null {
  const included = Array.isArray((body as { included?: unknown })?.included)
    ? ((body as { included: Record<string, unknown>[] }).included ?? [])
    : [];
  for (const i of included) {
    const url = httpsOrNull((i?.attributes as Record<string, unknown> | undefined)?.label_url);
    if (url) return url;
  }
  return null;
}
