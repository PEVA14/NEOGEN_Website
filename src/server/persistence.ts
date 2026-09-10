import "server-only";

import { memoryDraftStore } from "@/domain/checkout/adapters/memory";
import { memoryOrderRepository } from "@/domain/order/adapters/memory";

import type { DraftStore } from "@/domain/checkout/store";
import type { OrderRepository } from "@/domain/order/repository";

/**
 * WHERE THE ADAPTERS ARE CHOSEN — the one file that knows.
 *
 * Two functions, four lines of logic, and the entire production storage
 * migration is contained by them. Nothing else in the application imports an
 * adapter: routes and actions ask for an `OrderRepository`, and the domain
 * takes one as an argument.
 *
 * `server-only` is imported at the top so this cannot be pulled into a client
 * bundle. That is not tidiness — the adapters hold customer addresses and
 * order contents in a process-global map, and a build that shipped this file
 * to a browser would be shipping the shape of NEOGEN's order store to
 * everyone. The import turns that into a build error.
 *
 * TODO(pre-launch): register a durable adapter here. See the production
 * blocker documented on `domain/order/adapters/memory.ts` — the decision is
 * the owner's, because it is a privacy and cost question before a technical
 * one, and Mexican customer addresses are personal data.
 */
export function orderRepository(): OrderRepository {
  return memoryOrderRepository;
}

export function draftStore(): DraftStore {
  return memoryDraftStore;
}
