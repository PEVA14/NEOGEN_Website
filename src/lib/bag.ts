import type { WorldId } from "@/config/worlds";

/**
 * THE BAG — the one seam where cart state will land.
 *
 * It is empty, and it is empty for a reason that is not laziness: nothing can
 * be added to it. No compound has a verified price, and none has a verified
 * concentration format, so the product page's ADD TO BAG is a deliberately
 * inert control (see CommercePanel). A bag that could be filled would have to
 * invent both.
 *
 * WHAT THIS MODULE IS FOR, GIVEN THAT.
 * ------------------------------------
 * It is a single source of truth rather than a second hardcoded zero. The
 * header's `[ BAG: 0 ]` and the bag page previously each stated emptiness on
 * their own authority; now they ask the same function, and when real cart state
 * arrives exactly one implementation changes while every call site stays as it
 * is.
 *
 * The types are the other half. `BagLine` fixes the shape a line has to take —
 * a product, a chosen variant, a quantity — so the summary, the bag page and
 * checkout can all be written against it before any of that data exists.
 *
 * WHEN COMMERCE IS REAL: `readBag` becomes a context read (React Context +
 * useReducer is the default unless real complexity justifies otherwise), the
 * call sites are unchanged, and the line-item renderer is built then — against
 * real products, rather than as a component that renders nothing today.
 */
export interface BagLine {
  product: WorldId;
  /** The chosen concentration format. Null until verified formats exist. */
  variant: string | null;
  quantity: number;
}

export interface Bag {
  lines: readonly BagLine[];
  /** Total units, not distinct lines — this is what the header shows. */
  count: number;
}

const EMPTY: Bag = { lines: [], count: 0 };

/**
 * The current bag.
 *
 * Server-safe and synchronous on purpose: an empty bag needs no client
 * boundary, and adding one now would put a hydration seam in the header for a
 * value that cannot change.
 */
export function readBag(): Bag {
  return EMPTY;
}
