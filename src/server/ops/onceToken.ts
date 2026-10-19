import "server-only";

import { randomBytes } from "node:crypto";

import { rateKey } from "@/server/security/rateLimit";
import { rateLimitStore } from "@/server/persistence";

/**
 * ONE SUBMISSION PER FORM — for console forms whose submit reaches a provider.
 *
 * The page embeds a fresh random token; the submit spends it. A double
 * click, a browser resend or a back-and-resubmit carries the same token and
 * is refused. Unlike the rate limits, this FAILS CLOSED: if the store cannot
 * be reached, nothing is sent. Spent tokens are remembered for an hour.
 */
const RULE = { name: "ops-once", limit: 1, windowMs: 60 * 60 * 1000 } as const;

export function issueOnceToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function spendOnceToken(token: string, now = Date.now()): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return false;
  try {
    const start = Math.floor(now / RULE.windowMs) * RULE.windowMs;
    return (await rateLimitStore().hit(rateKey(RULE, token), start)) === 1;
  } catch {
    return false;
  }
}
