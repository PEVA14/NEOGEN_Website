import { siteConfig } from "@/config/site";

import { routeForAddress } from "./delivery";

import type { Money } from "@/data/commerce";
import type {
  DeliveryMethod,
  DeliverySelection,
  FrozenQuote,
  MxAddress,
  StoredQuote,
} from "./types";

/**
 * QUOTED SHIPPING — the rules that turn a provider's rates into what a
 * customer is offered and charged (D1, Skydropx). Pure: no provider, no
 * clock unless passed. The server is the only caller that has rates.
 *
 * THE BOUNDARY. A customer chooses a rate by its id; everything else —
 * carrier, cost, price, expiry — is looked up in the quote stored on the
 * server-side draft. A posted id that is not in that quote selects nothing.
 */

const mxn = (amount: number): Money => ({ amount, currency: "MXN" });

/** How long a stored quote is offered before checkout asks again. */
export const QUOTE_FRESH_MS = 60 * 60 * 1000;

const norm = (value: string) =>
  value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** The facts a rate depends on. A changed address is a different quote. */
export function destinationKey(
  address: Pick<MxAddress, "postalCode" | "state" | "city" | "colonia">,
): string {
  return [address.postalCode, address.state, norm(address.city), norm(address.colonia)].join("|");
}

/**
 * WHAT THE CUSTOMER PAYS — server-authoritative (owner, 2026-10-18).
 *
 * At or above the free-shipping threshold (MX$10,000 merchandise subtotal,
 * `siteConfig`) NEOGEN subsidises shipping up to the CHEAPEST eligible rate
 * in the quote: that option is free, and a faster one costs the customer
 * only the difference. Below the threshold there is no subsidy and the
 * customer pays the selected rate. The real cost is always kept.
 *
 *   Standard 160, Express 430, subtotal ≥ 10,000:
 *     Standard → subsidy 160, customer 0
 *     Express  → subsidy 160, customer 270
 */
export function shippingSplit(
  subtotal: Money,
  cost: Money,
  cheapest: Money,
): { subsidy: Money; charge: Money } {
  const eligible = subtotal.amount >= siteConfig.fulfilment.freeShippingThreshold;
  const subsidy = eligible ? Math.min(cheapest.amount, cost.amount) : 0;
  return { subsidy: mxn(subsidy), charge: mxn(cost.amount - subsidy) };
}

/** The customer's charge alone. */
export function customerShipping(subtotal: Money, cost: Money, cheapest: Money = cost): Money {
  return shippingSplit(subtotal, cost, cheapest).charge;
}

/** The cheapest eligible rate in a stored quote — the subsidy's base. */
export function cheapestCost(stored: StoredQuote): Money | null {
  const costs = stored.quote?.options.map((o) => o.cost.amount) ?? [];
  return costs.length ? mxn(Math.min(...costs)) : null;
}

/** Is this stored quote for this address, and still fresh enough to offer? */
export function quoteUsable(
  stored: StoredQuote | null | undefined,
  address: Pick<MxAddress, "postalCode" | "state" | "city" | "colonia">,
  now: number,
): boolean {
  if (!stored?.quote || stored.destinationKey !== destinationKey(address)) return false;
  if (now - Date.parse(stored.quotedAt) > QUOTE_FRESH_MS) return false;
  return Date.parse(stored.quote.expiresAt) > now;
}

/**
 * The options a customer sees: cheapest first, then fastest, one per
 * carrier and service (a provider can return near-duplicates).
 */
export function quotedMethods(
  stored: StoredQuote,
  address: Pick<MxAddress, "city" | "state">,
  subtotal: Money,
): DeliveryMethod[] {
  if (!stored.quote) return [];
  const cheapest = cheapestCost(stored);
  if (!cheapest) return [];
  const route = routeForAddress(address);
  const seen = new Set<string>();
  return [...stored.quote.options]
    .sort(
      (a, b) => a.cost.amount - b.cost.amount || (a.estimateDays ?? 99) - (b.estimateDays ?? 99),
    )
    .filter((o) => {
      const key = `${o.carrierCode}:${o.serviceCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((o) => {
      const split = shippingSplit(subtotal, o.cost, cheapest);
      return {
        id: o.rateId,
        kind: "quoted" as const,
        route,
        estimateDays: o.estimateDays,
        price: split.charge,
        basis: "quoted" as const,
        handling: null,
        label: { carrier: o.carrier, service: o.service },
        subsidy: split.subsidy,
      };
    });
}

/**
 * Freeze the chosen rate — or nothing, when the id is not in the stored
 * quote, the quote is for another address, or it is no longer usable.
 */
export function selectQuoted(
  stored: StoredQuote | null | undefined,
  rateId: string,
  address: MxAddress,
  subtotal: Money,
  now: number,
): DeliverySelection | null {
  if (!quoteUsable(stored, address, now)) return null;
  const quote = stored!.quote!;
  const option = quote.options.find((o) => o.rateId === rateId);
  const cheapest = cheapestCost(stored!);
  if (!option || !cheapest) return null;
  /* The subsidy comes from THIS server-side quote's cheapest rate — never
     from anything posted, so no form can enlarge it. */
  const split = shippingSplit(subtotal, option.cost, cheapest);
  const frozen: FrozenQuote = {
    provider: quote.provider,
    quotationId: quote.quotationId,
    rateId: option.rateId,
    carrier: option.carrier,
    carrierCode: option.carrierCode,
    service: option.service,
    serviceCode: option.serviceCode,
    cost: option.cost,
    subsidyBase: cheapest,
    subsidy: split.subsidy,
    quotedAt: stored!.quotedAt,
    expiresAt: quote.expiresAt,
    destinationKey: stored!.destinationKey,
  };
  return {
    methodId: "quoted",
    route: routeForAddress(address),
    estimateDays: option.estimateDays,
    price: split.charge,
    quote: frozen,
  };
}

/**
 * IS A SELECTION STILL GOOD AT PLACEMENT? It must be for this address, its
 * quote fresh, and its customer price what the rule gives for the current
 * subtotal (a bag edited across the threshold changes it).
 */
export function selectionCurrent(
  selection: DeliverySelection,
  address: MxAddress,
  subtotal: Money,
  now: number,
): "ok" | "stale" | "reprice" {
  const q = selection.quote;
  if (!q) return "ok";
  if (q.destinationKey !== destinationKey(address)) return "stale";
  if (now - Date.parse(q.quotedAt) > QUOTE_FRESH_MS || Date.parse(q.expiresAt) <= now) {
    return "stale";
  }
  const price = customerShipping(subtotal, q.cost, q.subsidyBase);
  return selection.price?.amount === price.amount ? "ok" : "reprice";
}

/**
 * RE-QUOTE A STALE SELECTION: the same carrier and service in a fresh quote,
 * at its new cost — and the subsidy recomputed from the FRESH set of
 * eligible rates (the old cheapest may be gone). Null when the service is
 * no longer offered.
 */
export function requoteSelection(
  selection: DeliverySelection,
  fresh: StoredQuote,
  address: MxAddress,
  subtotal: Money,
  now: number,
): DeliverySelection | null {
  const q = selection.quote;
  if (!q || !fresh.quote) return null;
  const same = fresh.quote.options.find(
    (o) => o.carrierCode === q.carrierCode && o.serviceCode === q.serviceCode,
  );
  return same ? selectQuoted(fresh, same.rateId, address, subtotal, now) : null;
}

/** The same rate, priced by the rule for this subtotal (the threshold moved). */
export function repriceSelection(selection: DeliverySelection, subtotal: Money): DeliverySelection {
  const q = selection.quote;
  if (!q) return selection;
  const split = shippingSplit(subtotal, q.cost, q.subsidyBase);
  return { ...selection, price: split.charge, quote: { ...q, subsidy: split.subsidy } };
}
