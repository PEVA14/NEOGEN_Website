import "server-only";

import { headers } from "next/headers";

import { destinationKey, quoteUsable } from "@/domain/checkout/shipping";
import { normaliseAddress, touch, validateAddress } from "@/domain/checkout";
import { signal } from "@/server/observe";
import { clientAddress, consume, RULES } from "@/server/security/rateLimit";
import { activeShippingProvider } from "@/shipping";
import { destinationFor } from "@/shipping/adapters/skydropx";

import type { CheckoutDraft, StoredQuote } from "@/domain/checkout";

/**
 * SHIPPING QUOTES FOR A CHECKOUT — the server's side of D1.
 *
 * The quote is fetched here, on the server, for the draft's own address, and
 * kept ON THE DRAFT (server-side storage, never a cookie or a form field).
 * A customer then chooses a rate by its id and `selectQuoted` checks that id
 * against this copy; no carrier, cost or price ever comes from the browser.
 *
 * Asked again only when the address changed, the quote is older than
 * `QUOTE_FRESH_MS`, or the customer presses "quote again". A failed quote is
 * remembered for a moment so a reload does not hammer the provider, and every
 * request counts against `RULES.shippingQuote` per address.
 *
 * Returns null when no shipping provider is configured: checkout then keeps
 * its free-threshold-only behaviour, unchanged.
 */
const FAILED_RETRY_MS = 60 * 1000;

export function shippingQuotesEnabled(): boolean {
  return activeShippingProvider().isConfigured();
}

export async function quoteForDraft(
  draft: CheckoutDraft,
  save: (draft: CheckoutDraft) => Promise<void>,
  options: { force?: boolean; now?: number } = {},
): Promise<{ draft: CheckoutDraft; stored: StoredQuote | null }> {
  const provider = activeShippingProvider();
  const parcel = provider.parcel();
  if (!provider.isConfigured() || !parcel) return { draft, stored: null };
  if (validateAddress(draft.address).length > 0) return { draft, stored: null };
  const address = normaliseAddress(draft.address);
  const now = options.now ?? Date.now();
  const key = destinationKey(address);
  const previous = draft.shippingQuote ?? null;

  if (!options.force) {
    if (quoteUsable(previous, address, now)) return { draft, stored: previous };
    if (
      previous?.error &&
      previous.destinationKey === key &&
      now - Date.parse(previous.quotedAt) < FAILED_RETRY_MS
    ) {
      return { draft, stored: previous };
    }
  }

  const at = new Date(now).toISOString();
  let stored: StoredQuote;
  if (!(await consume(RULES.shippingQuote, [clientAddress(await headers())]))) {
    stored = { destinationKey: key, quotedAt: at, quote: null, error: "rate_limited" };
  } else {
    const result = await provider.quote(destinationFor({ shipping: address }), parcel);
    if (result.ok) {
      stored = {
        destinationKey: key,
        quotedAt: result.value.quotedAt,
        quote: {
          provider: provider.id,
          quotationId: result.value.quotationId,
          expiresAt: result.value.expiresAt,
          options: result.value.options.map((o) => ({
            rateId: o.rateId,
            carrier: o.carrier,
            carrierCode: o.carrierCode,
            service: o.service,
            serviceCode: o.serviceCode,
            cost: o.cost,
            estimateDays: o.estimateDays,
          })),
        },
        error: null,
      };
    } else {
      const code = result.error.code;
      /* No address or customer detail in the signal — only what failed. */
      signal("shipping.provider_error", "warn", { code, view: "quote" });
      stored = {
        destinationKey: key,
        quotedAt: at,
        quote: null,
        error:
          code === "invalid_address" || code === "no_coverage" || code === "timeout"
            ? code
            : "provider_error",
      };
    }
  }

  /* A selection quoted for another address no longer applies. */
  const delivery =
    draft.delivery?.quote && draft.delivery.quote.destinationKey !== key ? null : draft.delivery;
  const next = touch(draft, { shippingQuote: stored, delivery });
  await save(next);
  return { draft: next, stored };
}
