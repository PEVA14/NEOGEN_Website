import { formatStrength, getProduct, isPublishable } from "@/data/catalog";
import { getAvailability, getPrices } from "@/data/commerce";
import { clampQuantity } from "@/domain/bag";

import type { Money } from "@/data/commerce";
import type { LineAdjustment, PricedLine, PriceSnapshot } from "./types";

/**
 * SERVER-AUTHORITATIVE PRICING — the security boundary of this whole phase.
 *
 * Everything a customer will be charged is computed here, from the registry,
 * on the server. What the browser is allowed to say is: these variant ids,
 * these quantities. Every other field on a line — name, presentation, unit
 * price, line total — is looked up, never accepted.
 *
 * `claimedUnitPrice` is the one exception, and it is not an input to any sum.
 * It is what the customer was SHOWN when they added the item, carried across
 * so this function can notice that the price has since moved and say so. It
 * can only ever produce a `repriced` disclosure; it can never set an amount.
 * That distinction is the difference between an honest shop and a tamperable
 * one, so it is worth being explicit: no number that arrives from a client is
 * multiplied, added, or stored as money.
 */

const mxn = (amount: number): Money => ({ amount, currency: "MXN" });

/** What the browser may assert. Deliberately the smallest possible surface. */
export interface RequestedLine {
  variantId: string;
  quantity: number;
  /** Advisory only — used to DETECT a price change, never to set one. */
  claimedUnitPrice?: number;
}

export interface PricingResult {
  snapshot: PriceSnapshot;
  adjustments: readonly LineAdjustment[];
}

/**
 * A cheap equality key over what the customer agreed to.
 *
 * Covers variant, quantity and unit price and nothing else — those are the
 * three facts that determine the amount charged. The review step compares the
 * fingerprint it displayed against a freshly computed one before creating an
 * order, so a change between reading and confirming stops the flow.
 */
export function fingerprint(lines: readonly PricedLine[]): string {
  return lines
    .map((l) => `${l.variantId}:${l.quantity}:${l.unitPrice.amount}`)
    .sort()
    .join("|");
}

/**
 * Merge duplicate variant ids before anything else.
 *
 * A hand-edited bag can contain the same variant twice. Left alone, that
 * charges correctly but presents two rows for one thing and lets a customer
 * exceed the per-line ceiling by splitting it — so quantities are summed and
 * then clamped once.
 */
function merge(requested: readonly RequestedLine[]): RequestedLine[] {
  const byVariant = new Map<string, RequestedLine>();
  for (const line of requested) {
    if (typeof line.variantId !== "string" || !line.variantId) continue;
    const existing = byVariant.get(line.variantId);
    const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
    if (existing) {
      existing.quantity += quantity;
    } else {
      byVariant.set(line.variantId, { ...line, quantity });
    }
  }
  return [...byVariant.values()];
}

/**
 * Reprice a requested bag against the live catalogue.
 *
 * Lines are DROPPED rather than corrected when the thing itself is gone —
 * an unknown variant, an unpublished product, no price, explicitly
 * unavailable — and every drop is reported so the customer is told what
 * happened instead of finding one fewer item at the end.
 */
export async function priceLines(
  requested: readonly RequestedLine[],
  now: () => string = () => new Date().toISOString(),
): Promise<PricingResult> {
  const merged = merge(requested);
  const ids = merged.map((l) => l.variantId);
  const [prices, availability] = await Promise.all([getPrices(ids), getAvailability(ids)]);

  const lines: PricedLine[] = [];
  const adjustments: LineAdjustment[] = [];

  for (const request of merged) {
    /*
     * The variant id encodes nothing trustworthy, so it is resolved by
     * SEARCHING the registry rather than being parsed. A slug derived from the
     * id string would be an injection surface for free.
     */
    const found = findVariant(request.variantId);
    if (!found || !isPublishable(found.product)) {
      adjustments.push({ kind: "removed_unknown", variantId: request.variantId });
      continue;
    }

    const { product, variant } = found;
    const price = prices.get(request.variantId) ?? null;
    if (!price) {
      adjustments.push({
        kind: "removed_unpriced",
        variantId: request.variantId,
        name: product.name,
      });
      continue;
    }

    if (availability.get(request.variantId) === "unavailable") {
      adjustments.push({
        kind: "removed_unavailable",
        variantId: request.variantId,
        name: product.name,
      });
      continue;
    }

    const quantity = clampQuantity(request.quantity);
    if (quantity !== Math.round(request.quantity)) {
      adjustments.push({
        kind: "quantity_clamped",
        variantId: request.variantId,
        name: product.name,
        from: request.quantity,
        to: quantity,
      });
    }

    if (
      typeof request.claimedUnitPrice === "number" &&
      Number.isFinite(request.claimedUnitPrice) &&
      request.claimedUnitPrice !== price.amount
    ) {
      adjustments.push({
        kind: "repriced",
        variantId: request.variantId,
        name: product.name,
        was: mxn(request.claimedUnitPrice),
        now: price,
      });
    }

    lines.push({
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      presentation: formatStrength(variant.strength),
      unitPrice: price,
      quantity,
      lineTotal: mxn(price.amount * quantity),
    });
  }

  return {
    snapshot: {
      lines,
      subtotal: mxn(lines.reduce((n, l) => n + l.lineTotal.amount, 0)),
      pricedAt: now(),
      fingerprint: fingerprint(lines),
    },
    adjustments,
  };
}

/** Reprice an existing snapshot — the freshness check before an order is made. */
export async function reprice(snapshot: PriceSnapshot): Promise<PricingResult> {
  return priceLines(
    snapshot.lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      claimedUnitPrice: l.unitPrice.amount,
    })),
  );
}

/**
 * Resolve a variant id to its product.
 *
 * Linear over ~147 variants, which is nothing, and it means variant ids need
 * no index to maintain and no convention to preserve.
 */
function findVariant(variantId: string) {
  /* Imported lazily-by-reference: `getProduct` needs a slug, so the registry
     is scanned. Kept in one function so callers cannot reimplement it. */
  for (const slug of variantSlugCandidates(variantId)) {
    const product = getProduct(slug);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (product && variant) return { product, variant };
  }
  return null;
}

/**
 * Variant ids are `<slug>-<strength>`, so the slug is a prefix — but slugs
 * themselves contain hyphens, so every prefix is tried longest-first rather
 * than assuming where the boundary is. `ghk-cu-50mg` resolves to `ghk-cu`,
 * not `ghk`.
 */
function variantSlugCandidates(variantId: string): string[] {
  const parts = variantId.split("-");
  const candidates: string[] = [];
  for (let i = parts.length - 1; i > 0; i -= 1) {
    candidates.push(parts.slice(0, i).join("-"));
  }
  return candidates;
}
