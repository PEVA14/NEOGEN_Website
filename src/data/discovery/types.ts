/**
 * DISCOVERY — the merchandising axis.
 *
 * Deliberately separate from `Product.category` and from `ProductType`. Those
 * two answer "what is this?" and must be defensible. This answers "why would
 * someone be looking for it?", which is a commercial question — and the whole
 * point of splitting them is that an attractive answer to the second must never
 * quietly become an assertion about the first.
 *
 * A product may sit in several areas, or in none.
 */

/**
 * The area ids.
 *
 * Ids are stable and locale-independent; every human-readable string lives in
 * the dictionaries, so an area can be RENAMED without touching product data or
 * any component. Merging or splitting one is a change to `AREAS` and to the
 * assignment map — never to a page.
 */
export type DiscoveryAreaId =
  "metabolic" | "recovery" | "longevity" | "growth" | "skin" | "neuro" | "hormonal" | "materials";

/**
 * WHY AN ASSIGNMENT IS WHERE IT IS.
 *
 * Filing BPC-157 under "Recovery & Repair" is a claim that researchers study
 * it in that context. That claim may well be true and sourceable — but it is
 * still a claim, and it cannot be made by whoever happened to build the
 * navigation. So every assignment has to say who stands behind it.
 *
 * `proposed` is a DRAFT and is NOT public. It exists so a mapping can be
 * prepared, reviewed and approved in bulk without any of it reaching a
 * customer in the meantime. `isPublic()` is the only gate that matters.
 */
export type Provenance =
  | {
      kind: "proposed";
      /** Why the draft suggests this, for the reviewer's benefit. */
      note?: string;
    }
  | {
      kind: "owner-confirmed";
      /** ISO date. Records when, so a stale approval is visible. */
      confirmedOn: string;
    }
  | {
      kind: "source";
      /** Ids into the (not yet built) reference registry. Never empty. */
      referenceIds: readonly string[];
    };

export interface DiscoveryAssignment {
  area: DiscoveryAreaId;
  provenance: Provenance;
}

/**
 * An area's structural definition. No copy: labels and descriptions are
 * localized and live in `dict.discovery.areas`.
 */
export interface DiscoveryArea {
  id: DiscoveryAreaId;
  /** Display order across nav, the homepage and the catalogue. */
  order: number;
  /**
   * URL segment under /productos/area. Locale-independent, like a product
   * slug — the English locale serves the same segments under /en.
   */
  slug: string;
}

/**
 * Whether an assignment may be shown to a customer.
 *
 * The single gate. A draft assignment is data we hold, not a statement we
 * make, and nothing rendered anywhere on the site may depend on one.
 */
export function isPublic(assignment: DiscoveryAssignment): boolean {
  return assignment.provenance.kind !== "proposed";
}
