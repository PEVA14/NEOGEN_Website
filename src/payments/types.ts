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
   * project authors, which is why the payment step renders an empty MOUNT
   * POINT (`components/checkout/PaymentSlot`) rather than inputs.
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
   * Translate a provider callback into a NEOGEN payment event.
   *
   * THE ONLY PLACE A PROVIDER'S VOCABULARY IS ALLOWED TO EXIST. By the time
   * the return value reaches the order state machine it carries nothing
   * provider-shaped except two opaque strings, so no processor status name can
   * reach the domain and a payload cannot name a state it was not translated
   * into.
   *
   * `eventId` IS THE PROVIDER'S OWN ID FOR THIS DELIVERY, and it is required
   * rather than optional because it is the deduplication key. Providers
   * redeliver aggressively; an adapter that cannot identify a delivery cannot
   * be made idempotent, and discovering that after a processor is live means
   * discovering it on real money. An adapter whose provider genuinely sends no
   * event id must synthesise a stable one from the payload — never a random
   * value, which would make every retry look new.
   *
   * Returns null for anything unrecognised, or anything that fails the
   * adapter's SIGNATURE CHECK. A provider sends event types nobody subscribed
   * to, and an unknown event must be acknowledged and ignored rather than
   * treated as a failure — see the webhook route for why that is not laxity.
   */
  parseWebhook(
    payload: unknown,
    headers: Headers,
  ): Promise<{ eventId: string; providerRef: string; state: PaymentState } | null>;
  refund(providerRef: string, amount: Money): Promise<{ ok: boolean; error?: PaymentError }>;
}
