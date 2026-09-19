import type { PaymentError, PaymentProvider } from "../types";

const unavailable: PaymentError = {
  code: "unavailable",
  message: "No payment provider is configured for this deployment.",
};

/**
 * THE FALLBACK ADAPTER: it declines, always.
 *
 * Registered last, so it is what a deployment gets when no real provider is
 * configured — a local checkout with no credentials, a preview without
 * secrets. The absence of a processor is itself an implementation, so no call
 * site has to handle "no provider", and nothing can be charged by accident.
 */
export const noneProvider: PaymentProvider = {
  id: "none",

  /* Never configured. There is nothing to configure. */
  isConfigured: () => false,
  mode: () => null,

  prepare: () => ({ ok: false, error: unavailable }),

  async charge() {
    return { kind: "refused", error: unavailable, detail: null };
  },

  async fetchStatus() {
    return { ok: false, reason: "provider_error" };
  },

  /* Nothing can call back, because nothing was ever started. */
  async verifyWebhook() {
    return { kind: "unauthenticated" };
  },

  async refund() {
    return { ok: false, error: unavailable };
  },
};
