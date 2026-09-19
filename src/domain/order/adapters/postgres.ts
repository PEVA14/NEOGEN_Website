import type { SqlClient } from "@/lib/sql";
import type { Order } from "../types";
import type { OrderRepository, SaveResult } from "../repository";

/**
 * THE DURABLE ORDER STORE — Postgres, behind the same `OrderRepository`.
 *
 * Every property the in-memory adapter promises, the database now enforces:
 *
 *   VERSIONED WRITES. `save` is `UPDATE … WHERE version = $base`, so a stale
 *   copy cannot overwrite a newer order — the loser gets `version_conflict`
 *   and `mutate` re-decides against fresh state.
 *
 *   GLOBAL EVENT DEDUPLICATION. Provider event ids live in a table whose
 *   primary key is the id, written in the same transaction as the order.
 *
 *   EVERY REFERENCE, FOREVER. Each attempt's provider reference is indexed,
 *   so a late webhook for an earlier attempt still finds its order.
 *
 * The schema is `db/migrations/001_orders.sql`. The order itself is stored as
 * `jsonb`; the columns beside it exist to be constrained and queried.
 */
interface OrderRow {
  version: number;
  data: Omit<Order, "version">;
}

function toOrder(row: OrderRow): Order {
  return { ...row.data, version: Number(row.version) } as Order;
}

function payload(order: Order): string {
  const { version: _version, ...rest } = order;
  void _version;
  return JSON.stringify(rest);
}

export function createPostgresOrderRepository(sql: SqlClient): OrderRepository {
  async function indexOrder(tx: SqlClient, order: Order): Promise<void> {
    const refs = new Set<string>();
    if (order.providerRef) refs.add(order.providerRef);
    for (const attempt of order.attempts) if (attempt.providerRef) refs.add(attempt.providerRef);
    for (const ref of refs) {
      await tx.query(
        `insert into neogen_order_provider_refs (provider_ref, order_id) values ($1, $2)
         on conflict (provider_ref) do nothing`,
        [ref, order.id],
      );
    }
    for (const event of order.events) {
      if (!event.providerEventId) continue;
      await tx.query(
        `insert into neogen_provider_events (provider_event_id, order_id) values ($1, $2)
         on conflict (provider_event_id) do nothing`,
        [event.providerEventId, order.id],
      );
    }
  }

  const repository: OrderRepository = {
    async create(order) {
      return sql.transaction(async (tx) => {
        const inserted = await tx.query<{ id: string }>(
          `insert into neogen_orders
             (id, version, state, provider, provider_ref, total_amount, created_at, updated_at, data)
           values ($1, 1, $2, $3, $4, $5, $6, $7, $8::jsonb)
           on conflict (id) do nothing
           returning id`,
          [
            order.id,
            order.state,
            order.provider,
            order.providerRef,
            order.totals.total.amount,
            order.createdAt,
            order.updatedAt,
            payload(order),
          ],
        );
        if (inserted.rows.length === 0) return { ok: false as const, reason: "exists" as const };
        const stored = { ...order, version: 1 };
        await indexOrder(tx, stored);
        return { ok: true as const, order: structuredClone(stored) };
      });
    },

    async get(id) {
      const found = await sql.query<OrderRow>(
        `select version, data from neogen_orders where id = $1`,
        [id],
      );
      return found.rows[0] ? toOrder(found.rows[0]) : null;
    },

    async save(order): Promise<SaveResult> {
      return sql.transaction(async (tx) => {
        const updated = await tx.query<{ version: number }>(
          `update neogen_orders
              set version = version + 1, state = $3, provider = $4, provider_ref = $5,
                  updated_at = $6, data = $7::jsonb
            where id = $1 and version = $2
          returning version`,
          [
            order.id,
            order.version,
            order.state,
            order.provider,
            order.providerRef,
            order.updatedAt,
            payload(order),
          ],
        );
        if (updated.rows.length === 0) {
          const exists = await tx.query(`select 1 from neogen_orders where id = $1`, [order.id]);
          return exists.rows.length === 0
            ? { ok: false as const, reason: "not_found" as const }
            : { ok: false as const, reason: "version_conflict" as const };
        }
        const stored = { ...order, version: Number(updated.rows[0].version) };
        await indexOrder(tx, stored);
        return { ok: true as const, order: structuredClone(stored) };
      });
    },

    async findByProviderRef(providerRef) {
      const found = await sql.query<OrderRow>(
        `select o.version, o.data
           from neogen_order_provider_refs r
           join neogen_orders o on o.id = r.order_id
          where r.provider_ref = $1`,
        [providerRef],
      );
      return found.rows[0] ? toOrder(found.rows[0]) : null;
    },

    async hasProviderEvent(providerEventId) {
      const found = await sql.query(
        `select 1 from neogen_provider_events where provider_event_id = $1`,
        [providerEventId],
      );
      return found.rows.length > 0;
    },
  };

  return repository;
}
