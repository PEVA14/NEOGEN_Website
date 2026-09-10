import { noneProvider } from "./adapters/none";

import type { PaymentProvider } from "./types";

export type {
  IntentResult,
  PaymentAction,
  PaymentError,
  PaymentErrorCode,
  PaymentProvider,
} from "./types";

/**
 * THE PROVIDER REGISTRY.
 *
 * One line changes when a processor is approved: import its adapter and add it
 * here. Nothing else in the application refers to a provider by name.
 *
 * The list is ordered — the first CONFIGURED adapter wins — so a real provider
 * can be added ahead of `none` and `none` remains the terminal fallback.
 */
const PROVIDERS: readonly PaymentProvider[] = [
  /* Real adapters go above this line, e.g. mercadoPagoProvider, clipProvider. */
  noneProvider,
];

/**
 * COMMERCE MASTER SWITCH.
 *
 * Purchasing needs BOTH a configured provider and this flag. Two independent
 * gates, because they fail for different reasons: the flag is a business
 * decision (regulatory review, final prices), the adapter is a technical fact.
 * Either one off means Add to Bag and checkout stay inert.
 *
 * Deliberately read from the environment rather than hardcoded `false`, so a
 * staging deployment can exercise the full flow without a code change — and
 * deliberately DEFAULTED to off, so a missing variable never enables commerce.
 */
export const commerceEnabled: boolean = process.env.NEXT_PUBLIC_COMMERCE_ENABLED === "true";

export function activeProvider(): PaymentProvider {
  return PROVIDERS.find((p) => p.isConfigured()) ?? noneProvider;
}

/**
 * TWO GATES, NOT ONE — because they answer different questions.
 *
 * `bagEnabled` — may a customer put things in a bag? That needs prices and a
 * business decision, and nothing else. It does NOT need a payment processor,
 * which is why the entire bag experience can be built, styled and reviewed
 * while payment is impossible.
 *
 * `paymentAvailable` — may a customer pay? That additionally needs a
 * CONFIGURED adapter. Today it is false and cannot be turned on by a flag or
 * an environment variable: `none` is the only registered provider and it
 * never configures. Enabling payment requires registering a real adapter in
 * the list above, which is a code change that gets reviewed.
 */
export function bagEnabled(): boolean {
  return commerceEnabled;
}

export function paymentAvailable(): boolean {
  return commerceEnabled && activeProvider().isConfigured();
}
