import type { CheckoutDraft } from "../types";
import type { DraftStore } from "../store";

/**
 * IN-MEMORY DRAFTS — a development adapter.
 *
 * The same production caveat as the order store applies (see
 * `domain/order/adapters/memory.ts`): one process, lost on restart, not shared
 * across serverless instances.
 *
 * It matters LESS here, and that is worth saying rather than leaving implied.
 * A lost draft means a customer retypes an address; a lost order means a paid
 * order nobody can find. So this adapter is an acceptable V1 answer for drafts
 * in a way it is emphatically not for orders — and if drafts turn out to be
 * the only thing needing a store, the cheapest production answer is a signed,
 * httpOnly cookie holding the draft itself rather than any server at all.
 */
const KEY = "__neogen_draft_store__";

function store(): Map<string, CheckoutDraft> {
  const globals = globalThis as typeof globalThis & { [KEY]?: Map<string, CheckoutDraft> };
  globals[KEY] ??= new Map();
  return globals[KEY];
}

export const memoryDraftStore: DraftStore = {
  async get(id) {
    const found = store().get(id);
    return found ? structuredClone(found) : null;
  },
  async put(draft) {
    const stored = structuredClone(draft);
    store().set(stored.id, stored);
    return structuredClone(stored);
  },
  async delete(id) {
    store().delete(id);
  },
};

/** Test-only reset. Never called by application code. */
export function __resetDraftStore(): void {
  const globals = globalThis as typeof globalThis & { [KEY]?: Map<string, CheckoutDraft> };
  delete globals[KEY];
}
