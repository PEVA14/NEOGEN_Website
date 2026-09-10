import type { Money } from "@/data/commerce";
import type { Order, PaymentState } from "@/domain/order";

/**
 * HOW A CUSTOMER COMPLETES PAYMENT — the only provider-shaped thing the UI sees.
 *
 * Three shapes cover every route NEOGEN might plausibly take, and the checkout
 * renders one branch per shape rather than one branch per processor. Adding a
 * provider therefore adds no UI.
 */
export type PaymentAction =
  /**
   * The provider's own hosted fields, mounted INSIDE the NEOGEN page.
   *
   * `publicToken` is a publishable client key — never a secret. Raw card data
   * is entered into the provider's iframe and never touches markup this
   * project authors, which is why `CheckoutFlow` step 03 renders an empty slot
   * rather than inputs.
   */
  | { kind: "embedded"; publicToken: string }
  /** A provider-hosted page. We leave and come back. */
  | { kind: "redirect"; url: string }
  /**
   * Transfer instructions — the SPEI route. The order sits in
   * `pending_payment` until the provider confirms receipt.
   */
  | { kind: "instructions"; reference: string; expiresAt: string; amount: Money };

/** Why an intent could not be created. Stable codes; never provider strings. */
export type PaymentErrorCode =
  /** No adapter registered, or commerce is switched off. */
  | "unavailable"
  /** The order is not in a state that can be paid. */
  | "invalid_state"
  /** The provider declined to open a payment. */
  | "declined"
  /** Network or provider outage — retryable. */
  | "provider_error";

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
}

export type IntentResult =
  { ok: true; providerRef: string; action: PaymentAction } | { ok: false; error: PaymentError };

/**
 * THE PROVIDER CONTRACT.
 *
 * Implemented once per processor under `./adapters`. Three obligations, and
 * translating the provider's vocabulary into ours is the most important:
 * `parseWebhook` is the ONLY place a provider's status names are allowed to
 * exist.
 */
export interface PaymentProvider {
  /** Stable id, stored on the order alongside `providerRef`. */
  readonly id: string;
  /** Whether this adapter is configured well enough to be used. */
  isConfigured(): boolean;
  createIntent(order: Order): Promise<IntentResult>;
  /**
   * Translate a provider callback into one of our states.
   *
   * Returns null for anything unrecognised — a provider sends event types we
   * never subscribed to, and an unknown event must be acknowledged and
   * ignored, not treated as a failure.
   */
  parseWebhook(
    payload: unknown,
    headers: Headers,
  ): Promise<{ providerRef: string; state: PaymentState } | null>;
  refund(providerRef: string, amount: Money): Promise<{ ok: boolean; error?: PaymentError }>;
}
