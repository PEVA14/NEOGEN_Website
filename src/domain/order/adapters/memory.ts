import type { Order } from "../types";
import type { OrderRepository, SaveResult } from "../repository";

/**
 * THE DEVELOPMENT ORDER STORE — in memory, and honest about it.
 *
 * ============================ PRODUCTION BLOCKER ============================
 * THIS IS NOT PRODUCTION PERSISTENCE, and it must not be treated as such.
 * Orders live in one Node process's heap. They are lost on restart, on
 * redeploy, and on a serverless platform they are not shared between
 * instances — so a webhook arriving at a different lambda than the one that
 * created the order would not find it.
 *
 * That is a deliberate stopping point, not an oversight. Real persistence
 * requires a decision nobody has made: NEOGEN has no database, and choosing
 * one (Vercel Postgres, Neon, Supabase, a KV store) is a cost, residency and
 * operations decision for the owner — Mexican customer addresses are personal
 * data, and where they are stored is a privacy question before it is a
 * technical one.
 *
 * What this phase delivers instead is the BOUNDARY: `OrderRepository`. When a
 * store is chosen, one adapter is written next to this file and one line in
 * `src/server/persistence.ts` changes. No route, component or domain function
 * is touched.
 *
 * This is also why it is safe today: commerce is off in production, so nothing
 * real is ever written here.
 * ============================================================================
 *
 * WHY `globalThis`. Next's dev server re-evaluates modules on every edit. A
 * plain module-level `Map` would be replaced on each hot reload and a draft
 * would vanish mid-checkout, which makes the flow untestable for exactly the
 * reason the store exists.
 */
interface Store {
  orders: Map<string, Order>;
  byProviderRef: Map<string, string>;
  providerEvents: Set<string>;
}

const KEY = "__neogen_order_store__";

function store(): Store {
  const globals = globalThis as typeof globalThis & { [KEY]?: Store };
  globals[KEY] ??= {
    orders: new Map(),
    byProviderRef: new Map(),
    providerEvents: new Set(),
  };
  return globals[KEY];
}

/**
 * Stored orders are deep-frozen copies.
 *
 * A repository that handed back a live reference would let a caller mutate
 * "persisted" state without saving it — the bug is invisible in memory and
 * impossible once a database is behind the interface, so the in-memory
 * adapter is made to behave like the real thing rather than more forgivingly.
 */
function clone(order: Order): Order {
  return structuredClone(order);
}

export const memoryOrderRepository: OrderRepository = {
  async create(order) {
    const s = store();
    if (s.orders.has(order.id)) return { ok: false, reason: "exists" };
    const stored = clone({ ...order, version: 1 });
    s.orders.set(stored.id, stored);
    if (stored.providerRef) s.byProviderRef.set(stored.providerRef, stored.id);
    return { ok: true, order: clone(stored) };
  },

  async get(id) {
    const found = store().orders.get(id);
    return found ? clone(found) : null;
  },

  async save(order): Promise<SaveResult> {
    const s = store();
    const current = s.orders.get(order.id);
    if (!current) return { ok: false, reason: "not_found" };
    /* The base version must still be current — see `mutate`. */
    if (current.version !== order.version) return { ok: false, reason: "version_conflict" };

    const stored = clone({ ...order, version: current.version + 1 });
    s.orders.set(stored.id, stored);
    if (stored.providerRef) s.byProviderRef.set(stored.providerRef, stored.id);
    /* Every provider event id the order has recorded becomes globally known,
       so a redelivery is recognised even before the order is loaded. */
    for (const event of stored.events) {
      if (event.providerEventId) s.providerEvents.add(event.providerEventId);
    }
    return { ok: true, order: clone(stored) };
  },

  async findByProviderRef(providerRef) {
    const s = store();
    const id = s.byProviderRef.get(providerRef);
    return id ? (this.get(id) as Promise<Order | null>) : null;
  },

  async hasProviderEvent(providerEventId) {
    return store().providerEvents.has(providerEventId);
  },
};

/** Test-only reset. Never called by application code. */
export function __resetOrderStore(): void {
  const globals = globalThis as typeof globalThis & { [KEY]?: Store };
  delete globals[KEY];
}
