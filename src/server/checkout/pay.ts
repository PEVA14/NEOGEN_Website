"use server";

import { routes } from "@/config/routes";
import { isLocale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import { isOrderId, readInstrument } from "@/payments/instrument";
import { submitPayment } from "@/server/payments";

import { ownsOrder } from "./session";

import type { DeclineReason } from "@/payments";

/**
 * PAY ONE ORDER — the only server entry point the card form talks to.
 *
 * A server action is a public HTTP endpoint whose argument types are erased
 * in transit, so everything below treats its input as hostile:
 *
 *   OWNERSHIP. The order must be one this browser created (the httpOnly
 *   order cookie). An order id alone is never enough.
 *
 *   SHAPE. Only a provider token and the provider's own identifiers for the
 *   card brand and type are accepted, each against a strict pattern. There is
 *   no field for an amount, a total, a price or a state — the amount charged
 *   is the order's, read on the server, and the resulting state is the
 *   provider's answer.
 *
 *   INSTALMENTS ARE 1. Whether to offer meses sin intereses is a business
 *   decision (fees, eligibility) nobody has made, so the card form is
 *   configured for a single payment and anything else is refused here too.
 *
 * NOTHING SENSITIVE IS LOGGED OR KEPT. The token is single-use, is passed to
 * the provider once, and is not written to the order, a log or an error.
 */
export type PayResult =
  | { kind: "done"; href: string }
  | { kind: "declined"; reason: DeclineReason }
  | {
      kind: "error";
      code: "unavailable" | "not_found" | "invalid_state" | "provider_error" | "invalid_request";
      href?: string;
    };

export async function payOrder(input: {
  orderId: unknown;
  locale: unknown;
  instrument: unknown;
}): Promise<PayResult> {
  const locale = typeof input?.locale === "string" && isLocale(input.locale) ? input.locale : "es";
  const orderId = typeof input?.orderId === "string" ? input.orderId : "";
  if (!isOrderId(orderId)) return { kind: "error", code: "not_found" };

  /* Ownership BEFORE anything else is read or looked up. */
  if (!(await ownsOrder(orderId))) return { kind: "error", code: "not_found" };

  const instrument = readInstrument(input?.instrument);
  if (!instrument) return { kind: "error", code: "invalid_request" };

  const confirmation = localizePath(routes.orderConfirmation(orderId), locale);
  const outcome = await submitPayment(orderId, instrument);

  switch (outcome.kind) {
    case "paid":
    case "processing":
    case "pending":
      return { kind: "done", href: confirmation };
    case "declined":
      return { kind: "declined", reason: outcome.reason };
    case "error":
      return outcome.code === "invalid_state"
        ? { kind: "error", code: "invalid_state", href: confirmation }
        : { kind: "error", code: outcome.code };
  }
}
