import type { Order } from "./types";

/**
 * THE PERSISTENCE BOUNDARY.
 *
 * The order domain must not know where orders are kept, and this interface is
 * the whole of what it is allowed to know. Nothing in `domain/order`,
 * `domain/checkout` or any route imports a storage implementation — they take
 * an `OrderRepository` and use it.
 *
 * That is not abstraction for its own sake. The production storage decision
 * has NOT been made (see the note on the memory adapter), and this phase must
 * not force it: choosing Postgres, Vercel KV or a hosted store is a business
 * and cost decision, and the wrong way to make it is by having written
 * `sql\`insert into orders\`` in a route handler first.
 *
 * WHY WRITES CARRY A VERSION. Two writers genuinely collide here: a provider
 * webhook and a customer action can touch one order in the same instant. A
 * naive last-write-wins `set` would let a stale in-memory copy overwrite a
 * `paid` transition — so `save` refuses a write whose base version is no
 * longer current, and `mutate` re-reads and retries.
 */
export type SaveResult =
  { ok: true; order: Order } | { ok: false; reason: "version_conflict" | "not_found" };

export interface OrderRepository {
  /** Persist a brand-new order. Fails if the id is already taken. */
  create(order: Order): Promise<{ ok: true; order: Order } | { ok: false; reason: "exists" }>;
  get(id: string): Promise<Order | null>;
  /**
   * Persist a change, bumping `version`.
   *
   * The passed order's `version` is the base — the version it was read at.
   * A mismatch means someone else wrote in between.
   */
  save(order: Order): Promise<SaveResult>;
  /**
   * Resolve a provider's payment reference back to an order.
   *
   * Webhooks identify a payment, not an order, so this lookup is the join.
   * Implementations must index it: scanning every order per callback is fine
   * at ten orders and not at ten thousand.
   */
  findByProviderRef(providerRef: string): Promise<Order | null>;
  /**
   * Has this provider event id been processed for ANY order?
   *
   * Deliberately global rather than per-order. A misrouted event must be
   * recognised as already-handled even if it names the wrong order, and a
   * provider event id is unique on the provider's side.
   */
  hasProviderEvent(providerEventId: string): Promise<boolean>;
}

/**
 * Read-modify-write with a bounded retry.
 *
 * The retry is the point: a version conflict is not an error, it is two
 * correct writers meeting, and the loser's job is to redo its decision
 * against fresh state. `mutate` therefore re-reads and calls `change` again
 * rather than replaying a stale result — which matters because the decision
 * itself may differ (an event that was legal against `pending_payment` is not
 * legal against `paid`).
 */
export async function mutate(
  repository: OrderRepository,
  id: string,
  change: (order: Order) => Order | null,
  attempts = 3,
): Promise<{ ok: true; order: Order; changed: boolean } | { ok: false; reason: string }> {
  for (let i = 0; i < attempts; i += 1) {
    const current = await repository.get(id);
    if (!current) return { ok: false, reason: "not_found" };

    const next = change(current);
    /* `null` means the change decided to do nothing — a duplicate event, say.
       Not a failure, and not a write. */
    if (next === null) return { ok: true, order: current, changed: false };

    const saved = await repository.save(next);
    if (saved.ok) return { ok: true, order: saved.order, changed: true };
    if (saved.reason === "not_found") return { ok: false, reason: "not_found" };
    /* version_conflict → loop and re-decide. */
  }
  return { ok: false, reason: "version_conflict" };
}
