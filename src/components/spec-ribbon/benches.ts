/**
 * THE SPECIFICATIONS RIBBON, PER PRODUCT — which products have one, and what
 * of theirs it is made of. A product without an entry keeps section 02 as it
 * is. Plain data (no three.js), so `check:media` can read it.
 */

/** The bench's vial: the bare vial (no label), rendered on the page's paper. */
export interface BenchVial {
  src: string;
  width: number;
  height: number;
  /** The model it was rendered from; `check:media` holds it to the page's. */
  model: string;
  /** Its straight body, as shares of the image height — where the band sits. */
  bodyTop: number;
  bodyBottom: number;
  /** Half its width at the body, as a share of the image height. */
  radius: number;
}

export interface Bench {
  vial: BenchVial;
  /** The label's stripe, left to right: three stops of one gradient. */
  stripe: readonly [string, string, string];
  /** The label's accent ink — the presentation range. */
  ink: string;
}

const BENCHES: Readonly<Record<string, Bench>> = {
  reta: {
    vial: {
      src: "/images/products/reta/bench-reta-v7.webp",
      width: 1312,
      height: 2865,
      model: "/models/reta-v7.glb",
      bodyTop: 0.3326,
      bodyBottom: 0.9466,
      radius: 0.2265,
    },
    // RETA's label: the stripe's ink and its navy.
    stripe: ["#010104", "#1b1a67", "#3432c8"],
    ink: "#00167a",
  },
};

export function benchFor(slug: string): Bench | null {
  return BENCHES[slug] ?? null;
}

/** Every product with a bench, for `check:media`. */
export function allBenches(): readonly (readonly [string, Bench])[] {
  return Object.entries(BENCHES);
}
