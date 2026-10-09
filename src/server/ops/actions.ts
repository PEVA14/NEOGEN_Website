"use server";

import { redirect } from "next/navigation";

import { publishedProducts } from "@/data/catalog";
import { LOTS } from "@/data/quality";
import { ADJUSTMENT_REASONS } from "@/domain/inventory";
import {
  ACKNOWLEDGEABLE,
  acknowledgeAttention,
  addExternalReference,
  addNote,
  advanceFulfilment,
  assignLot,
  cancelOrder,
  holdFulfilment,
  recordShipment,
  requestRefund,
  resumeFulfilment,
  setTracking,
  unassignLot,
  updateShipment,
} from "@/domain/order";
import { isOrderId } from "@/payments/instrument";
import { MANUAL_SHIPPING } from "@/shipping";
import { reconcileOrder, submitRefund } from "@/server/payments";
import { operate } from "@/server/orders";
import { inventoryStore, orderRepository } from "@/server/persistence";

import { login, logout, OPS_PATH, requireOperator } from "./auth";

import type { AdjustmentReason } from "@/domain/inventory";
import type {
  Actor,
  AttentionReason,
  CancellationReason,
  HoldReason,
  OpResult,
  Order,
  RefundReason,
  ShipmentState,
} from "@/domain/order";

/**
 * THE CONSOLE'S ACTIONS — each a public endpoint, treated as one.
 *
 * Every action re-checks the operator's session (a form rendered for an
 * operator can be replayed by anyone), validates every field against a closed
 * list or a pattern, and runs ONE pure domain operation under the order's
 * version lock (`operate`). The domain is the rule: a button the page chose
 * not to show is still refused here if it is not legal.
 *
 * Results travel back as a code in the URL (`?ok=` / `?error=`), mapped to a
 * sentence by the page — never as free text from the request.
 */

const field = (form: FormData, name: string): string => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

const oneOf = <T extends string>(value: string, allowed: readonly T[]): T | null =>
  (allowed as readonly string[]).includes(value) ? (value as T) : null;

function orderPath(orderId: string): string {
  return `${OPS_PATH}/pedidos/${encodeURIComponent(orderId)}`;
}

function done(orderId: string, key: string, anchor = ""): never {
  redirect(`${orderPath(orderId)}?ok=${key}${anchor}`);
}

function failed(orderId: string, reason: string, anchor = ""): never {
  redirect(`${orderPath(orderId)}?error=${encodeURIComponent(reason)}${anchor}`);
}

/** Session, then a well-formed order id — before anything else is read. */
async function begin(form: FormData): Promise<{ actor: Actor; orderId: string }> {
  const name = await requireOperator();
  const orderId = field(form, "orderId");
  if (!isOrderId(orderId)) redirect(`${OPS_PATH}/pedidos?error=not_found`);
  return { actor: { source: "operator", name }, orderId };
}

async function run(
  orderId: string,
  op: (order: Order, at: string) => OpResult,
  ok: string,
  anchor = "",
): Promise<never> {
  const result = await operate(orderId, op);
  if (!result.ok) failed(orderId, result.reason, anchor);
  done(orderId, ok, anchor);
}

/* ------------------------------------------------------------ session */

export async function loginAction(form: FormData): Promise<void> {
  const result = await login(field(form, "name"), String(form.get("password") ?? ""));
  if (result === "ok") redirect(`${OPS_PATH}/pedidos`);
  redirect(`${OPS_PATH}/acceso?error=${result}`);
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect(`${OPS_PATH}/acceso`);
}

/* --------------------------------------------------------- fulfilment */

export async function advanceAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const to = oneOf(field(form, "to"), ["queued", "preparing", "ready_to_ship"] as const);
  if (!to) failed(orderId, "invalid_input");
  await run(orderId, (o, at) => advanceFulfilment(o, to, actor, at), "advance", "#preparacion");
}

export async function holdAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const reason = oneOf<HoldReason>(field(form, "reason"), [
    "operator",
    "address_check",
    "stock_short",
  ]);
  if (!reason) failed(orderId, "invalid_input");
  await run(orderId, (o, at) => holdFulfilment(o, reason, actor, at), "hold", "#preparacion");
}

export async function resumeAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  await run(orderId, (o, at) => resumeFulfilment(o, actor, at), "resume", "#preparacion");
}

const CANCEL_REASONS: readonly CancellationReason[] = [
  "customer_request",
  "payment_not_completed",
  "stock_unavailable",
  "fraud_suspected",
  "address_undeliverable",
  "operator_other",
];

export async function cancelAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  if (form.get("confirm") !== "yes") failed(orderId, "confirm_required", "#cancelar");
  const reason = oneOf(field(form, "reason"), CANCEL_REASONS);
  if (!reason) failed(orderId, "invalid_input", "#cancelar");
  await run(orderId, (o, at) => cancelOrder(o, reason, actor, at), "cancel");
}

/* ------------------------------------------------------------- refunds */

const REFUND_REASONS: readonly RefundReason[] = [
  "customer_request",
  "not_delivered",
  "returned",
  "duplicate_charge",
  "operator_other",
];

export async function requestRefundAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const reason = oneOf(field(form, "reason"), REFUND_REASONS);
  if (!reason) failed(orderId, "invalid_input", "#pago");
  await run(orderId, (o, at) => requestRefund(o, reason, actor, at), "refund_requested", "#pago");
}

/**
 * ASK THE PROCESSOR WHERE THIS PAYMENT STANDS. Read-only toward the customer:
 * it applies only an answer the processor itself gives, through the same path
 * a webhook takes, and changes nothing when the processor still says what we
 * already knew. Offered on any in-flight payment; the domain decides the rest.
 */
export async function reconcileAction(form: FormData): Promise<void> {
  const { orderId } = await begin(form);
  const order = await orderRepository().get(orderId);
  if (!order) failed(orderId, "not_found");
  const { outcome } = await reconcileOrder(order);
  done(orderId, `reconcile_${outcome}`, "#pago");
}

export async function submitRefundAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  if (form.get("confirm") !== "yes") failed(orderId, "confirm_required", "#pago");
  const refundId = field(form, "refundId");
  if (!refundId.startsWith(`${orderId}:refund:`)) failed(orderId, "refund_not_found", "#pago");
  const result = await submitRefund(orderId, refundId, actor);
  if (!result.ok) failed(orderId, result.reason, "#pago");
  done(orderId, result.state === "refunded" ? "refund_confirmed" : "refund_submitted", "#pago");
}

/* ---------------------------------------------------------------- lots */

export async function assignLotAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const line = Number(field(form, "line"));
  const quantity = Number(field(form, "quantity"));
  const lotId = field(form, "lotId").slice(0, 80);
  await run(
    orderId,
    (o, at) => assignLot(o, { line, lotId, quantity }, LOTS, actor, at),
    "lot",
    "#articulos",
  );
}

export async function unassignLotAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const line = Number(field(form, "line"));
  const lotId = field(form, "lotId").slice(0, 80);
  await run(orderId, (o, at) => unassignLot(o, { line, lotId }, actor, at), "lot", "#articulos");
}

/* ----------------------------------------------------------- shipments */

export async function recordShipmentAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const input = {
    provider: MANUAL_SHIPPING,
    carrier: field(form, "carrier") || null,
    service: field(form, "service") || null,
    trackingNumber: field(form, "trackingNumber") || null,
    trackingUrl: field(form, "trackingUrl") || null,
    dispatched: form.get("dispatched") === "yes",
  };
  await run(orderId, (o, at) => recordShipment(o, input, actor, at), "shipment", "#envio");
}

export async function shipmentStateAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const shipmentId = field(form, "shipmentId");
  const to = oneOf<ShipmentState>(field(form, "to"), [
    "in_transit",
    "exception",
    "delivered",
    "returned",
    "cancelled",
  ]);
  if (!to) failed(orderId, "invalid_input", "#envio");
  await run(
    orderId,
    (o, at) => updateShipment(o, shipmentId, to, actor, at),
    "shipment_state",
    "#envio",
  );
}

export async function trackingAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const shipmentId = field(form, "shipmentId");
  const input = {
    carrier: field(form, "carrier") || null,
    trackingNumber: field(form, "trackingNumber") || null,
    trackingUrl: field(form, "trackingUrl") || null,
  };
  await run(orderId, (o, at) => setTracking(o, shipmentId, input, actor, at), "tracking", "#envio");
}

/* ------------------------------------------------------ notes and refs */

export async function noteAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const text = String(form.get("text") ?? "");
  await run(orderId, (o, at) => addNote(o, text, actor, at), "note", "#notas");
}

export async function ackAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const reason = oneOf<AttentionReason>(field(form, "reason"), ACKNOWLEDGEABLE);
  if (!reason) failed(orderId, "invalid_input");
  await run(orderId, (o, at) => acknowledgeAttention(o, reason, actor, at), "ack");
}

export async function externalRefAction(form: FormData): Promise<void> {
  const { actor, orderId } = await begin(form);
  const input = { system: field(form, "system").toLowerCase(), ref: field(form, "ref") };
  await run(orderId, (o, at) => addExternalReference(o, input, actor, at), "external", "#notas");
}

/* ------------------------------------------------------------- stock */

/** Every sellable SKU, from the catalogue — the only ids stock may be counted for. */
function knownSku(id: string): boolean {
  return publishedProducts.some((p) => p.variants.some((v) => v.id === id));
}

export async function stockAction(form: FormData): Promise<void> {
  const name = await requireOperator();
  const variantId = field(form, "variantId");
  const mode = oneOf(field(form, "mode"), ["count", "adjustment"] as const);
  const reason = oneOf<AdjustmentReason>(field(form, "reason"), ADJUSTMENT_REASONS);
  const quantity = Number(field(form, "quantity"));
  const lotId = field(form, "lotId") || null;
  const key = field(form, "key");
  const back = (q: string) => redirect(`${OPS_PATH}/inventario?${q}`);

  if (!knownSku(variantId) || !mode || !reason || !/^[A-Za-z0-9_-]{8,64}$/.test(key)) {
    back("error=invalid_input");
  }
  if (lotId && !LOTS.some((l) => l.id === lotId && l.variantId === variantId)) {
    back("error=lot_wrong_variant");
  }
  const result = await inventoryStore().adjust({
    id: `adj:${key}`,
    variantId,
    mode: mode!,
    quantity,
    reason: reason!,
    lotId,
    actor: name,
    note:
      String(form.get("note") ?? "")
        .trim()
        .slice(0, 300) || null,
    at: new Date().toISOString(),
  });
  if (!result.ok) back(`error=${result.reason}`);
  back("ok=stock");
}
