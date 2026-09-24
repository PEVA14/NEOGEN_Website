import { validAdjustment } from "../index";

import type { SqlClient } from "@/lib/sql";
import type { HoldLine, InventoryStore, StockLevel, StockMovement } from "../types";

/**
 * THE DURABLE INVENTORY STORE — schema `db/migrations/002_operations.sql`.
 *
 * WHY IT CANNOT OVERSELL. A hold is one conditional statement per line:
 *
 *   UPDATE neogen_inventory SET reserved = reserved + q
 *    WHERE variant_id = $v AND on_hand - reserved >= q
 *
 * Postgres takes a row lock for the UPDATE; a concurrent hold on the same
 * variant waits, then RE-EVALUATES the WHERE against the committed row. So
 * of two checkouts racing for the last unit, one updates a row and the other
 * updates none — and "none" is the refusal. All lines of an order run in one
 * transaction, in SKU order (so two multi-line orders cannot deadlock), and
 * any short line rolls the whole hold back.
 */
interface LevelRow {
  variant_id: string;
  on_hand: number;
  reserved: number;
  updated_at: string | Date;
}

interface HoldRow {
  order_id: string;
  variant_id: string;
  quantity: number;
  status: HoldLine["status"];
  updated_at: string | Date;
}

interface MovementRow {
  id: string;
  variant_id: string;
  kind: StockMovement["kind"];
  on_hand_delta: number;
  reserved_delta: number;
  reason: StockMovement["reason"];
  order_id: string | null;
  lot_id: string | null;
  source: StockMovement["source"];
  actor: string | null;
  note: string | null;
  at: string | Date;
}

const iso = (v: string | Date) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

const toLevel = (r: LevelRow): StockLevel => ({
  variantId: r.variant_id,
  onHand: Number(r.on_hand),
  reserved: Number(r.reserved),
  updatedAt: iso(r.updated_at),
});

/* No parameter properties: the checks run this file with type-stripping only. */
class Short extends Error {
  readonly short: { variantId: string; requested: number; available: number }[];
  constructor(short: { variantId: string; requested: number; available: number }[]) {
    super("short");
    this.short = short;
  }
}

async function insertMovement(tx: SqlClient, m: StockMovement): Promise<void> {
  await tx.query(
    `insert into neogen_inventory_movements
       (id, variant_id, kind, on_hand_delta, reserved_delta, reason, order_id, lot_id,
        source, actor, note, at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (id) do nothing`,
    [
      m.id,
      m.variantId,
      m.kind,
      m.onHandDelta,
      m.reservedDelta,
      m.reason,
      m.orderId,
      m.lotId,
      m.source,
      m.actor,
      m.note,
      m.at,
    ],
  );
}

export function createPostgresInventoryStore(sql: SqlClient): InventoryStore {
  return {
    async levels() {
      const r = await sql.query<LevelRow>(
        `select variant_id, on_hand, reserved, updated_at from neogen_inventory order by variant_id`,
      );
      return r.rows.map(toLevel);
    },

    async level(variantId) {
      const r = await sql.query<LevelRow>(
        `select variant_id, on_hand, reserved, updated_at from neogen_inventory where variant_id = $1`,
        [variantId],
      );
      return r.rows[0] ? toLevel(r.rows[0]) : null;
    },

    async adjust(input) {
      if (!validAdjustment(input.mode, input.quantity)) return { ok: false, reason: "invalid" };
      return sql.transaction(async (tx) => {
        const seen = await tx.query(`select 1 from neogen_inventory_movements where id = $1`, [
          input.id,
        ]);
        const current = await tx.query<LevelRow>(
          `select variant_id, on_hand, reserved, updated_at from neogen_inventory
            where variant_id = $1 for update`,
          [input.variantId],
        );
        const row = current.rows[0] ? toLevel(current.rows[0]) : null;
        if (seen.rows.length) {
          return row
            ? { ok: true as const, level: row, duplicate: true }
            : { ok: false as const, reason: "untracked" as const };
        }
        if (input.mode === "adjustment" && !row) {
          return { ok: false as const, reason: "untracked" as const };
        }
        const onHand = input.mode === "count" ? input.quantity : row!.onHand + input.quantity;
        const reserved = row?.reserved ?? 0;
        if (onHand < reserved) return { ok: false as const, reason: "below_reserved" as const };

        await tx.query(
          `insert into neogen_inventory (variant_id, on_hand, reserved, version, updated_at)
           values ($1, $2, 0, 1, $3)
           on conflict (variant_id) do update
             set on_hand = excluded.on_hand, version = neogen_inventory.version + 1,
                 updated_at = excluded.updated_at`,
          [input.variantId, onHand, input.at],
        );
        await insertMovement(tx, {
          id: input.id,
          variantId: input.variantId,
          kind: input.mode,
          onHandDelta: onHand - (row?.onHand ?? 0),
          reservedDelta: 0,
          reason: input.reason,
          orderId: null,
          lotId: input.lotId,
          source: "operator",
          actor: input.actor,
          note: input.note,
          at: input.at,
        });
        return {
          ok: true as const,
          level: { variantId: input.variantId, onHand, reserved, updatedAt: input.at },
          duplicate: false,
        };
      });
    },

    async hold(orderId, lines, at) {
      const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
      try {
        await sql.transaction(async (tx) => {
          const short: { variantId: string; requested: number; available: number }[] = [];
          for (const line of sorted) {
            const existing = await tx.query<{ status: string }>(
              `select status from neogen_inventory_holds
                where order_id = $1 and variant_id = $2 for update`,
              [orderId, line.variantId],
            );
            const status = existing.rows[0]?.status;
            if (status === "held" || status === "consumed") continue;

            const updated = await tx.query(
              `update neogen_inventory
                  set reserved = reserved + $2, version = version + 1, updated_at = $3
                where variant_id = $1 and on_hand - reserved >= $2
              returning variant_id`,
              [line.variantId, line.quantity, at],
            );
            if (updated.rows.length === 0) {
              const level = await tx.query<LevelRow>(
                `select variant_id, on_hand, reserved, updated_at from neogen_inventory
                  where variant_id = $1`,
                [line.variantId],
              );
              if (!level.rows[0]) continue; /* untracked: never limited */
              const l = toLevel(level.rows[0]);
              short.push({
                variantId: line.variantId,
                requested: line.quantity,
                available: l.onHand - l.reserved,
              });
              continue;
            }
            await tx.query(
              `insert into neogen_inventory_holds (order_id, variant_id, quantity, status, updated_at)
               values ($1, $2, $3, 'held', $4)
               on conflict (order_id, variant_id) do update
                 set quantity = excluded.quantity, status = 'held', updated_at = excluded.updated_at`,
              [orderId, line.variantId, line.quantity, at],
            );
            await insertMovement(tx, {
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
          /* Throwing rolls back every reservation this transaction made. */
          if (short.length) throw new Short(short);
        });
        return { ok: true };
      } catch (error) {
        if (error instanceof Short) return { ok: false, short: error.short };
        throw error;
      }
    },

    async release(orderId, at) {
      await sql.transaction(async (tx) => {
        const held = await tx.query<HoldRow>(
          `select order_id, variant_id, quantity, status, updated_at from neogen_inventory_holds
            where order_id = $1 and status = 'held' order by variant_id for update`,
          [orderId],
        );
        for (const hold of held.rows) {
          await tx.query(
            `update neogen_inventory
                set reserved = greatest(0, reserved - $2), version = version + 1, updated_at = $3
              where variant_id = $1`,
            [hold.variant_id, hold.quantity, at],
          );
          await tx.query(
            `update neogen_inventory_holds set status = 'released', updated_at = $3
              where order_id = $1 and variant_id = $2`,
            [orderId, hold.variant_id, at],
          );
          await insertMovement(tx, {
            id: `release:${orderId}:${hold.variant_id}:${at}`,
            variantId: hold.variant_id,
            kind: "release",
            onHandDelta: 0,
            reservedDelta: -Number(hold.quantity),
            reason: null,
            orderId,
            lotId: null,
            source: "system",
            actor: null,
            note: null,
            at,
          });
        }
      });
    },

    async consume(orderId, lines, at) {
      const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
      await sql.transaction(async (tx) => {
        for (const line of sorted) {
          const found = await tx.query<HoldRow>(
            `select order_id, variant_id, quantity, status, updated_at from neogen_inventory_holds
              where order_id = $1 and variant_id = $2 for update`,
            [orderId, line.variantId],
          );
          const hold = found.rows[0];
          if (hold?.status === "consumed") continue;
          const tracked = await tx.query(
            `select 1 from neogen_inventory where variant_id = $1 for update`,
            [line.variantId],
          );
          if (!tracked.rows.length) continue;
          const wasHeld = hold?.status === "held";
          const quantity = wasHeld ? Number(hold.quantity) : line.quantity;
          await tx.query(
            `update neogen_inventory
                set on_hand = on_hand - $2,
                    reserved = case when $4 then greatest(0, reserved - $2) else reserved end,
                    version = version + 1, updated_at = $3
              where variant_id = $1`,
            [line.variantId, quantity, at, wasHeld],
          );
          await tx.query(
            `insert into neogen_inventory_holds (order_id, variant_id, quantity, status, updated_at)
             values ($1, $2, $3, 'consumed', $4)
             on conflict (order_id, variant_id) do update
               set status = 'consumed', updated_at = excluded.updated_at`,
            [orderId, line.variantId, quantity, at],
          );
          await insertMovement(tx, {
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
      });
    },

    async holds(orderId) {
      const r = await sql.query<HoldRow>(
        `select order_id, variant_id, quantity, status, updated_at from neogen_inventory_holds
          where order_id = $1 order by variant_id`,
        [orderId],
      );
      return r.rows.map((h) => ({
        orderId: h.order_id,
        variantId: h.variant_id,
        quantity: Number(h.quantity),
        status: h.status,
        updatedAt: iso(h.updated_at),
      }));
    },

    async movements({ variantId, orderId, limit = 100 }) {
      const params: unknown[] = [];
      const where: string[] = [];
      if (variantId) {
        params.push(variantId);
        where.push(`variant_id = $${params.length}`);
      }
      if (orderId) {
        params.push(orderId);
        where.push(`order_id = $${params.length}`);
      }
      params.push(limit);
      const r = await sql.query<MovementRow>(
        `select * from neogen_inventory_movements
          ${where.length ? `where ${where.join(" and ")}` : ""}
          order by at desc limit $${params.length}`,
        params,
      );
      return r.rows.map((m) => ({
        id: m.id,
        variantId: m.variant_id,
        kind: m.kind,
        onHandDelta: Number(m.on_hand_delta),
        reservedDelta: Number(m.reserved_delta),
        reason: m.reason,
        orderId: m.order_id,
        lotId: m.lot_id,
        source: m.source,
        actor: m.actor,
        note: m.note,
        at: iso(m.at),
      }));
    },
  };
}
