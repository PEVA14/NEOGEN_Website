import { validAdjustment } from "../index";

import type { HoldLine, HoldRequest, InventoryStore, StockLevel, StockMovement } from "../types";

/**
 * IN-MEMORY INVENTORY — development and tests only, like the order store.
 *
 * ATOMIC BY CONSTRUCTION. Every method does its checks and its writes with no
 * `await` in between, so on one event loop no two holds can interleave: the
 * second one sees the first one's reservation. The Postgres store gets the
 * same guarantee from a conditional UPDATE.
 */
interface Store {
  levels: Map<string, StockLevel>;
  holds: Map<string, HoldLine>;
  movements: Map<string, StockMovement>;
}

const KEY = "__neogen_inventory_store__";

function store(): Store {
  const g = globalThis as typeof globalThis & { [KEY]?: Store };
  g[KEY] ??= { levels: new Map(), holds: new Map(), movements: new Map() };
  return g[KEY];
}

const holdKey = (orderId: string, variantId: string) => `${orderId}\u0000${variantId}`;

function move(s: Store, m: StockMovement): void {
  if (!s.movements.has(m.id)) s.movements.set(m.id, m);
}

export const memoryInventoryStore: InventoryStore = {
  async levels() {
    return [...store().levels.values()]
      .map((l) => ({ ...l }))
      .sort((a, b) => a.variantId.localeCompare(b.variantId));
  },

  async level(variantId) {
    const found = store().levels.get(variantId);
    return found ? { ...found } : null;
  },

  async adjust(input) {
    const s = store();
    if (!validAdjustment(input.mode, input.quantity)) return { ok: false, reason: "invalid" };
    const existing = s.movements.get(input.id);
    const current = s.levels.get(input.variantId) ?? null;
    if (existing) {
      return current
        ? { ok: true, level: { ...current }, duplicate: true }
        : { ok: false, reason: "untracked" };
    }
    if (input.mode === "adjustment" && !current) return { ok: false, reason: "untracked" };

    const onHand = input.mode === "count" ? input.quantity : current!.onHand + input.quantity;
    const reserved = current?.reserved ?? 0;
    if (onHand < reserved) return { ok: false, reason: "below_reserved" };

    const level: StockLevel = { variantId: input.variantId, onHand, reserved, updatedAt: input.at };
    s.levels.set(input.variantId, level);
    move(s, {
      id: input.id,
      variantId: input.variantId,
      kind: input.mode,
      onHandDelta: onHand - (current?.onHand ?? 0),
      reservedDelta: 0,
      reason: input.reason,
      orderId: null,
      lotId: input.lotId,
      source: "operator",
      actor: input.actor,
      note: input.note,
      at: input.at,
    });
    return { ok: true, level: { ...level }, duplicate: false };
  },

  async hold(orderId, lines: readonly HoldRequest[], at) {
    const s = store();
    const todo = lines.filter((line) => {
      const existing = s.holds.get(holdKey(orderId, line.variantId));
      return !existing || existing.status === "released";
    });
    /* Check EVERY line before writing ANY — all or nothing. */
    const short = todo
      .map((line) => ({ line, level: s.levels.get(line.variantId) }))
      .filter(({ line, level }) => level && level.onHand - level.reserved < line.quantity)
      .map(({ line, level }) => ({
        variantId: line.variantId,
        requested: line.quantity,
        available: level!.onHand - level!.reserved,
      }));
    if (short.length) return { ok: false, short };

    for (const line of todo) {
      const level = s.levels.get(line.variantId);
      if (!level) continue; /* untracked: never limited, never reserved */
      s.levels.set(line.variantId, {
        ...level,
        reserved: level.reserved + line.quantity,
        updatedAt: at,
      });
      s.holds.set(holdKey(orderId, line.variantId), {
        orderId,
        variantId: line.variantId,
        quantity: line.quantity,
        status: "held",
        updatedAt: at,
      });
      move(s, {
        id: `hold:${orderId}:${line.variantId}:${at}`,
        variantId: line.variantId,
        kind: "hold",
        onHandDelta: 0,
        reservedDelta: line.quantity,
        reason: null,
        orderId,
        lotId: null,
        source: "system",
        actor: null,
        note: null,
        at,
      });
    }
    return { ok: true };
  },

  async release(orderId, at) {
    const s = store();
    for (const hold of s.holds.values()) {
      if (hold.orderId !== orderId || hold.status !== "held") continue;
      const level = s.levels.get(hold.variantId);
      if (level) {
        s.levels.set(hold.variantId, {
          ...level,
          reserved: Math.max(0, level.reserved - hold.quantity),
          updatedAt: at,
        });
      }
      s.holds.set(holdKey(orderId, hold.variantId), { ...hold, status: "released", updatedAt: at });
      move(s, {
        id: `release:${orderId}:${hold.variantId}:${at}`,
        variantId: hold.variantId,
        kind: "release",
        onHandDelta: 0,
        reservedDelta: -hold.quantity,
        reason: null,
        orderId,
        lotId: null,
        source: "system",
        actor: null,
        note: null,
        at,
      });
    }
  },

  async consume(orderId, lines, at) {
    const s = store();
    for (const line of lines) {
      const key = holdKey(orderId, line.variantId);
      const hold = s.holds.get(key);
      if (hold?.status === "consumed") continue;
      const level = s.levels.get(line.variantId);
      if (!level) continue;
      const wasHeld = hold?.status === "held";
      const quantity = wasHeld ? hold.quantity : line.quantity;
      s.levels.set(line.variantId, {
        ...level,
        onHand: level.onHand - quantity,
        reserved: wasHeld ? Math.max(0, level.reserved - quantity) : level.reserved,
        updatedAt: at,
      });
      s.holds.set(key, {
        orderId,
        variantId: line.variantId,
        quantity,
        status: "consumed",
        updatedAt: at,
      });
      move(s, {
        id: `consume:${orderId}:${line.variantId}`,
        variantId: line.variantId,
        kind: "consume",
        onHandDelta: -quantity,
        reservedDelta: wasHeld ? -quantity : 0,
        reason: null,
        orderId,
        lotId: null,
        source: "system",
        actor: null,
        note: wasHeld ? null : "not_held",
        at,
      });
    }
  },

  async holds(orderId) {
    return [...store().holds.values()].filter((h) => h.orderId === orderId).map((h) => ({ ...h }));
  },

  async movements({ variantId, orderId, limit = 100 }) {
    return [...store().movements.values()]
      .filter(
        (m) => (!variantId || m.variantId === variantId) && (!orderId || m.orderId === orderId),
      )
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      .slice(0, limit)
      .map((m) => ({ ...m }));
  },
};

/** Test-only reset. */
export function __resetInventory(): void {
  const g = globalThis as typeof globalThis & { [KEY]?: Store };
  delete g[KEY];
}
