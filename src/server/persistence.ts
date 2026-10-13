import "server-only";

import { createPostgresDraftStore } from "@/domain/checkout/adapters/postgres";
import { memoryDraftStore } from "@/domain/checkout/adapters/memory";
import { createPostgresInventoryStore } from "@/domain/inventory/adapters/postgres";
import { memoryInventoryStore } from "@/domain/inventory/adapters/memory";
import { createPostgresOutbox } from "@/domain/notifications/adapters/postgresOutbox";
import { memoryOutbox } from "@/domain/notifications/adapters/memoryOutbox";
import { createPostgresOrderRepository } from "@/domain/order/adapters/postgres";
import { memoryOrderRepository } from "@/domain/order/adapters/memory";
import { postgresClient } from "@/server/db/postgres";
import {
  createPostgresRateLimitStore,
  memoryRateLimitStore,
  type RateLimitStore,
} from "@/server/security/rateLimitStore";

import type { DraftStore } from "@/domain/checkout/store";
import type { InventoryStore } from "@/domain/inventory";
import type { NotificationOutbox } from "@/domain/notifications";
import type { OrderRepository } from "@/domain/order/repository";

/**
 * WHERE THE ADAPTERS ARE CHOSEN — the one file that knows.
 *
 * `DATABASE_URL` set → Postgres (`db/migrations/*.sql` must have been
 * applied: `npm run db:migrate`). Unset → the in-memory development adapters.
 * Nothing else in the application imports an adapter: routes and actions ask
 * for a store, and the domain takes one as an argument.
 *
 * MEMORY IS NOT PRODUCTION STORAGE, and the payment gate enforces that rather
 * than trusting this comment: `paymentBlockers()` refuses LIVE Mercado Pago
 * credentials without a `DATABASE_URL`. Test mode may run on memory, which is
 * what makes a local test purchase possible with no database at all.
 *
 * Orders, drafts, inventory and the notification outbox always live in the
 * SAME store, so an order and the stock and messages it owes can never be
 * split between a database and a process heap.
 *
 * `server-only` keeps this — and the customer data it reaches — out of every
 * client bundle.
 */
function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

export function storageKind(): "postgres" | "memory" {
  return databaseUrl() ? "postgres" : "memory";
}

export function orderRepository(): OrderRepository {
  const url = databaseUrl();
  return url ? createPostgresOrderRepository(postgresClient(url)) : memoryOrderRepository;
}

export function draftStore(): DraftStore {
  const url = databaseUrl();
  return url ? createPostgresDraftStore(postgresClient(url)) : memoryDraftStore;
}

export function inventoryStore(): InventoryStore {
  const url = databaseUrl();
  return url ? createPostgresInventoryStore(postgresClient(url)) : memoryInventoryStore;
}

export function notificationOutbox(): NotificationOutbox {
  const url = databaseUrl();
  return url ? createPostgresOutbox(postgresClient(url)) : memoryOutbox();
}

/**
 * Rate-limit counters follow the same rule: shared in Postgres when there is
 * one, so every instance counts together; in memory otherwise.
 */
export function rateLimitStore(): RateLimitStore {
  const url = databaseUrl();
  return url ? createPostgresRateLimitStore(postgresClient(url)) : memoryRateLimitStore;
}

export interface DatabaseProbe {
  storage: "postgres" | "memory";
  /** "ok" when a trivial query answered; null for memory storage. */
  database: "ok" | "unreachable" | null;
  /** The newest migration recorded by `npm run db:migrate`, or null. */
  schema: string | null;
}

/**
 * For the health route: does the database answer, and how far is its schema?
 * Never throws, never returns a host, a role or an error message.
 */
export async function probeDatabase(timeoutMs = 3000): Promise<DatabaseProbe> {
  const url = databaseUrl();
  if (!url) return { storage: "memory", database: null, schema: null };
  const sql = postgresClient(url);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
  });
  try {
    await Promise.race([sql.query("select 1"), timeout]);
  } catch {
    return { storage: "postgres", database: "unreachable", schema: null };
  } finally {
    clearTimeout(timer);
  }
  try {
    const { rows } = await sql.query<{ name: string | null }>(
      `select max(name) as name from neogen_schema_migrations`,
    );
    return { storage: "postgres", database: "ok", schema: rows[0]?.name ?? null };
  } catch {
    /* No tracking table yet: migrated before tracking existed. */
    return { storage: "postgres", database: "ok", schema: null };
  }
}
