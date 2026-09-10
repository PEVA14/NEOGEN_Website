import type { Money } from "@/data/commerce";

/**
 * PAYMENT STATE — provider-independent, by design.
 *
 * No Mercado Pago, Clip or SPEI status string appears anywhere in this union.
 * Adapters translate into these names and nothing outside `src/payments/
 * adapters` knows which processor is live — which is the whole point: NEOGEN
 * has no approved processor yet, and the one it gets must not reshape the
 * application.
 *
 * `pending_payment` and `payment_processing` are deliberately separate.
 * A card authorises in seconds; a SPEI transfer sits in the first state for
 * hours while the customer goes to their bank. Collapsing them would make the
 * only non-card route we expect to support unrepresentable.
 */
export type PaymentState =
  /** Order exists, nothing attempted. */
  | "created"
  /** Awaiting a customer action — a SPEI transfer, a redirect not yet done. */
  | "pending_payment"
  /** Provider has it and is deciding. */
  | "payment_processing"
  | "paid"
  | "payment_failed"
  | "cancelled"
  | "refunded";

/**
 * Which transitions are legal.
 *
 * Stated as data rather than scattered through `if`s, so the state machine can
 * be checked (`scripts/check-commerce.mjs`) and a webhook cannot walk an order
 * backwards from `paid` because a provider redelivered an old event — which
 * providers routinely do.
 */
export const TRANSITIONS: Readonly<Record<PaymentState, readonly PaymentState[]>> = {
  created: ["pending_payment", "payment_processing", "cancelled"],
  pending_payment: ["payment_processing", "paid", "payment_failed", "cancelled"],
  payment_processing: ["paid", "payment_failed"],
  /* Terminal except for a refund. Notably NOT back to processing: a
     redelivered authorisation event must not un-pay a paid order. */
  paid: ["refunded"],
  payment_failed: ["pending_payment", "cancelled"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Terminal states — nothing further will happen on its own. */
export function isSettled(state: PaymentState): boolean {
  return TRANSITIONS[state].length === 0 || state === "paid";
}

/**
 * ONE LINE OF AN ORDER — a snapshot, not a reference.
 *
 * Product name, presentation and unit price are COPIED at order time. An order
 * is a record of what was agreed, and this catalogue's prices are still
 * provisional: a line that pointed at a variant id would silently restate
 * itself every time a price was corrected, and a customer's receipt would stop
 * matching what they paid.
 */
export interface OrderLine {
  variantId: string;
  slug: string;
  name: string;
  presentation: string;
  unitPrice: Money;
  quantity: number;
  /** unitPrice × quantity, stored so a total never depends on re-multiplying. */
  lineTotal: Money;
}

export interface OrderTotals {
  subtotal: Money;
  shipping: Money;
  total: Money;
}

/** Where it ships. Shape only — no field here is collected yet. */
export interface ShippingAddress {
  name: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  /** NEOGEN's own reference, shown to the customer. */
  id: string;
  createdAt: string;
  state: PaymentState;
  lines: readonly OrderLine[];
  totals: OrderTotals;
  email: string | null;
  shipping: ShippingAddress | null;
  /**
   * The fulfilment route, resolved at order time from the address.
   * `priority` is Guadalajara / Durango; `national` is everywhere else.
   */
  route: "priority" | "national" | null;
  /**
   * The provider's own id for this payment, once one exists.
   *
   * Opaque on purpose. It is the only provider-shaped value the order carries,
   * and nothing reads it except the adapter that issued it.
   */
  providerRef: string | null;
  /** Which adapter owns `providerRef`. Null before a payment is attempted. */
  provider: string | null;
}
