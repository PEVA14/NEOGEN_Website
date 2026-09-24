import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

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
