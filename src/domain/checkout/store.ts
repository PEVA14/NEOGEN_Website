import type { CheckoutDraft } from "./types";

/**
 * THE DRAFT STORE BOUNDARY — separate from the order repository, deliberately.
 *
 * A draft and an order have opposite requirements and will get different
 * production answers. A draft is one person's half-finished form: short-lived,
 * disposable, and losing one costs a customer thirty seconds of retyping. An
 * order is a financial record that must survive everything.
 *
 * Giving them one interface would force the cheap thing to be stored as
 * durably as the expensive thing — or, worse, the expensive thing as
 * carelessly as the cheap one. So there are two, and the draft store may
 * later be a signed cookie or a short-TTL KV entry while orders go to a
 * database.
 *
 * NO OPTIMISTIC VERSIONING HERE. A draft has exactly one writer — the
 * customer whose cookie addresses it — so last-write-wins is correct and a
 * version counter would be ceremony.
 */
export interface DraftStore {
  get(id: string): Promise<CheckoutDraft | null>;
  put(draft: CheckoutDraft): Promise<CheckoutDraft>;
  delete(id: string): Promise<void>;
}
