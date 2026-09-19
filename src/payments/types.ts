import type { Money } from "@/data/commerce";
import type { Order, PaymentState } from "@/domain/order";

/**
 * HOW A CUSTOMER COMPLETES PAYMENT — the only provider-shaped thing the UI sees.
 *
 * Three shapes cover every route NEOGEN might plausibly take, and the checkout
 * renders one branch per shape rather than one branch per processor.
 */
export type PaymentAction =
  /**
   * The provider's own secure fields, mounted INSIDE the NEOGEN page.
   *
   * `publicKey` is a publishable client key — never a secret. Raw card data is
   * entered into the provider's iframes and never touches markup this project
   * authors; what reaches NEOGEN is a single-use token.
   *
   * `component` names which client island mounts the fields. It is the one
   * provider-shaped string the page needs, because an embedded form is by
   * nature a specific provider's form.
   */
  | {
      kind: "embedded";
      component: "mercadopago.cardPayment";
      publicKey: string;
      /** The amount the fields display. Never read back from the browser. */
      amount: Money;
      /** Test credentials: no real money can move. Shown on the page. */
      testMode: boolean;
    }
  /** A provider-hosted page. We leave and come back. */
  | { kind: "redirect"; url: string }
  /**
   * Transfer instructions — the SPEI / cash-voucher route. The order sits in
   * `pending_payment` until the provider confirms receipt. Architected, not
   * enabled: see docs/PAYMENTS.md for why.
   */
  | { kind: "instructions"; reference: string; expiresAt: string; amount: Money };

/** Why a payment could not be opened or charged. Stable codes; never provider strings. */
export type PaymentErrorCode =
  /** No adapter configured, or commerce is switched off. */
  | "unavailable"
  /** The order is not in a state that can be paid. */
  | "invalid_state"
  /** The provider declined the transaction. */
  | "declined"
  /** Network or provider outage — retryable. */
  | "provider_error";

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
}

/**
 * WHY A PAYMENT WAS DECLINED, in NEOGEN's words.
 *
 * Adapters reduce their processor's many rejection details to this list; the
 * payment step has one sentence per entry. Deliberately coarse: a customer
 * needs to know whether to try another card, call their bank or fix a typo,
 * not the processor's internal taxonomy.
 */
export type DeclineReason =
  | "insufficient_funds"
  | "card_data"
  | "call_for_authorize"
  | "card_disabled"
  | "high_risk"
  | "issuer_rejected"
  | "amount_limit"
  | "installments"
  | "attempts_exceeded"
  | "expired"
  | "cancelled"
  | "unconfirmed"
  | "generic";

export const DECLINE_REASONS: readonly DeclineReason[] = [
  "insufficient_funds",
  "card_data",
  "call_for_authorize",
  "card_disabled",
  "high_risk",
  "issuer_rejected",
  "amount_limit",
  "installments",
  "attempts_exceeded",
  "expired",
  "cancelled",
  "unconfirmed",
  "generic",
];

/**
 * WHAT THE BROWSER MAY SEND WHEN IT PAYS — and nothing else.
 *
 * A single-use token issued by the provider's own fields, and the provider's
 * identifiers for the card brand and type. No card number, no security code,
 * no expiry, no amount: the amount is the order's, read on the server.
 */
export interface TokenizedInstrument {
  token: string;
  /** The provider's id for the card brand, e.g. `master`. */
  methodId: string;
  typeId: "credit_card" | "debit_card" | "prepaid_card";
  installments: number;
  /** Tax identification the provider's form may collect. Passed through, never stored. */
  identification: { type: string; number: string } | null;
}

/**
 * THE PROVIDER'S AUTHORITATIVE WORD ON ONE PAYMENT, already translated.
 *
 * Produced only from a response to a request NEOGEN made with its own secret
 * credentials — the synchronous answer to a charge, or a status fetch — never
 * from a browser and never from an unsigned body.
 */
export interface PaymentSnapshot {
  providerRef: string;
  /**
   * Deduplication key for this FACT: the same payment in the same provider
   * state always yields the same id, so a synchronous answer, its webhook and
   * every redelivery of that webhook are applied once between them.
   */
  eventId: string;
  /** Null when the provider's state implies no change (e.g. just created). */
  state: PaymentState | null;
  detail: DeclineReason | null;
  /** What the provider says the payment is for. Checked against the order. */
  amount: Money | null;
  /** NEOGEN's order id, as the provider echoes it back. */
  externalReference: string | null;
  /** Whether the provider says this is live money. Null when not stated. */
  live: boolean | null;
}

export type ChargeResult =
  /** The provider created a payment and told us its state. */
  | { kind: "answered"; snapshot: PaymentSnapshot }
  /** The provider created nothing. Nothing can have been charged. */
  | { kind: "refused"; error: PaymentError; detail: DeclineReason | null }
  /** No usable answer. Money may or may not have moved — wait for the webhook. */
  | { kind: "unanswered"; error: PaymentError };

export type StatusResult =
  { ok: true; snapshot: PaymentSnapshot } | { ok: false; reason: "not_found" | "provider_error" };

/**
 * WHAT A WEBHOOK DELIVERY PROVED.
 *
 * `verified` carries only a reference: the adapter authenticated WHO sent the
 * notification and WHICH payment it is about. What state that payment is in is
 * then fetched from the provider — a notification's body is not signed and is
 * never trusted for state.
 */
export type WebhookVerdict =
  | { kind: "verified"; providerRef: string }
  /** Authentic, but about something NEOGEN does not handle. Acknowledge it. */
  | { kind: "ignored"; reason: string }
  /** Missing or wrong signature. */
  | { kind: "unauthenticated" }
  /** Signed, but not in a shape we can use. */
  | { kind: "malformed" };

export type PrepareResult =
  { ok: true; action: PaymentAction } | { ok: false; error: PaymentError };

/**
 * THE PROVIDER CONTRACT.
 *
 * Implemented once per processor under `./adapters`. THE ONLY PLACE A
 * PROVIDER'S VOCABULARY IS ALLOWED TO EXIST: by the time anything below returns,
 * a processor's status names have been translated into `PaymentState` and
 * `DeclineReason`, so no processor string can reach the order machine.
 */
export interface PaymentProvider {
  /** Stable id, stored on the order alongside `providerRef`. */
  readonly id: string;
  /** Whether this adapter has every credential it needs. */
  isConfigured(): boolean;
  /** "test" when running on the provider's test credentials. Null when unconfigured. */
  mode(): "test" | "live" | null;
  /** What the payment step renders for this order. No network call, no charge. */
  prepare(order: Order): PrepareResult;
  /**
   * Charge the order's own total with a tokenized instrument.
   *
   * The amount is read from `order.totals`, never from the instrument or the
   * browser. `idempotencyKey` is the attempt's stable key; the provider must
   * receive it so that a retried request cannot create a second charge.
   */
  charge(
    order: Order,
    instrument: TokenizedInstrument,
    idempotencyKey: string,
  ): Promise<ChargeResult>;
  /** Ask the provider, with our credentials, what state a payment is in. */
  fetchStatus(providerRef: string): Promise<StatusResult>;
  /** Authenticate a webhook delivery. Never trusts its body for state. */
  verifyWebhook(input: { url: URL; headers: Headers; body: string }): Promise<WebhookVerdict>;
  refund(
    providerRef: string,
    idempotencyKey: string,
  ): Promise<{ ok: boolean; error?: PaymentError }>;
}
