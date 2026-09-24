import type { ShippingProvider } from "../types";

/**
 * THE DEFAULT: no carrier integration, and it says so on every call.
 *
 * Not a fake. It never returns a rate, a label or a tracking status — a
 * plausible one would be exactly the invented logistics data this project
 * forbids. Tests use their own scripted provider; production has this.
 */
const unconfigured = async () => ({ ok: false as const, error: { code: "unconfigured" as const } });

export const noneShippingProvider: ShippingProvider = {
  id: "none",
  isConfigured: () => false,
  quote: unconfigured,
  createShipment: unconfigured,
  getLabel: unconfigured,
  getTracking: unconfigured,
  cancelShipment: unconfigured,
};
