import type { CheckoutDraft, PriceSnapshot } from "./types";

/**
 * DRAFT LIFECYCLE — pure. No storage, no request, no cookie.
 *
 * Kept separate from the session module on purpose: how a draft CHANGES is a
 * domain rule and is worth testing, while where it is kept is infrastructure
 * that will be replaced. `src/server/checkout/session.ts` owns the second and
 * calls into this for the first.
 */

const EMPTY_SNAPSHOT: PriceSnapshot = {
  lines: [],
  subtotal: { amount: 0, currency: "MXN" },
  pricedAt: "1970-01-01T00:00:00.000Z",
  fingerprint: "",
};

/**
 * A draft id.
 *
 * NOT the order id, and not derived from it. This one addresses a cookie and
 * is never shown to anyone, so it is long random hex rather than something
 * readable: a guessable draft id would expose one customer's address to
 * another. 128 bits from the platform CSPRNG.
 */
export function newDraftId(random: () => string = cryptoRandom): string {
  return random();
}

function cryptoRandom(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createDraft(id: string, at: string = new Date().toISOString()): CheckoutDraft {
  return {
    id,
    createdAt: at,
    updatedAt: at,
    contact: {},
    address: { country: "MX" },
    delivery: null,
    acknowledged: [],
    snapshot: EMPTY_SNAPSHOT,
    adjustments: [],
    attempted: {},
    orderId: null,
  };
}

/** Every mutation goes through here, so `updatedAt` cannot be forgotten. */
export function touch(
  draft: CheckoutDraft,
  changes: Partial<Omit<CheckoutDraft, "id" | "createdAt">>,
  at: string = new Date().toISOString(),
): CheckoutDraft {
  return { ...draft, ...changes, updatedAt: at };
}

/**
 * Replace the price snapshot, and invalidate a delivery selection whose basis
 * has moved.
 *
 * The subtlety worth having code for: free shipping depends on the subtotal.
 * Remove an item and drop below MX$10,000 and a previously "free" selection
 * is no longer free — it is unknown. Keeping it would let an order be totalled
 * with a shipping cost that no longer applies, so the selection is cleared and
 * the customer re-chooses.
 */
export function withSnapshot(
  draft: CheckoutDraft,
  snapshot: PriceSnapshot,
  adjustments: CheckoutDraft["adjustments"],
  at?: string,
): CheckoutDraft {
  const subtotalChanged = snapshot.subtotal.amount !== draft.snapshot.subtotal.amount;
  return touch(
    draft,
    {
      snapshot,
      adjustments,
      delivery: subtotalChanged ? null : draft.delivery,
      /* Re-open the delivery step if its answer was just invalidated. */
      attempted: subtotalChanged
        ? { ...draft.attempted, delivery: false, payment: false }
        : draft.attempted,
    },
    at,
  );
}

export function markAttempted(
  draft: CheckoutDraft,
  step: keyof CheckoutDraft["attempted"],
  at?: string,
): CheckoutDraft {
  return touch(draft, { attempted: { ...draft.attempted, [step]: true } }, at);
}

/** Whether the snapshot still describes what the registry says today. */
export function snapshotMatches(draft: CheckoutDraft, fresh: PriceSnapshot): boolean {
  return draft.snapshot.fingerprint === fresh.fingerprint;
}

export { EMPTY_SNAPSHOT };
