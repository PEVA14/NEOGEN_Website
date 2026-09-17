import type { AdvisorProvider } from "../types";

/**
 * NO PROVIDER — the terminal fallback, and the state of any deployment without
 * a key. It never configures and never pretends: `generate` reports
 * `unavailable`, and the caller decides what an honest degraded result is.
 */
export const noneAdvisor: AdvisorProvider = {
  id: "none",
  isConfigured: () => false,
  async generate() {
    return {
      ok: false,
      error: { code: "unavailable", message: "No advisor provider is configured." },
    };
  },
};
