import type { WorldId } from "@/config/worlds";

/**
 * THE CATALOG — product identity, and nothing that changes weekly.
 *
 * Split from commerce on purpose. What a product *is* — its name, compound,
 * strengths, presentation — changes rarely and belongs in version control where
 * a change is reviewed. What a product *costs and whether it is in stock*
 * changes constantly and must not require a deploy. Putting a price on a
 * variant would weld those two lifecycles together, and unpicking them later
 * means touching every page. See `src/data/commerce`.
 */

/**
 * Merchandising taxonomy. Deliberately shallow: four buckets across ~93
 * products is navigable, and a deeper tree would be inventing structure the
 * catalogue does not have.
 */
export type CategoryId = "metabolic" | "peptides" | "blends" | "solvents";

/**
 * How a variant is dosed.
 *
 * A discriminated union rather than a number, because the catalogue genuinely
 * contains five incompatible dosing forms. `strengthMg: number` cannot express
 * `200mg/10ml`, `100iu`, `10ml/vial`, or `5+5mg` — and quietly coercing any of
 * them to milligrams would misstate a dose.
 */
export type Strength =
  /** Lyophilised powder, milligrams per vial. The majority. */
  | { kind: "solid"; mg: number }
  /** Solution: milligrams dissolved in a stated volume. */
  | { kind: "solution"; mg: number; ml: number }
  /** Sold by volume alone — solvents and vitamin blends. */
  | { kind: "volume"; ml: number }
  /**
   * International Units. NOT convertible to milligrams: the conversion depends
   * on the specific preparation, so it is a separate unit, not a number with a
   * different label.
   */
  | { kind: "iu"; iu: number }
  /** Multi-component, milligrams per component in listed order. */
  | { kind: "blend"; componentsMg: number[] };

export interface ProductVariant {
  /** Stable and human-readable — `reta-10mg`. Keys the commerce layer. */
  id: string;
  strength: Strength;
  /**
   * Vials per pack, as NEOGEN sells it.
   *
   * Null where the source states no presentation — those variants cannot be
   * sold until it is confirmed, and the commerce layer refuses to price them.
   * Not every product is ten: Cerebrolysin ships six.
   */
  vials: number | null;
}

export interface Product {
  id: string;
  /** URL segment under /productos. */
  slug: string;
  name: string;
  category: CategoryId;
  /**
   * Composition, verbatim from the source where stated. Null otherwise —
   * never reconstructed from a product name.
   */
  composition: string | null;
  /**
   * An alternative designation for the same compound — "Thymosin B4 Acetate"
   * for TB-500.
   *
   * Deliberately NOT a description and NOT a classification. It holds only a
   * name the source itself printed or the owner confirmed, because the reason
   * this field exists is that twelve products sit under "Péptidos" without
   * being peptides, and the honest fix is to say what a compound is also
   * called — not to invent a class for it. Null for all but one product today.
   */
  subtitle: string | null;
  /**
   * The Experience world, for the three flagships only.
   *
   * Null for the other ~90. A world is a full 3D environment and an art
   * direction; it is a property a few products have, not the thing products
   * are organised by. This is why the catalog registry — not `worlds.ts` — is
   * the source of truth for what NEOGEN sells.
   */
  world: WorldId | null;
  variants: ProductVariant[];
}
