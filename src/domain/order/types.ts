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
 * THREE AXES, NOT ONE ENUM.
 *
 * An order has a PAYMENT state (`order.state`, above — the provider's word),
 * a FULFILMENT state (NEOGEN's own work: queue, pick, pack) and a SHIPMENT
 * state (the carrier's leg). They move for different reasons and at the hands
 * of different parties, so they are modelled separately and combine freely:
 *
 *   paid      · preparing     · not_shipped
 *   refunded  · cancelled     · cancelled
 *   disputed  · on_hold       · not_shipped
 *   refunded  · fulfilled     · delivered     (refund after delivery)
 *
 * Folding them together is the classic ecommerce modelling mistake: it
 * produces "paid_shipped", then "paid_shipped_refunded", and every new
 * combination multiplies the machine.
 *
 * `order.state` keeps its name — it is the payment state, and the payment
 * code that reads it is the trusted core of the system — rather than being
 * renamed for symmetry.
 */

/**
 * FULFILMENT — NEOGEN's work between "paid" and "handed to a carrier".
 *
 *   unfulfilled    not eligible yet: the order is not paid
 *   queued         paid, waiting for someone to start
 *   preparing      being picked and packed
 *   ready_to_ship  packed, waiting for the carrier
 *   fulfilled      handed to the carrier (set by dispatching a shipment)
 *   on_hold        stopped — a dispute, or an operator's decision
 *   cancelled      will not be fulfilled
 */
export type FulfilmentState =
  "unfulfilled" | "queued" | "preparing" | "ready_to_ship" | "fulfilled" | "on_hold" | "cancelled";

/** Why fulfilment stopped. Codes, not prose. */
export type HoldReason = "payment_disputed" | "operator" | "stock_short" | "address_check";

/**
 * A LOT ASSIGNED TO A LINE — the traceability link.
 *
 * ORDER → LINE → LOT → DOCUMENT. `lotId` is NEOGEN's public lot identifier
 * from `data/quality`, never the supplier's batch reference. A line may draw
 * on more than one lot; the quantities never exceed the line's.
 */
export interface LotAssignment {
  /** Index into `order.lines`. Lines are frozen, so the index is stable. */
  line: number;
  lotId: string;
  quantity: number;
  at: string;
  by: string | null;
}

export interface Fulfilment {
  state: FulfilmentState;
  /** Present only while `state` is `on_hold`: why, and where to resume. */
  hold: { reason: HoldReason; from: FulfilmentState; at: string } | null;
  lots: readonly LotAssignment[];
}

/**
 * SHIPMENT — one parcel handed (or about to be handed) to a carrier.
 *
 *   pending     recorded — a label or a booking — not yet collected
 *   in_transit  the carrier has it
 *   exception   the carrier reported a problem (failed delivery, hold)
 *   delivered   the carrier reports it delivered
 *   returned    came back to NEOGEN
 *   cancelled   the booking was cancelled before collection
 */
export type ShipmentState =
  "pending" | "in_transit" | "exception" | "delivered" | "returned" | "cancelled";

/** The order-level summary of its shipments: the active one's state, or none. */
export type ShipmentSummary = ShipmentState | "not_shipped";

export interface Shipment {
  /** NEOGEN's id, `<order>-S<n>`. The carrier's id is `providerRef`. */
  id: string;
  /**
   * Which `ShippingProvider` created it, or `manual` when an operator
   * recorded a parcel booked outside the system. Never a carrier NEOGEN has
   * not actually used for this parcel.
   */
  provider: string;
  providerRef: string | null;
  /** The carrier as the operator or provider recorded it. Free text; never a default. */
  carrier: string | null;
  service: string | null;
  trackingNumber: string | null;
  /** HTTPS only. Shown to the customer as the carrier's tracking page. */
  trackingUrl: string | null;
  /** Opaque reference to a label document held by the provider. */
  labelRef: string | null;
  state: ShipmentState;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  /** Set when tracking arrives AFTER the parcel shipped — a message is owed. */
  trackingAddedAt: string | null;
}

/** Why an order was cancelled. */
export type CancellationReason =
  | "customer_request"
  | "payment_not_completed"
  | "stock_unavailable"
  | "fraud_suspected"
  | "address_undeliverable"
  /** The provider reported the payment refunded without a NEOGEN cancellation. */
  | "payment_refunded"
  | "operator_other";

export interface Cancellation {
  at: string;
  reason: CancellationReason;
  source: EventSource;
  by: string | null;
}

/**
 * A REFUND — a request, and separately, whether money moved.
 *
 *   requested  NEOGEN decided a refund is owed. Nothing has been sent.
 *   submitted  the provider accepted the refund request. Not yet confirmed.
 *   failed     the provider refused, or could not be reached. Retryable.
 *   confirmed  the provider's own payment state says refunded.
 *
 * Only `confirmed` means money went back, and only a provider snapshot sets
 * it — the same rule as `paid`. FULL refunds only: partial refunds are
 * architected in the adapter but not enabled (an operator decision with no
 * policy behind it yet).
 */
export type RefundStatus = "requested" | "submitted" | "failed" | "confirmed";

export type RefundReason =
  | "order_cancelled"
  | "customer_request"
  | "not_delivered"
  | "returned"
  | "duplicate_charge"
  | "operator_other";

export interface Refund {
  /** `<order>:refund:<n>`. Also the idempotency key sent to the provider. */
  id: string;
  amount: Money;
  reason: RefundReason;
  status: RefundStatus;
  requestedAt: string;
  requestedBy: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  /** Stable code, never a provider message. */
  error: string | null;
}

/** When an order first reached each point. Set once, never overwritten. */
export type Milestone =
  | "paid"
  | "queued"
  | "preparing"
  | "ready"
  | "fulfilled"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed";

/** A system outside NEOGEN that knows this order by its own id. */
export interface ExternalReference {
  /** e.g. `erp`, `invoicing`. Payment and shipment refs live on their own records. */
  system: string;
  ref: string;
  at: string;
}

/** An operator's free-text note. Internal only; never rendered to a customer. */
export interface InternalNote {
  at: string;
  by: string | null;
  text: string;
}

/** An operator's acknowledgement that a flagged condition has been looked at. */
export interface AttentionAck {
  reason: string;
  at: string;
  by: string | null;
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
  /**
   * The variant — and NEOGEN's SKU. `reta-10mg` is stable, human-readable and
   * already keys prices, availability and lots, so it is the stock-keeping
   * unit; there is no second code system to drift from it.
   */
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
  | "status_changed"
  /* ---- operations (fulfilment, shipment, money back, notes) ---------- */
  | "fulfilment_changed"
  | "lot_assigned"
  | "lot_unassigned"
  | "shipment_recorded"
  | "shipment_changed"
  | "tracking_updated"
  | "order_cancelled"
  | "refund_requested"
  | "refund_submitted"
  | "refund_failed"
  | "refund_confirmed"
  | "inventory_short"
  | "note_added"
  | "attention_acknowledged"
  | "external_reference_added";

/** Who caused an event. `operator` events also carry the operator's name. */
export type EventSource = "system" | "customer" | "provider" | "operator";

/** Which axis an event moved. Absent on events written before operations existed. */
export type EventAxis = "order" | "payment" | "fulfilment" | "shipment" | "refund" | "inventory";

/** Any state an event can name, on any axis. `axis` says which. */
export type EventState = PaymentState | FulfilmentState | ShipmentState | RefundStatus;

/**
 * Safe, structured detail. Scalars only, and never: a card token, a provider
 * payload, a secret, an address or a phone number. Carrier names, tracking
 * numbers, lot ids, quantities and codes are fine.
 */
export type EventMeta = Readonly<Record<string, string | number | boolean | null>>;

export interface OrderEvent {
  seq: number;
  at: string;
  kind: OrderEventKind;
  /**
   * The provider's event id, where the event came from a provider. Globally
   * unique (the repository indexes it), so a redelivered callback — payment or,
   * later, carrier — is applied once.
   */
  providerEventId: string | null;
  from: EventState | null;
  to: EventState | null;
  /** Short machine-readable reason, e.g. "illegal_transition". Never prose. */
  note: string | null;
  axis?: EventAxis;
  source?: EventSource;
  /** The operator's name for `operator` events. */
  actor?: string | null;
  /** The external or internal record the event is about: a shipment id, a refund id. */
  ref?: string | null;
  meta?: EventMeta;
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
  /** The PAYMENT state. Only a provider answer can make it `paid`. */
  state: PaymentState;
  /** Schema of this record. 2 = operations fields present (see `upgradeOrder`). */
  schema: 2;
  fulfilment: Fulfilment;
  shipments: readonly Shipment[];
  cancellation: Cancellation | null;
  refunds: readonly Refund[];
  milestones: Readonly<Partial<Record<Milestone, string>>>;
  /**
   * Guest access. A random nonce the order-status link is derived from
   * (HMAC with a server secret), so a link can be re-issued in any later
   * email and revoked by rotating the nonce. Never the token itself.
   */
  access: { nonce: string } | null;
  externalRefs: readonly ExternalReference[];
  notes: readonly InternalNote[];
  acks: readonly AttentionAck[];
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
