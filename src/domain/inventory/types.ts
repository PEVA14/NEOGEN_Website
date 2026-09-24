/**
 * INVENTORY — what NEOGEN can count, and nothing it cannot.
 *
 * TRACKING IS OPT-IN, PER VARIANT. A variant has a stock level only after an
 * operator records a physical count of it. Until then it is UNTRACKED: never
 * limited, never reserved — exactly how the shop behaved before inventory
 * existed. Nothing seeds a number: a stock count nobody took is a claim about
 * a shelf nobody looked at.
 *
 *   on_hand    units physically held, from counts, receipts and adjustments
 *   reserved   units promised to orders whose payment is in flight or taken,
 *              not yet handed to a carrier
 *   available  on_hand − reserved — what a new order may take
 *
 * THE LIFECYCLE OF A UNIT ON AN ORDER:
 *
 *   hold      at payment, before the provider is called, all lines or none —
 *             the step that makes a double sale impossible
 *   release   the payment failed, or the order was cancelled before dispatch
 *   consume   the parcel left (fulfilment `fulfilled`): on_hand and reserved
 *             both fall
 *
 * A refund AFTER dispatch restores nothing: the units are gone. A parcel that
 * comes back is restocked by an operator (`return_restock`), who has seen it.
 */

export interface StockLevel {
  /** The SKU (variant id). */
  variantId: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
}

export function available(level: StockLevel): number {
  return level.onHand - level.reserved;
}

export type HoldStatus = "held" | "released" | "consumed";

export interface HoldLine {
  orderId: string;
  variantId: string;
  quantity: number;
  status: HoldStatus;
  updatedAt: string;
}

/** Why an operator changed a count. Codes, rendered in the console's words. */
export type AdjustmentReason =
  | "initial_count"
  | "cycle_count"
  | "receipt"
  | "damaged"
  | "expired"
  | "return_restock"
  | "correction";

export const ADJUSTMENT_REASONS: readonly AdjustmentReason[] = [
  "initial_count",
  "cycle_count",
  "receipt",
  "damaged",
  "expired",
  "return_restock",
  "correction",
];

export type MovementKind = "count" | "adjustment" | "hold" | "release" | "consume";

export interface StockMovement {
  /** Idempotency key: a retried write records one movement. */
  id: string;
  variantId: string;
  kind: MovementKind;
  onHandDelta: number;
  reservedDelta: number;
  reason: AdjustmentReason | null;
  orderId: string | null;
  /** The lot a receipt or adjustment concerned, when known. */
  lotId: string | null;
  source: "operator" | "system";
  actor: string | null;
  note: string | null;
  at: string;
}

export interface AdjustInput {
  /** Idempotency key for this adjustment — the console issues one per form. */
  id: string;
  variantId: string;
  /**
   * `count` sets on-hand to an absolute number (first count starts tracking);
   * `adjustment` adds a signed delta to a tracked variant.
   */
  mode: "count" | "adjustment";
  quantity: number;
  reason: AdjustmentReason;
  lotId: string | null;
  actor: string | null;
  note: string | null;
  at: string;
}

export type AdjustResult =
  | { ok: true; level: StockLevel; duplicate: boolean }
  | { ok: false; reason: "untracked" | "below_reserved" | "invalid" };

export interface HoldRequest {
  variantId: string;
  quantity: number;
}

export type HoldResult =
  | { ok: true }
  | { ok: false; short: readonly { variantId: string; requested: number; available: number }[] };

/**
 * THE INVENTORY STORE — memory for development, Postgres in production
 * (`db/migrations/002_operations.sql`), chosen in `server/persistence.ts`.
 *
 * Every method is idempotent per order: holding an order already held,
 * releasing one already released, consuming one already consumed, all do
 * nothing. That is what lets the server re-derive the right state after
 * every order change without counting how many times it has run.
 */
export interface InventoryStore {
  levels(): Promise<readonly StockLevel[]>;
  level(variantId: string): Promise<StockLevel | null>;
  adjust(input: AdjustInput): Promise<AdjustResult>;
  /**
   * Reserve every TRACKED line, or none. Untracked lines are skipped. Safe
   * under concurrency: two orders racing for the last unit cannot both win.
   */
  hold(orderId: string, lines: readonly HoldRequest[], at: string): Promise<HoldResult>;
  release(orderId: string, at: string): Promise<void>;
  /** The parcel left. Held lines leave the shelf; tracked lines never held do too. */
  consume(orderId: string, lines: readonly HoldRequest[], at: string): Promise<void>;
  holds(orderId: string): Promise<readonly HoldLine[]>;
  movements(filter: {
    variantId?: string;
    orderId?: string;
    limit?: number;
  }): Promise<readonly StockMovement[]>;
}
