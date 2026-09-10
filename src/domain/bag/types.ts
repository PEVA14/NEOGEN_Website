import type { Money } from "@/data/commerce";

/**
 * THE BAG — what a customer has chosen, before it becomes an order.
 *
 * KEYED BY VARIANT, NOT BY PRODUCT. A 5 mg pack and a 60 mg pack of the same
 * compound are different things at different prices; collapsing them onto a
 * product would make the bag unable to express the most ordinary purchase in
 * this catalogue.
 *
 * A LINE CARRIES A PRICE SNAPSHOT. Prices in this repository are provisional
 * and will change when the owner confirms them, so a bag that stored only a
 * variant id would silently reprice itself under the customer. `unitPrice` is
 * what they were shown when they added it; a change is DETECTED and surfaced
 * rather than applied quietly (see `reconcile`).
 */
export interface BagLine {
  /** Variant id — the key. `reta-10mg`. */
  variantId: string;
  /** Product slug, so a line can link and label itself without a lookup. */
  slug: string;
  /** Product name as shown when added. */
  name: string;
  /** Formatted presentation — "10 mg". */
  presentation: string;
  /** Price per pack at the moment of adding. */
  unitPrice: Money;
  quantity: number;
}

export interface Bag {
  lines: readonly BagLine[];
  /** Total UNITS across all lines — what the header shows. */
  count: number;
}

/**
 * Money owed, as far as the site can currently know it.
 *
 * `shipping` is deliberately `null` rather than 0 until a rate model exists:
 * the owner's answer was "calculated probably", which is not a rate, and a
 * zero would read as free shipping. `total` therefore covers goods only, and
 * the UI says so.
 *
 * There is no tax line. IVA is to be INCLUDED in displayed prices once they
 * are final, so adding tax at this stage would charge it twice.
 */
export interface BagTotals {
  subtotal: Money;
  /** Null while no rate model is chosen. Zero once the threshold is met. */
  shipping: Money | null;
  /** Goods only. */
  total: Money;
  /** Amount still needed for free shipping, or null once it is reached. */
  freeShippingRemaining: Money | null;
  /** 0–1, for a progress indicator. 1 once the threshold is met. */
  freeShippingProgress: number;
}
