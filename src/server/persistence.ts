import "server-only";

import { createPostgresDraftStore } from "@/domain/checkout/adapters/postgres";
import { memoryDraftStore } from "@/domain/checkout/adapters/memory";
import { createPostgresOrderRepository } from "@/domain/order/adapters/postgres";
import { memoryOrderRepository } from "@/domain/order/adapters/memory";
import { postgresClient } from "@/server/db/postgres";

import type { DraftStore } from "@/domain/checkout/store";
import type { OrderRepository } from "@/domain/order/repository";

/**
 * WHERE THE ADAPTERS ARE CHOSEN — the one file that knows.
 *
 * `DATABASE_URL` set → Postgres (`db/migrations/001_orders.sql` must have been
 * applied: `npm run db:migrate`). Unset → the in-memory development adapters.
 * Nothing else in the application imports an adapter: routes and actions ask
 * for an `OrderRepository`, and the domain takes one as an argument.
 *
 * MEMORY IS NOT PRODUCTION STORAGE, and the payment gate enforces that rather
 * than trusting this comment: `paymentBlockers()` refuses LIVE Mercado Pago
 * credentials without a `DATABASE_URL`. Test mode may run on memory, which is
 * what makes a local test purchase possible with no database at all.
 *
 * `server-only` keeps this — and the customer data it reaches — out of every
 * client bundle.
 */
export function storageKind(): "postgres" | "memory" {
  return process.env.DATABASE_URL?.trim() ? "postgres" : "memory";
}

export function orderRepository(): OrderRepository {
  const url = process.env.DATABASE_URL?.trim();
  return url ? createPostgresOrderRepository(postgresClient(url)) : memoryOrderRepository;
}

export function draftStore(): DraftStore {
  const url = process.env.DATABASE_URL?.trim();
  return url ? createPostgresDraftStore(postgresClient(url)) : memoryDraftStore;
}
