import type { Money } from "@/data/commerce";
import type {
  AcceptedAcknowledgement,
  Contact,
  DeliverySelection,
  MxAddress,
} from "@/domain/checkout/types";
import type { Locale } from "@/i18n/config";
import type { PaymentErrorCode } from "@/payments/types";

/**
 * PAYMENT STATE — provider-independent, by design.
 *
 * No Mercado Pago, Clip or SPEI status string appears anywhere in this union.
 * Adapters translate into these names and nothing outside `src/payments/
 * adapters` knows which processor is live — which is the whole point: the
 * processor NEOGEN integrates first (Mercado Pago) must not reshape the
 * application, and a second one must be able to arrive the same way.
 *
 * `pending_payment` and `payment_processing` are deliberately separate.
 * A card authorises in seconds; a SPEI transfer or a 3-D Secure challenge sits
 * in the first state while the customer acts. Collapsing them would make every
 * non-instant route unrepresentable.
 */
export type PaymentState =
  /** Order exists, nothing attempted. */
  | "created"
  /** Awaiting a customer action — a transfer, a challenge, a redirect not yet done. */
  | "pending_payment"
  /** Provider has it and is deciding (or NEOGEN has sent it and awaits the answer). */
  | "payment_processing"
  | "paid"
  /** The last attempt did not complete. Retryable: nothing was charged. */
  | "payment_failed"
  | "cancelled"
  | "refunded"
  /**
   * A paid order the cardholder disputed (a chargeback). Money may be leaving;
   * an operator decides what happens. Never reached from a customer action.
   */
  | "disputed";

/**
 * Which transitions are legal.
 *
 * Stated as data rather than scattered through `if`s, so the state machine can
 * be checked (`scripts/check-commerce.mjs`) and a webhook cannot walk an order
 * backwards from `paid` because a provider redelivered an old event — which
 * providers routinely do.
 *
 * WHY `created → paid` AND `payment_failed → paid` ARE LEGAL. A card charged
 * through an embedded form is answered in the same request: the provider's
 * first word about the payment can be "approved". And a retry after a decline
 * starts from `payment_failed`. Neither is a shortcut past verification — the
 * state still comes only from the provider's answer, never from the browser.
 */
export const TRANSITIONS: Readonly<Record<PaymentState, readonly PaymentState[]>> = {
  created: ["pending_payment", "payment_processing", "paid", "payment_failed", "cancelled"],
  pending_payment: ["payment_processing", "paid", "payment_failed", "cancelled"],
  /* `pending_payment` is reachable from here because a provider can ask for a
     customer action mid-flight (a 3-D Secure challenge, a transfer). */
  payment_processing: ["pending_payment", "paid", "payment_failed"],
  /* Terminal except for a refund or a dispute. Notably NOT back to processing:
     a redelivered authorisation event must not un-pay a paid order. */
  paid: ["refunded", "disputed"],
  /* A retry: the customer submits again, or the provider settles late. */
  payment_failed: ["pending_payment", "payment_processing", "paid", "cancelled"],
  cancelled: [],
  refunded: [],
  /* A dispute resolves in the merchant's favour (paid) or not (refunded). */
  disputed: ["paid", "refunded"],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Terminal states — nothing further will happen on its own. */
export function isSettled(state: PaymentState): boolean {
  return TRANSITIONS[state].length === 0 || state === "paid";
}

/**
 * States from which a customer may submit a payment.
 *
 * Only these two. `pending_payment` and `payment_processing` mean money may be
 * in flight, and letting a second attempt start there is how a customer gets
 * charged twice.
 */
export const PAYABLE_STATES: readonly PaymentState[] = ["created", "payment_failed"];

export function isPayable(state: PaymentState): boolean {
  return PAYABLE_STATES.includes(state);
}

/**
 * FULFILMENT STATUS — a SEPARATE axis from payment, deliberately.
 *
 * A paid order still has to be picked, packed and shipped, and an unpaid one
 * can be cancelled. Folding both into one enum is the classic ecommerce
 * modelling mistake: it produces states like "paid_shipped" and then
 * "paid_shipped_refunded", and every new combination multiplies the machine.
 *
 * Nothing advances this today — there is no operations tooling — so every
 * order sits at `placed`. It exists now because retrofitting a second axis
 * onto persisted orders later means migrating them.
 */
export type OrderStatus = "placed" | "in_review" | "preparing" | "shipped" | "delivered" | "closed";

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

/**
 * ONE ATTEMPT TO PAY.
 *
 * Recorded whether it succeeded or not, and the failures are the valuable
 * half: "the provider refused four times" is the difference between a
 * customer who changed their mind and an integration that is broken. No card
 * data, no token, no provider payload — a code and a reference.
 *
 * THE LIFECYCLE. `submitted` is written BEFORE the provider is called, under
 * the order's optimistic lock, so two submissions racing for one order cannot
 * both reach the provider. The provider's reply then turns it into `answered`
 * (an order/payment exists at the provider), `refused` (the provider declined
 * to create one) or `unanswered` (no reply — a timeout; money may or may not
 * have moved, so the order waits for the webhook instead of guessing).
 */
export type PaymentAttemptOutcome = "submitted" | "answered" | "refused" | "unanswered";

export interface PaymentAttempt {
  /** Sequence within the order, from 1. */
  seq: number;
  provider: string;
  at: string;
  outcome: PaymentAttemptOutcome;
  /**
   * The key sent to the provider with this attempt. Derived from the order id
   * and the sequence, so the same attempt can never be sent under two keys.
   */
  idempotencyKey: string | null;
  /** The provider's id for the payment, once it has issued one. */
  providerRef: string | null;
  /** Stable code from `PaymentErrorCode`, never a provider message. */
  errorCode: PaymentErrorCode | null;
  /** When the provider answered (or was given up on). */
  answeredAt: string | null;
}

/**
 * THE AUDIT TRAIL.
 *
 * Append-only. Every state change and every rejected state change lands here,
 * including the ones that changed nothing — a duplicate webhook that was
 * correctly ignored is exactly the event you want a record of when a customer
 * says they were charged twice.
 */
export type OrderEventKind =
  | "created"
  | "payment_intent"
  | "payment_event_applied"
  | "payment_event_duplicate"
  | "payment_event_rejected"
  /** A payment attempt left NEOGEN, and what came back. */
  | "payment_submitted"
  | "payment_answered"
  | "status_changed";

export interface OrderEvent {
  seq: number;
  at: string;
  kind: OrderEventKind;
  /** The provider's event id, where the event came from a provider. */
  providerEventId: string | null;
  from: PaymentState | null;
  to: PaymentState | null;
  /** Short machine-readable reason, e.g. "illegal_transition". Never prose. */
  note: string | null;
}

export interface Order {
  /** NEOGEN's own reference, shown to the customer. */
  id: string;
  createdAt: string;
  updatedAt: string;
  /**
   * Optimistic-concurrency counter, incremented on every persisted change.
   *
   * A webhook and an admin action can touch one order at the same moment. The
   * repository refuses a write whose `version` is stale, so the loser retries
   * against fresh state instead of overwriting a payment transition with an
   * older copy of the order.
   */
  version: number;
  state: PaymentState;
  status: OrderStatus;
  lines: readonly OrderLine[];
  totals: OrderTotals;
  /** Frozen at order time. Never re-read from the draft or the registry. */
  contact: Contact;
  shipping: MxAddress;
  delivery: DeliverySelection;
  /**
   * The fulfilment route, resolved at order time from the address.
   * `priority` is Guadalajara / Durango; `national` is everywhere else.
   */
  route: "priority" | "national";
  /** Exactly which declarations, at which versions, were accepted. */
  acknowledged: readonly AcceptedAcknowledgement[];
  /**
   * The language the customer ordered in. Messages sent after the fact — by a
   * webhook, with no request to read a locale from — are written in it.
   */
  locale: Locale;
  /**
   * The provider's own id for this payment, once one exists.
   *
   * Opaque on purpose. It is the only provider-shaped value the order carries,
   * and nothing reads it except the adapter that issued it.
   */
  providerRef: string | null;
  /** Which adapter owns `providerRef`. Null before a payment is attempted. */
  provider: string | null;
  attempts: readonly PaymentAttempt[];
  events: readonly OrderEvent[];
}
