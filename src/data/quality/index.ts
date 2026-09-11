import { ISSUERS } from "./issuers";
import { LOTS } from "./lots";

import type { Issuer, Lot, PublicLot } from "./types";

export type { Issuer, IssuerKind, Lot, LotStatus, PublicLot } from "./types";
export { ISSUERS } from "./issuers";
export { LOTS } from "./lots";

export function getIssuer(
  id: string,
  registry: Readonly<Record<string, Issuer>> = ISSUERS,
): Issuer | undefined {
  return Object.prototype.hasOwnProperty.call(registry, id) ? registry[id] : undefined;
}

export function getLot(id: string, registry: readonly Lot[] = LOTS): Lot | undefined {
  return registry.find((lot) => lot.id === id);
}

export function lotsForVariant(variantId: string, registry: readonly Lot[] = LOTS): readonly Lot[] {
  return registry.filter((lot) => lot.variantId === variantId);
}

/**
 * The public projection of a lot.
 *
 * Built by copying named fields rather than by deleting the private ones,
 * so a field added to `Lot` later is private by default instead of public by
 * accident.
 */
export function publicLot(lot: Lot): PublicLot | null {
  if (!lot.publicVisibility) return null;
  return {
    id: lot.id,
    slug: lot.slug,
    variantId: lot.variantId,
    manufacturedOn: lot.manufacturedOn,
    expiresOn: lot.expiresOn,
    retestOn: lot.retestOn,
    status: lot.status,
  };
}
