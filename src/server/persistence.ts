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
