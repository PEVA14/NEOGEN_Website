import { mercadoPagoProvider } from "./adapters/mercadopago";
import { missingMercadoPagoEnv } from "./adapters/mercadopago/config";
import { noneProvider } from "./adapters/none";

import type { PaymentProvider } from "./types";

export type {
  ChargeResult,
  DeclineReason,
  PaymentAction,
  PaymentError,
  PaymentErrorCode,
  PaymentProvider,
  PaymentSnapshot,
  PrepareResult,
  StatusResult,
  TokenizedInstrument,
  WebhookVerdict,
} from "./types";
export { DECLINE_REASONS } from "./types";

/**
 * THE PROVIDER REGISTRY.
 *
 * Ordered — the first CONFIGURED adapter wins — and `none` is the terminal
 * fallback. Mercado Pago is registered, and configures itself only from its
 * environment variables (`adapters/mercadopago/config.ts`). A second
 * processor would be one more line above `none`; nothing else in the
 * application refers to a provider by name.
 */
const PROVIDERS: readonly PaymentProvider[] = [mercadoPagoProvider, noneProvider];

/**
 * COMMERCE MASTER SWITCH — a business decision, not a technical one.
 *
 * Whether NEOGEN sells at all is the owner's call (regulatory review, final
 * prices), so it stays a switch even now that a processor exists. Read from
 * the environment and DEFAULTED to off, so a missing variable never enables
 * commerce.
 */
export const commerceEnabled: boolean = process.env.NEXT_PUBLIC_COMMERCE_ENABLED === "true";

export function activeProvider(): PaymentProvider {
  return PROVIDERS.find((p) => p.isConfigured()) ?? noneProvider;
}

/** The provider an order's payment belongs to — by the id stored on it. */
export function providerById(id: string | null): PaymentProvider | null {
  return PROVIDERS.find((p) => p.id === id && p.isConfigured()) ?? null;
}

/**
 * IS THERE DURABLE STORAGE?
 *
 * The in-memory order store is lost on restart and not shared between
 * serverless instances — a webhook landing on a different instance than the
 * charge would not find the order. Tolerable for local test-mode work; never
 * for live money.
 */
export function durableStoreConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * WHY PAYMENT IS OR IS NOT AVAILABLE — every blocker, by name.
 *
 * `live_without_database` is the safeguard that matters: LIVE credentials on
 * a deployment without a database would take real money into orders that can
 * vanish, so live mode refuses to run on memory storage.
 */
export type PaymentBlocker =
  "commerce_disabled" | "provider_unconfigured" | "live_without_database";

export function paymentBlockers(): PaymentBlocker[] {
  const blockers: PaymentBlocker[] = [];
  if (!commerceEnabled) blockers.push("commerce_disabled");
  const provider = activeProvider();
  if (!provider.isConfigured()) blockers.push("provider_unconfigured");
  if (provider.mode() === "live" && !durableStoreConfigured())
    blockers.push("live_without_database");
  return blockers;
}

/** Names of missing environment variables, for diagnostics. Never values. */
export function missingPaymentEnv(): string[] {
  return missingMercadoPagoEnv();
}

/**
 * TWO GATES, NOT ONE — because they answer different questions.
 *
 * `bagEnabled` — may a customer put things in a bag and walk the checkout?
 * That needs prices and the business decision, and nothing else.
 *
 * `paymentAvailable` — may an order be placed and paid? That additionally
 * needs a configured provider (and, for live money, durable storage). An order
 * is only created when it can be paid, so a deployment without a processor can
 * no longer register unpaid orders — that path existed only while no
 * processor was integrated.
 */
export function bagEnabled(): boolean {
  return commerceEnabled;
}

export function paymentAvailable(): boolean {
  return paymentBlockers().length === 0;
}
