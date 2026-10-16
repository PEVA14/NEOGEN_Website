import "server-only";

import { createHash } from "node:crypto";

import { signal } from "@/server/observe";
import { rateLimitStore } from "@/server/persistence";

/**
 * RATE LIMITS — one brake for every endpoint a stranger can call in a loop.
 *
 * Each RULE is a name, a limit and a window. A SUBJECT is what is being
 * counted — an address, an operator name, an order id — and is hashed before
 * it reaches the store, so no address or name is kept.
 *
 * FAIL OPEN, LOUDLY. If the store cannot be reached (a database outage, or a
 * deploy that ran before migration 003), a request is allowed and
 * `security.rate_limit_unavailable` is logged. These limits blunt guessing and
 * card testing; none of them is the only gate — a password, the order cookie,
 * the provider's own fraud screening still stand — so losing one for a few
 * minutes must not take checkout down with it.
 */
export interface RateRule {
  readonly name: string;
  readonly limit: number;
  readonly windowMs: number;
}

const MINUTE = 60 * 1000;

export const RULES = {
  /** Operator sign-in: failures per name and per address. Five, then 15 minutes. */
  opsLogin: { name: "ops-login", limit: 5, windowMs: 15 * MINUTE },
  /** Card attempts on one order — each a fresh token; this is the card-testing brake. */
  payOrder: { name: "pay-order", limit: 6, windowMs: 15 * MINUTE },
  /** Card attempts from one address, across orders. */
  payAddress: { name: "pay-address", limit: 15, windowMs: 15 * MINUTE },
  /** Orders registered from one address. */
  placeOrder: { name: "place-order", limit: 10, windowMs: 60 * MINUTE },
  /** Order lookups ("Rastrear mi pedido") from one address. */
  trackAddress: { name: "track-address", limit: 10, windowMs: 15 * MINUTE },
  /** Lookups of one order number — the brake on guessing its email. */
  trackOrder: { name: "track-order", limit: 5, windowMs: 15 * MINUTE },
  /** Shipping quotes requested from one address — each one is a provider call. */
  shippingQuote: { name: "shipping-quote", limit: 20, windowMs: 15 * MINUTE },
  /** Atlas generations — each one costs a model call. */
  atlas: { name: "atlas", limit: 8, windowMs: 10 * MINUTE },
  /** CSP violation reports a browser may send. */
  cspReport: { name: "csp-report", limit: 30, windowMs: 10 * MINUTE },
} as const satisfies Record<string, RateRule>;

function windowStart(rule: RateRule, now: number): number {
  return Math.floor(now / rule.windowMs) * rule.windowMs;
}

/** `rule:digest` — the subject never leaves this function in clear. */
export function rateKey(rule: RateRule, subject: string): string {
  const digest = createHash("sha256").update(`${rule.name}\u0000${subject}`).digest("base64url");
  return `${rule.name}:${digest.slice(0, 32)}`;
}

/**
 * Count one request against every subject; true when all are still within
 * the limit. Every subject is counted even when an earlier one is over, so a
 * client cannot reset one counter by tripping another.
 */
export async function consume(
  rule: RateRule,
  subjects: readonly string[],
  now = Date.now(),
): Promise<boolean> {
  try {
    const store = rateLimitStore();
    const start = windowStart(rule, now);
    const counts = await Promise.all(subjects.map((s) => store.hit(rateKey(rule, s), start)));
    const allowed = counts.every((n) => n <= rule.limit);
    if (!allowed) signal("security.rate_limited", "warn", { rule: rule.name });
    return allowed;
  } catch {
    signal("security.rate_limit_unavailable", "error", { rule: rule.name });
    return true;
  }
}

/** True when any subject has already reached the limit. Counts nothing. */
export async function exceeded(
  rule: RateRule,
  subjects: readonly string[],
  now = Date.now(),
): Promise<boolean> {
  try {
    const store = rateLimitStore();
    const start = windowStart(rule, now);
    const counts = await Promise.all(subjects.map((s) => store.peek(rateKey(rule, s), start)));
    return counts.some((n) => n >= rule.limit);
  } catch {
    signal("security.rate_limit_unavailable", "error", { rule: rule.name });
    return false;
  }
}

/** Forget these subjects' counts under `rule`. */
export async function forget(rule: RateRule, subjects: readonly string[]): Promise<void> {
  try {
    await rateLimitStore().clear(subjects.map((s) => rateKey(rule, s)));
  } catch {
    signal("security.rate_limit_unavailable", "error", { rule: rule.name });
  }
}

/**
 * The client's address, as the host reports it.
 *
 * On Vercel, `x-vercel-forwarded-for` and `x-forwarded-for` are set by the
 * platform, which overwrites any value a client sends, so they cannot be
 * spoofed from outside. Elsewhere (local development) the address is
 * "unknown", and everything shares one bucket.
 */
export function clientAddress(headers: Headers): string {
  const forwarded =
    headers.get("x-vercel-forwarded-for") ??
    headers.get("x-forwarded-for") ??
    headers.get("x-real-ip") ??
    "";
  return forwarded.split(",")[0].trim() || "unknown";
}
