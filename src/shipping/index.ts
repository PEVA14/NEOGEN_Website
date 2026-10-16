import { noneShippingProvider } from "./adapters/none";
import { skydropxProvider } from "./adapters/skydropx";

import type { ShippingProvider } from "./types";

export type {
  Parcel,
  QuoteDestination,
  QuoteResult,
  RateOption,
  ShipmentSnapshot,
  ShippingError,
  ShippingProvider,
  ShippingResult,
  ShippingWebhookVerdict,
  TrackingEvent,
} from "./types";

/**
 * THE SHIPPING REGISTRY — ordered, first configured wins, `none` last.
 *
 * Skydropx (B2, 2026-10-15) when its environment is complete; otherwise
 * `none`, and shipments are recorded by hand (`provider: "manual"`).
 */
const PROVIDERS: readonly ShippingProvider[] = [skydropxProvider, noneShippingProvider];

/** The adapter that owns shipments recorded under this id, if any. */
export function shippingProviderById(id: string): ShippingProvider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export function activeShippingProvider(): ShippingProvider {
  return PROVIDERS.find((p) => p.isConfigured()) ?? noneShippingProvider;
}

/** The id recorded on shipments an operator entered by hand. */
export const MANUAL_SHIPPING = "manual";
