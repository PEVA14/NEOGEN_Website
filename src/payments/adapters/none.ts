import type { IntentResult, PaymentProvider } from "../types";

/**
 * THE DEFAULT ADAPTER: it declines, always.
 *
 * NEOGEN has no approved payment processor. Rather than leave the registry
 * empty and have every call site handle "no provider", the absence is itself an
 * implementation — so the full checkout can be built, styled and walked end to
 * end while payment cannot possibly succeed.
 *
 * This is also the safety property that matters most in this phase: enabling
 * production payment requires REGISTERING a real adapter. It cannot happen
 * through a config typo, an environment variable, or a flag someone flips by
 * accident.
 */
export const noneProvider: PaymentProvider = {
  id: "none",

  /* Never configured. There is nothing to configure. */
  isConfigured: () => false,

  async createIntent(): Promise<IntentResult> {
    return {
      ok: false,
      error: {
        code: "unavailable",
        message: "No payment provider is configured for this deployment.",
      },
    };
  },

  /* Nothing can call back, because nothing was ever started. */
  async parseWebhook() {
    return null;
  },

  async refund() {
    return {
      ok: false,
      error: {
        code: "unavailable" as const,
        message: "No payment provider is configured for this deployment.",
      },
    };
  },
};
