import type { ShippingProvider } from "../types";

/**
 * THE DEFAULT: no carrier integration, and it says so on every call.
 *
 * Not a fake. It never returns a rate, a label or a tracking status — a
 * plausible one would be exactly the invented logistics data this project
 * forbids. Tests use their own scripted provider; a deployment without
 * Skydropx configuration has this, and checkout falls back to the
 * free-threshold-only rule (`domain/checkout/delivery`).
 */
const unconfigured = async () => ({ ok: false as const, error: { code: "unconfigured" as const } });

export const noneShippingProvider: ShippingProvider = {
  id: "none",
  isConfigured: () => false,
  mode: () => null,
  parcel: () => null,
  quote: unconfigured,
  createShipment: unconfigured,
  getShipment: unconfigured,
  getLabel: unconfigured,
  cancelShipment: unconfigured,
  async verifyWebhook() {
    return { kind: "unauthenticated" };
  },
};
