import "server-only";

import { lotsForVariant, LOTS } from "@/data/quality";
import { desiredHold, holdLines } from "@/domain/inventory";
import { attentionReasons, mutate, record, SYSTEM } from "@/domain/order";
import { notifyOrder } from "@/server/notifications";
import { signal } from "@/server/observe";
import { inventoryStore, orderRepository } from "@/server/persistence";

import type { HoldResult } from "@/domain/inventory";
import type { OpRefusal, OpResult, Order } from "@/domain/order";

/**
 * THE ORDER SERVICE — what runs around every order change.
 *
 * The domain decides (pure functions returning an order or a refusal); this
 * file persists the decision under the version lock and then brings the rest
 * of the world into line with the order: the shelf (inventory holds) and the
 * outbox (owed messages). Both are LEVEL-TRIGGERED — derived from where the
 * order is, not from which step just happened — so running them again is
 * harmless, and a step lost to a crash is repaired by the next change.
 */

/**
 * HOLD STOCK FOR A PAYMENT — before the provider is called.
 *
 * All tracked lines or none. `short` means a tracked SKU has fewer units
 * available than the order needs, and the payment must not be attempted.
 * `error` means the store could not be asked; the caller fails closed.
 */
export async function holdForPayment(order: Order): Promise<"ok" | "short" | "error"> {
  try {
    const result: HoldResult = await inventoryStore().hold(
      order.id,
      holdLines(order),
      new Date().toISOString(),
    );
    if (result.ok) return "ok";
    signal("inventory.short", "info", { orderId: order.id, count: result.short.length });
    return "short";
  } catch {
    signal("inventory.hold_failed", "error", { orderId: order.id });
    return "error";
  }
}

/**
 * Bring the shelf into line with the order. Returns the order, which gains an
 * `inventory_short` event if a hold it needed could not be made (a payment
 * that arrived late, for stock that sold in the meantime).
 */
async function syncInventory(order: Order): Promise<Order> {
  const store = inventoryStore();
  const at = new Date().toISOString();
  try {
    switch (desiredHold(order)) {
      case "consumed":
        await store.consume(order.id, holdLines(order), at);
        return order;
      case "released":
        await store.release(order.id, at);
        return order;
      case "held": {
        const held = await store.hold(order.id, holdLines(order), at);
        if (held.ok || attentionReasons(order).includes("stock_short")) return order;
        signal("inventory.short", "warn", { orderId: order.id, count: held.short.length });
        const flagged = await mutate(orderRepository(), order.id, (current) =>
          attentionReasons(current).includes("stock_short")
            ? null
            : record(
                current,
                {
                  kind: "inventory_short",
                  axis: "inventory",
                  note: "hold_failed",
                  meta: { skus: held.short.map((s) => s.variantId).join(",") },
                },
                SYSTEM,
                at,
              ),
        );
        return flagged.ok ? flagged.order : order;
      }
    }
  } catch {
    signal("inventory.sync_failed", "error", { orderId: order.id });
    return order;
  }
}

/** Run after every persisted order change. Never throws. */
export async function afterOrderChange(order: Order): Promise<Order> {
  const synced = await syncInventory(order);
  await notifyOrder(synced);
  return synced;
}

/**
 * APPLY ONE DOMAIN OPERATION to a stored order, under the version lock.
 *
 * The operation runs against the FRESH order on every retry, so a refusal is
 * decided against the current state — two operators pressing "ready to ship"
 * on one order produce one transition and one "illegal_transition".
 */
export type OperateResult =
  { ok: true; order: Order } | { ok: false; reason: OpRefusal | "not_found" | "conflict" };

export async function operate(
  orderId: string,
  op: (order: Order, at: string) => OpResult,
): Promise<OperateResult> {
  let refusal: OpRefusal | null = null;
  const result = await mutate(orderRepository(), orderId, (current) => {
    const decided = op(current, new Date().toISOString());
    if (!decided.ok) {
      refusal = decided.reason;
      return null;
    }
    refusal = null;
    return decided.order;
  });
  if (!result.ok) {
    if (result.reason !== "not_found") {
      signal("persistence.conflict", "warn", { orderId, reason: result.reason });
    }
    return { ok: false, reason: result.reason === "not_found" ? "not_found" : "conflict" };
  }
  if (refusal) return { ok: false, reason: refusal };
  return { ok: true, order: await afterOrderChange(result.order) };
}

/** Lots that could fill a line — the registry, filtered by SKU. */
export function lotsFor(variantId: string) {
  return lotsForVariant(variantId, LOTS);
}
