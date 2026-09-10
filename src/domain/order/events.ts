import { canTransition } from "./types";

import type { Order, OrderEvent, PaymentState } from "./types";

/**
 * PAYMENT EVENTS — idempotency, ordering, and non-regression.
 *
 * Built now, before any processor exists, because these are the properties
 * that are impossible to retrofit safely. A live integration that discovers
 * it double-applies refunds discovers it on real money.
 *
 * THREE THINGS PROVIDERS RELIABLY DO, all of them handled here.
 *
 *   1. THEY REDELIVER. Any callback that is not acknowledged fast enough is
 *      sent again, sometimes for days. So an event is identified by the
 *      PROVIDER'S OWN event id and applied at most once — `alreadySeen`.
 *
 *   2. THEY ARRIVE OUT OF ORDER. `payment_processing` can land after `paid`
 *      because the two were dispatched concurrently. The state machine
 *      refuses it (`paid` has only `refunded` ahead of it), so lateness is
 *      handled by the same rule that handles illegality, with no timestamps
 *      to compare and no clock to trust.
 *
 *   3. THEY SEND THINGS NOBODY SUBSCRIBED TO. The adapter returns null for
 *      those and they never reach this module.
 *
 * WHAT THIS MODULE IS NOT: it does not verify signatures, and it never sees a
 * provider payload. The adapter has already reduced a callback to
 * `{ providerRef, state }` before anything here runs — so no provider
 * vocabulary can leak into the order machine, and a compromised payload cannot
 * reach a state name it was not translated into.
 */

/** What the adapter hands over, plus the identity the transport carries. */
export interface NormalisedPaymentEvent {
  /** The PROVIDER's id for this delivery. The deduplication key. */
  providerEventId: string;
  provider: string;
  providerRef: string;
  /** The state this event asserts the payment is in. */
  state: PaymentState;
  receivedAt: string;
}

export type ApplyOutcome =
  /** The order moved. */
  | "applied"
  /** Seen before. Acknowledged, nothing done. */
  | "duplicate"
  /** Legal-but-redundant: the order is already in that state. */
  | "noop"
  /** Illegal or late. Recorded and refused. */
  | "rejected"
  /** The event is for a different payment than this order's. */
  | "mismatched_ref";

export interface ApplyResult {
  order: Order;
  outcome: ApplyOutcome;
  note: string | null;
}

/** Has this exact provider delivery already been recorded against the order? */
export function alreadySeen(order: Order, providerEventId: string): boolean {
  return order.events.some((e) => e.providerEventId === providerEventId);
}

function append(order: Order, event: Omit<OrderEvent, "seq">): OrderEvent[] {
  return [...order.events, { ...event, seq: order.events.length + 1 }];
}

/**
 * Apply one normalised provider event to one order.
 *
 * PURE. Takes an order, returns an order — no repository, no I/O — which is
 * what makes every branch below directly testable in
 * `scripts/check-checkout.mjs`, including the ones that are hard to provoke
 * against a live provider.
 *
 * Every outcome except `applied` still returns a MODIFIED order, because the
 * refusal itself is recorded. Silently dropping a rejected event would leave
 * no trace of the thing you most want to see afterwards.
 */
export function applyPaymentEvent(order: Order, event: NormalisedPaymentEvent): ApplyResult {
  if (alreadySeen(order, event.providerEventId)) {
    /*
     * NOT re-recorded. A provider retrying fifty times would otherwise write
     * fifty audit rows, and the first one already says everything.
     */
    return { order, outcome: "duplicate", note: "already_applied" };
  }

  /*
   * The event must belong to this order's payment. `providerRef` is set when
   * the intent is created, so a mismatch means the callback was routed to the
   * wrong order — which must never be applied, however legal the transition
   * would be.
   */
  if (order.providerRef !== null && order.providerRef !== event.providerRef) {
    return {
      order: {
        ...order,
        updatedAt: event.receivedAt,
        events: append(order, {
          at: event.receivedAt,
          kind: "payment_event_rejected",
          providerEventId: event.providerEventId,
          from: order.state,
          to: event.state,
          note: "provider_ref_mismatch",
        }),
      },
      outcome: "mismatched_ref",
      note: "provider_ref_mismatch",
    };
  }

  if (order.state === event.state) {
    return {
      order: {
        ...order,
        updatedAt: event.receivedAt,
        events: append(order, {
          at: event.receivedAt,
          kind: "payment_event_duplicate",
          providerEventId: event.providerEventId,
          from: order.state,
          to: event.state,
          note: "same_state",
        }),
      },
      outcome: "noop",
      note: "same_state",
    };
  }

  if (!canTransition(order.state, event.state)) {
    /*
     * THE PROPERTY THAT MATTERS MOST. An out-of-order or replayed event that
     * would walk a paid order backwards lands here and is refused by the
     * transition table, not by a special case — which is why it also covers
     * transitions nobody thought to write a guard for.
     */
    return {
      order: {
        ...order,
        updatedAt: event.receivedAt,
        events: append(order, {
          at: event.receivedAt,
          kind: "payment_event_rejected",
          providerEventId: event.providerEventId,
          from: order.state,
          to: event.state,
          note: "illegal_transition",
        }),
      },
      outcome: "rejected",
      note: "illegal_transition",
    };
  }

  return {
    order: {
      ...order,
      state: event.state,
      updatedAt: event.receivedAt,
      provider: order.provider ?? event.provider,
      providerRef: order.providerRef ?? event.providerRef,
      events: append(order, {
        at: event.receivedAt,
        kind: "payment_event_applied",
        providerEventId: event.providerEventId,
        from: order.state,
        to: event.state,
        note: null,
      }),
    },
    outcome: "applied",
    note: null,
  };
}

/**
 * Record a payment attempt.
 *
 * Separate from `applyPaymentEvent` because an attempt is not a state change:
 * asking a provider to open a payment and the provider telling us what
 * happened are two different facts, and conflating them is how an order ends
 * up "processing" because we tried, not because anyone is processing anything.
 */
export function recordAttempt(
  order: Order,
  attempt: {
    provider: string;
    at: string;
    outcome: "intent_created" | "intent_refused";
    providerRef?: string | null;
    errorCode?: import("@/payments/types").PaymentErrorCode | null;
  },
): Order {
  return {
    ...order,
    updatedAt: attempt.at,
    provider: attempt.provider,
    providerRef: attempt.providerRef ?? order.providerRef,
    attempts: [
      ...order.attempts,
      {
        seq: order.attempts.length + 1,
        provider: attempt.provider,
        at: attempt.at,
        outcome: attempt.outcome,
        providerRef: attempt.providerRef ?? null,
        errorCode: attempt.errorCode ?? null,
      },
    ],
    events: append(order, {
      at: attempt.at,
      kind: "payment_intent",
      providerEventId: null,
      from: order.state,
      to: null,
      note: attempt.outcome,
    }),
  };
}
