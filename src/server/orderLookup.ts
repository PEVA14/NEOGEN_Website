"use server";

import { createHash, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { isOrderId, normaliseOrderNumber } from "@/payments/instrument";
import { rememberTrackedOrder } from "@/server/checkout/session";
import { orderRepository } from "@/server/persistence";
import { clientAddress, consume, RULES } from "@/server/security/rateLimit";

/**
 * "RASTREAR MI PEDIDO" — an order number and the email it was placed with.
 *
 * There are no customer accounts. An order number alone is not a secret (it
 * is read over the phone and printed on the packing slip), so it must be
 * paired with the email, and even then the reward is small: a match opens
 * that order's STATUS page in this browser — steps, carrier, tracking — and
 * not the confirmation with its street address and phone. The full order
 * stays behind the signed link in the order's own emails.
 *
 * WHAT A GUESSER LEARNS: nothing. A missing order and a wrong email get the
 * same answer, and both are throttled — per address, and per order number,
 * so a known number cannot be paired with email after email
 * (`RULES.trackAddress`, `RULES.trackOrder`). The comparison is of hashes,
 * in constant time.
 *
 * Values are returned to the form so a typo can be fixed without retyping;
 * nothing is put in a URL.
 */
export interface LookupState {
  status: "idle" | "invalid" | "no_match" | "rate_limited";
  order: string;
  email: string;
}

function normaliseEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function sameEmail(a: string, b: string): boolean {
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export async function lookupOrder(_previous: LookupState, form: FormData): Promise<LookupState> {
  const raw = form.get("locale");
  const locale = typeof raw === "string" && isLocale(raw) ? raw : "es";
  const order = normaliseOrderNumber(form.get("order"));
  const email = normaliseEmail(form.get("email"));
  const typed = form.get("order");
  const echo = { order: typeof typed === "string" ? typed.slice(0, 40) : "", email };

  if (!isOrderId(order) || !email.includes("@")) return { status: "invalid", ...echo };

  const [byAddress, byOrder] = await Promise.all([
    consume(RULES.trackAddress, [clientAddress(await headers())]),
    consume(RULES.trackOrder, [order]),
  ]);
  if (!byAddress || !byOrder) return { status: "rate_limited", ...echo };

  /* A missing order is compared against an empty string, so both paths do
     the same work and give the same answer. */
  const found = await orderRepository().get(order);
  if (!sameEmail(found?.contact.email.trim().toLowerCase() ?? "", email) || !found) {
    return { status: "no_match", ...echo };
  }

  await rememberTrackedOrder(order);
  redirect(localizePath(routes.orderStatus(order), locale));
}
