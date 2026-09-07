import type { WorldId } from "@/config/worlds";

/**
 * Product data MODEL only. This file intentionally contains ZERO product data.
 *
 * Every field that represents a real-world business or scientific fact is
 * modelled as `Verifiable<T>`, which makes "we do not have this value yet" a
 * first-class, type-checked state. It is impossible to render a placeholder as
 * though it were confirmed without deliberately lying to the type system.
 *
 * See docs/NEOGEN_MVP_SCOPE.md — "Regulatory / Claims Boundary".
 */

/**
 * A value that may not yet be verified.
 *
 *  - `verified`: confirmed by the business and safe to present as fact.
 *  - `pending`:  known to exist but not yet confirmed. Render a neutral
 *                pending state. NEVER substitute an invented value.
 *  - `unavailable`: does not apply / will not be provided.
 */
export type Verifiable<T> =
  { status: "verified"; value: T } | { status: "pending" } | { status: "unavailable" };

export interface Money {
  /** Minor units (centavos) to avoid floating-point currency errors. */
  amount: number;
  /** ISO 4217. MXN for the initial market. */
  currency: "MXN";
}

export interface ProductImage {
  src: string;
  /** Required. Alt text is never optional — see docs/CONVENTIONS.md. */
  alt: string;
  width: number;
  height: number;
}

/** A single technical specification row. Values are strings — no unit maths. */
export interface ProductSpec {
  /** Dictionary key for the label, so specs stay locale-independent. */
  labelKey: string;
  value: Verifiable<string>;
}

/**
 * Documentation references. The UI may *accommodate* these fields; unavailable
 * data stays an explicit placeholder. Never fabricate a certificate, analysis
 * result, laboratory, batch number or provenance.
 */
export interface ProductDocumentation {
  /** Certificate of analysis. */
  coa: Verifiable<{ label: string; href: string }>;
  lotNumber: Verifiable<string>;
  storageKey: Verifiable<string>;
  origin: Verifiable<string>;
  supplier: Verifiable<string>;
}

export type ProductAvailability =
  { status: "available" } | { status: "unavailable" } | { status: "pending" };

export interface Product {
  slug: string;
  /** Product name — a proper noun, not translated copy. */
  name: string;
  /** Dictionary key for the short descriptor. Not a claim. */
  descriptorKey: string;
  /** The experiential world this product inhabits. */
  world: WorldId;

  images: ProductImage[];
  /** Overrides `worlds[world].modelPath` when a product gets unique geometry. */
  modelPath: string | null;

  price: Verifiable<Money>;
  availability: ProductAvailability;

  specs: ProductSpec[];
  documentation: ProductDocumentation;

  /** Slugs of related research articles. */
  researchSlugs: string[];
  /** Slugs of related products. */
  relatedSlugs: string[];
}
