import type { AreaSubject } from "./index";

/**
 * WHAT AN AREA IS, AS A HOLDING — counted, never described.
 *
 * The area page opens with a masthead that says what the area is *about* (a
 * class-A merchandising line the owner wrote) and then goes straight to
 * compounds. Between them there was nothing that says what the area actually
 * CONTAINS: how many compounds, in how many presentations, in what forms, from
 * what price, how much of it overlaps other areas, and how much of it carries
 * public documentation.
 *
 * Every figure here is counted from the registry at build time. There is no
 * prose in this module and no field for one: an area's *meaning* is sourced
 * content and belongs in `content/areas`, which is empty by design until real
 * references exist. This is the other half — the part that is true because the
 * catalogue says so.
 *
 * WHAT IT MAY NEVER CONTAIN: purity, testing, certification counts, mechanism,
 * pathway, indication or outcome. Not one of those is a fact this registry
 * holds, and the reference sites that print them are printing claims.
 */

/** The minimum a composition needs from a product. */
export interface CompositionSubject extends AreaSubject {
  variants: readonly { strength: { kind: string }; vials: number | null }[];
}

export interface AreaComposition {
  /** Compounds filed in this area. */
  compounds: number;
  /** Their presentations, summed. */
  presentations: number;
  /**
   * Distinct dosing forms present — solid, solution, volume, iu, blend.
   *
   * Reported as a COUNT rather than a range whenever more than one kind is
   * present. `Strength` is a union of five incompatible forms and IU is
   * explicitly not convertible to milligrams, so a single span across kinds
   * would misstate a dose. This is `presentationRange`'s own rule, lifted from
   * a product to an area.
   */
  forms: number;
  /** Compounds carrying an Experience world — the flagships. */
  flagships: number;
  /** Compounds also filed under at least one other area. */
  shared: number;
  /** Compounds whose every variant states a presentation, so they can be sold. */
  sellable: number;
}

/**
 * Counts an area from its products.
 *
 * `alsoIn` is injected rather than imported so the same function serves the
 * live registry and a fixture, and so `check:catalog` can drive it with a
 * negative control.
 */
export function areaComposition<T extends CompositionSubject>(
  items: readonly T[],
  alsoIn: (slug: string) => number,
): AreaComposition {
  const kinds = new Set<string>();
  let presentations = 0;
  let sellable = 0;

  for (const item of items) {
    presentations += item.variants.length;
    for (const variant of item.variants) kinds.add(variant.strength.kind);
    if (item.variants.length > 0 && item.variants.every((v) => v.vials !== null)) sellable += 1;
  }

  return {
    compounds: items.length,
    presentations,
    forms: kinds.size,
    flagships: items.filter((item) => item.world !== null).length,
    shared: items.filter((item) => alsoIn(item.slug) > 1).length,
    sellable,
  };
}
