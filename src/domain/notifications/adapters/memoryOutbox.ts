import type { NotificationMessage, NotificationOutbox, OutboxEntry } from "../types";

/**
 * IN-MEMORY OUTBOX — a development adapter, with the same production caveat as
 * the order store (`domain/order/adapters/memory.ts`): one process, lost on
 * restart. In production the outbox is a table beside the orders, written in
 * the same transaction — see docs/PERSISTENCE_RECOMMENDATION.md.
 */
const KEY = "__neogen_notification_outbox__";

function store(): Map<string, OutboxEntry> {
  const g = globalThis as typeof globalThis & { [KEY]?: Map<string, OutboxEntry> };
  g[KEY] ??= new Map();
  return g[KEY];
}

export function memoryOutbox(): NotificationOutbox {
  return {
    async enqueue(message: NotificationMessage) {
      const existing = store().get(message.id);
      if (existing) return { created: false, entry: structuredClone(existing) };
      const entry: OutboxEntry = {
        message: structuredClone(message),
        status: "pending",
        attempts: 0,
        lastError: null,
        providerMessageId: null,
        updatedAt: message.createdAt,
      };
      store().set(message.id, entry);
      return { created: true, entry: structuredClone(entry) };
    },
    async get(id) {
      const found = store().get(id);
      return found ? structuredClone(found) : null;
    },
    async markSent(id, providerMessageId, at) {
      const entry = store().get(id);
      if (!entry) return;
      store().set(id, {
        ...entry,
        status: "sent",
        attempts: entry.attempts + 1,
        providerMessageId,
        lastError: null,
        updatedAt: at,
      });
    },
    async markFailed(id, error, at) {
      const entry = store().get(id);
      if (!entry) return;
      store().set(id, {
        ...entry,
        status: "failed",
        attempts: entry.attempts + 1,
        lastError: error,
        updatedAt: at,
      });
    },
    async pending() {
      return [...store().values()]
        .filter((e) => e.status !== "sent")
        .map((e) => structuredClone(e));
    },
  };
}

/** Test-only reset. */
export function __resetOutbox(): void {
  const g = globalThis as typeof globalThis & { [KEY]?: Map<string, OutboxEntry> };
  delete g[KEY];
}
