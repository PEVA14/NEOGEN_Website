import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

import type { Order } from "@/domain/order/types";

/**
 * GUEST ACCESS TO ONE ORDER — a link that cannot be guessed, forged or moved.
 *
 * NEOGEN has no customer accounts, and order references are short and partly
 * time-derived (they are read over the phone), so a reference alone must
 * never open an order. The link in an order's emails carries
 *
 *   HMAC-SHA256(ORDER_ACCESS_SECRET, "order-access:v1:<order id>:<nonce>")
 *
 * where the nonce is 128 random bits stored on the order at creation. So:
 *
 *   it cannot be GUESSED   256 bits, not derived from anything public
 *   it cannot be FORGED    needs the server secret
 *   it cannot be MOVED     it names one order; another order's id fails
 *   it can be REVOKED      rotate the order's nonce (one order) or the
 *                          secret (every link)
 *
 * The token is never stored — it is re-derived for each email — and the
 * access route exchanges it for the same httpOnly ownership cookie checkout
 * sets, then redirects to a URL without it, so it does not stay in history,
 * logs or a Referer header.
 *
 * Without ORDER_ACCESS_SECRET (≥ 32 characters) no link is issued: emails say
 * "keep the reference" instead, and the status page opens only for the
 * browser that placed the order.
 */
function secret(): string | null {
  const value = process.env.ORDER_ACCESS_SECRET ?? "";
  return value.length >= 32 ? value : null;
}

export function orderAccessConfigured(): boolean {
  return secret() !== null;
}

export function accessToken(order: Pick<Order, "id" | "access">, key = secret()): string | null {
  if (!key || !order.access?.nonce) return null;
  return createHmac("sha256", key)
    .update(`order-access:v1:${order.id}:${order.access.nonce}`)
    .digest("base64url");
}

export function verifyAccessToken(
  order: Pick<Order, "id" | "access">,
  token: string | null | undefined,
  key = secret(),
): boolean {
  const expected = accessToken(order, key);
  if (!expected || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** The absolute link an email carries, or null when access links are not configured. */
export function statusUrl(order: Order): string | null {
  const token = accessToken(order);
  if (!token) return null;
  return `${siteConfig.url}/${order.locale}${routes.orderAccess(order.id)}?t=${token}`;
}

/* ---------------------------------------------------- browser-held proofs */

/*
 * WHICH ORDERS A BROWSER MAY OPEN is kept in httpOnly cookies
 * (`server/checkout/session.ts`). A cookie is still something the person at
 * the browser can write, so each order id in it travels with a proof:
 *
 *   HMAC-SHA256(key, "order-<purpose>:v1:<order id>")
 *
 * `owner` — this browser placed the order, or arrived by its email link:
 *           opens the confirmation (name, phone, address) and the payment step.
 * `track` — this browser looked the order up by number and email: opens the
 *           status page only.
 *
 * The key is ORDER_ACCESS_SECRET, under its own message prefix. Without it, a
 * development server uses a key that lives as long as the process; a
 * deployment gets no key at all, and `paymentBlockers()` refuses to take
 * payments, because a per-instance key would lose customers their orders.
 */
export type ProofPurpose = "owner" | "track";

const DEV_KEY = "__neogen_order_proof_key__";

function proofKey(): string | null {
  const key = secret();
  if (key) return key;
  if (process.env.NODE_ENV === "production") return null;
  const g = globalThis as typeof globalThis & { [DEV_KEY]?: string };
  g[DEV_KEY] ??= randomBytes(32).toString("base64url");
  return g[DEV_KEY];
}

export function orderProof(
  purpose: ProofPurpose,
  orderId: string,
  key = proofKey(),
): string | null {
  if (!key) return null;
  return createHmac("sha256", key)
    .update(`order-${purpose}:v1:${orderId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyOrderProof(
  purpose: ProofPurpose,
  orderId: string,
  proof: string | null | undefined,
  key = proofKey(),
): boolean {
  const expected = orderProof(purpose, orderId, key);
  if (!expected || !proof || proof.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(proof));
}
