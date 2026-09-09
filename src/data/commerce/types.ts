/**
 * COMMERCE STATE — what changes without a deploy.
 *
 * Price, stock and promotions are operational data. In V1 they are generated
 * into this repo because there is no backend, but every read goes through the
 * accessors in `./index.ts` so the source can become a database or a CMS
 * without any page changing.
 *
 * Nothing here is derived from supplier cost at runtime. Retail prices were
 * computed once, at authoring time, from a private document that is not in this
 * repository and never reaches the application.
 */
export interface Money {
  /** Minor-unit-free: MXN is quoted in whole pesos across this catalogue. */
  amount: number;
  currency: "MXN";
}

/**
 * Neutral vocabulary only. There is no "verified in stock" state, because
 * there is no inventory system to verify it against.
 */
export type Availability = "in-stock" | "made-to-order" | "unavailable";

export interface VariantCommerce {
  price: Money | null;
  /**
   * `null` means NOT YET DETERMINED, and is the current state of every variant.
   *
   * There is no inventory system, so any concrete value would be a claim about
   * stock we cannot support. The UI shows nothing rather than guessing — an
   * absent stock line is honest, an invented one is not.
   */
  availability: Availability | null;
}
