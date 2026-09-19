import type { PaymentState } from "@/domain/order/types";
import type { DeclineReason, PaymentSnapshot } from "../../types";

/**
 * MERCADO PAGO'S VOCABULARY — and the only file that knows it.
 *
 * Every `status` and `status_detail` the Orders API documents is named here
 * and translated into NEOGEN's `PaymentState` and `DeclineReason`. Nothing
 * outside `src/payments/adapters/mercadopago` sees these strings.
 *
 * Source: Mercado Pago, "Order status" and "Transaction status"
 * (developers/en/docs/checkout-api-orders/payment-management/status),
 * read 2026-09-19. The tables below are exhaustive for those pages; a status
 * not listed maps to null (no change, recorded) rather than being guessed.
 */

/** The subset of an Orders API order this adapter reads. Everything else is ignored. */
export interface MpOrder {
  id?: unknown;
  status?: unknown;
  status_detail?: unknown;
  external_reference?: unknown;
  total_amount?: unknown;
  live_mode?: unknown;
  transactions?: { payments?: { id?: unknown; status?: unknown; status_detail?: unknown }[] };
}

/**
 * ORDER STATUS → PAYMENT STATE.
 *
 * Read at ORDER level, because the order is what NEOGEN's order maps to (one
 * Mercado Pago order per attempt). The transaction's detail is read separately,
 * for the decline reason.
 */
export function stateFor(status: string, detail: string): PaymentState | null {
  switch (status) {
    /* Created, nothing processed yet. Not a change worth recording. */
    case "created":
      return null;
    case "processing":
      return "payment_processing";
    case "in_review":
      return "payment_processing";
    case "action_required":
      switch (detail) {
        /* The PAYER must act: pay a voucher, transfer, pass a 3-D Secure challenge. */
        case "waiting_payment":
        case "waiting_transfer":
        case "pending_challenge":
          return "pending_payment";
        /* The processor or the SELLER acts next. Money is not settled. */
        case "waiting_capture":
        case "waiting_retry":
          return "payment_processing";
        default:
          return "pending_payment";
      }
    case "processed":
      /* `accredited` and `partially_refunded` both mean money was taken. A
         partial refund leaves the order paid; the refund is an operator's
         record, not a customer state. */
      return "paid";
    case "failed":
      return "payment_failed";
    /* A Mercado Pago order that was cancelled or expired took no money. For
       NEOGEN that is a failed ATTEMPT — the NEOGEN order is not cancelled and
       the customer may pay again. */
    case "canceled":
    case "cancelled":
    case "expired":
      return "payment_failed";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "disputed";
    default:
      return null;
  }
}

/** TRANSACTION DETAIL → DECLINE REASON. Only consulted for failed payments. */
export function declineFor(orderStatus: string, detail: string): DeclineReason {
  if (orderStatus === "canceled" || orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "expired") return "expired";
  switch (detail) {
    case "insufficient_amount":
    case "card_insufficient_amount":
      return "insufficient_funds";
    case "bad_filled_card_data":
    case "invalid_card_token":
      return "card_data";
    case "required_call_for_authorize":
      return "call_for_authorize";
    case "card_disabled":
      return "card_disabled";
    case "high_risk":
      return "high_risk";
    case "rejected_by_issuer":
      return "issuer_rejected";
    case "amount_limit_exceeded":
      return "amount_limit";
    case "invalid_installments":
      return "installments";
    case "max_attempts_exceeded":
      return "attempts_exceeded";
    case "3ds_challenge_expired":
    case "expired":
      return "expired";
    default:
      return "generic";
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * A Mercado Pago amount ("1234.50") as whole pesos, or null.
 *
 * NEOGEN prices are whole pesos, so a fractional amount can never equal an
 * order total — it is returned as-is and fails the amount check rather than
 * being rounded into agreement.
 */
export function parseAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Whole pesos → the Orders API's decimal-string amount. */
export function formatAmount(pesos: number): string {
  return pesos.toFixed(2);
}

/**
 * Reduce an Orders API order to a NEOGEN snapshot.
 *
 * Returns null if the payload does not identify an order — a body that is not
 * an order is never half-translated.
 */
export function snapshotOf(order: MpOrder): PaymentSnapshot | null {
  const id = str(order.id);
  const status = str(order.status);
  if (!id || !status) return null;

  const orderDetail = str(order.status_detail);
  const payment = order.transactions?.payments?.[0];
  const paymentDetail = str(payment?.status_detail) || orderDetail;

  const state = stateFor(status, orderDetail || paymentDetail);
  const amount = parseAmount(order.total_amount);

  return {
    providerRef: id,
    /*
     * The FACT, not the delivery: order id + status + detail. The synchronous
     * answer to a charge and every webhook about the same state therefore
     * share one key, and are applied once between them.
     */
    eventId: `mercadopago:${id}:${status}:${orderDetail || paymentDetail || "-"}`,
    state,
    detail: state === "payment_failed" ? declineFor(status, paymentDetail) : null,
    amount: amount === null ? null : { amount, currency: "MXN" },
    externalReference: str(order.external_reference) || null,
    live: typeof order.live_mode === "boolean" ? order.live_mode : null,
  };
}
