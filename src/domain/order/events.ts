import { canTransition, isPayable } from "./types";

import type { PaymentErrorCode } from "@/payments/types";
import type { Order, OrderEvent, PaymentAttempt, PaymentState } from "./types";

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
  /**
   * Why, in NEOGEN's vocabulary — a decline reason such as
   * `insufficient_funds`, or null. Stored as the audit note, and the only
   * thing the payment step reads to explain a decline.
   */
  detail?: string | null;
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

  /*
   * AN EVENT FOR AN EARLIER ATTEMPT. A retry clears `providerRef` until the
   * provider answers, so without this check a late event for the declined
   * first attempt would be adopted as the reference of the second. Refused
   * and recorded — and if it claims money moved, the note says so loudly,
   * because that is a charge an operator must reconcile by hand.
   */
  if (
    order.providerRef === null &&
    order.attempts.some((a) => a.providerRef === event.providerRef)
  ) {
    const note = event.state === "paid" ? "paid_on_earlier_attempt" : "earlier_attempt_ref";
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
          note,
        }),
      },
      outcome: "mismatched_ref",
      note,
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
        note: event.detail ?? null,
      }),
    },
    outcome: "applied",
    note: null,
  };
}

/** The attempt currently being made, if one has not been answered. */
export function openAttempt(order: Order): PaymentAttempt | null {
  const last = order.attempts.at(-1);
  return last && last.outcome === "submitted" ? last : null;
}

/** The idempotency key for an order's nth attempt. Stable, never random. */
export function attemptKey(orderId: string, seq: number): string {
  return `${orderId}:attempt:${seq}`;
}

/**
 * CLAIM THE RIGHT TO CHARGE — before the provider is called.
 *
 * Returns null when this order may not be charged now: it is already paid,
 * money may be in flight, or another submission holds the claim. Persisted
 * through `mutate`, so of two submissions racing for one order exactly one
 * saves this and the other re-reads and gets null. That — not a disabled
 * button — is what makes a double click, a second tab or a replayed request
 * unable to charge twice.
 *
 * The order moves to `payment_processing` and forgets the previous attempt's
 * reference, so a late event for that attempt cannot be mistaken for this
 * one (see `applyPaymentEvent`).
 */
export function beginAttempt(
  order: Order,
  attempt: { provider: string; at: string },
): Order | null {
  if (!isPayable(order.state) || openAttempt(order)) return null;

  const seq = order.attempts.length + 1;
  return {
    ...order,
    state: "payment_processing",
    updatedAt: attempt.at,
    provider: attempt.provider,
    providerRef: null,
    attempts: [
      ...order.attempts,
      {
        seq,
        provider: attempt.provider,
        at: attempt.at,
        outcome: "submitted",
        idempotencyKey: attemptKey(order.id, seq),
        providerRef: null,
        errorCode: null,
        answeredAt: null,
      },
    ],
    events: append(order, {
      at: attempt.at,
      kind: "payment_submitted",
      providerEventId: null,
      from: order.state,
      to: "payment_processing",
      note: `attempt_${seq}`,
    }),
  };
}

/**
 * Record what the provider said to the open attempt.
 *
 * NOT a state change by itself. `answered` hands the provider's reference to
 * the order; the state the provider reported is then applied through
 * `applyPaymentEvent`, exactly as a webhook's would be, so the synchronous
 * answer and the later notification share one deduplication key and one
 * transition table.
 *
 * `refused` means the provider created nothing (a bad token, a rejected
 * request): nothing can have been charged, so the order returns to
 * `payment_failed` and the customer may retry. `unanswered` means we do not
 * know — the order stays in `payment_processing` for the webhook to settle.
 */
export function answerAttempt(
  order: Order,
  answer: {
    at: string;
    outcome: "answered" | "refused" | "unanswered";
    providerRef?: string | null;
    errorCode?: PaymentErrorCode | null;
    detail?: string | null;
  },
): Order {
  const open = openAttempt(order);
  if (!open) return order;

  const attempts = order.attempts.map((a) =>
    a.seq === open.seq
      ? {
          ...a,
          outcome: answer.outcome,
          providerRef: answer.providerRef ?? null,
          errorCode: answer.errorCode ?? null,
          answeredAt: answer.at,
        }
      : a,
  );

  const refused = answer.outcome === "refused" && order.state === "payment_processing";
  return {
    ...order,
    updatedAt: answer.at,
    state: refused ? "payment_failed" : order.state,
    providerRef: answer.providerRef ?? order.providerRef,
    attempts,
    events: append(order, {
      at: answer.at,
      kind: "payment_answered",
      providerEventId: null,
      from: order.state,
      to: refused ? "payment_failed" : null,
      note: answer.detail ?? answer.errorCode ?? answer.outcome,
    }),
  };
}

/**
 * How long an attempt may go unanswered before the customer may try again.
 *
 * An attempt with NO provider reference after this long means the request
 * never produced a payment we know of — the server died mid-call, say. The
 * order is released to `payment_failed` so the customer is not stuck. If the
 * provider did in fact create a payment, its webhook still arrives, finds the
 * order by its external reference, and `payment_failed → paid` is legal.
 */
export const STALLED_ATTEMPT_MS = 15 * 60 * 1000;

export function recoverStalledAttempt(order: Order, now: string): Order | null {
  if (order.state !== "payment_processing" || order.providerRef !== null) return null;
  const last = order.attempts.at(-1);
  if (!last || (last.outcome !== "submitted" && last.outcome !== "unanswered")) return null;
  if (Date.parse(now) - Date.parse(last.at) < STALLED_ATTEMPT_MS) return null;

  return {
    ...order,
    state: "payment_failed",
    updatedAt: now,
    attempts: order.attempts.map((a) =>
      a.seq === last.seq
        ? { ...a, outcome: "unanswered", errorCode: "provider_error", answeredAt: now }
        : a,
    ),
    events: append(order, {
      at: now,
      kind: "payment_answered",
      providerEventId: null,
      from: order.state,
      to: "payment_failed",
      note: "unconfirmed",
    }),
  };
}

/**
 * The reason the latest attempt failed, in NEOGEN's vocabulary, or null.
 *
 * Read from the audit trail rather than stored separately, so there is one
 * record of why and it cannot disagree with itself.
 */
export function lastDecline(order: Order): string | null {
  if (order.state !== "payment_failed") return null;
  for (let i = order.events.length - 1; i >= 0; i -= 1) {
    const e = order.events[i];
    if (
      e.to === "payment_failed" &&
      (e.kind === "payment_event_applied" || e.kind === "payment_answered")
    ) {
      return e.note;
    }
  }
  return null;
}
