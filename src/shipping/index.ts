import { noneShippingProvider } from "./adapters/none";

import type { ShippingProvider } from "./types";

export type {
  CreatedShipment,
  Parcel,
  Quote,
  ShippingError,
  ShippingProvider,
  ShippingResult,
  TrackingSnapshot,
} from "./types";

/**
 * THE SHIPPING REGISTRY — ordered, first configured wins, `none` last.
 *
 * A carrier adapter would be one line above `none`, configured from its own
 * environment variables, exactly like the payment registry. Until one is
 * approved, shipments are recorded by hand (`provider: "manual"`).
 */
const PROVIDERS: readonly ShippingProvider[] = [noneShippingProvider];

export function activeShippingProvider(): ShippingProvider {
  return PROVIDERS.find((p) => p.isConfigured()) ?? noneShippingProvider;
}

/** The id recorded on shipments an operator entered by hand. */
export const MANUAL_SHIPPING = "manual";
