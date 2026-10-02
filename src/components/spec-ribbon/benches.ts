/**
 * THE SPECIFICATIONS RIBBON, PER PRODUCT — which products have one, and what
 * of theirs it is made of. A product without an entry keeps section 02 as it
 * is. Plain data (no three.js), so `check:media` can read it.
 */

/** The bench's vial: a bare container (no label), rendered on the page's paper. */
export interface BenchVial {
  src: string;
  width: number;
  height: number;
  /**
   * The model it was rendered from. `check:media` holds every bench's page
   * model to the same container — geometry and materials, all but the label's
   * picture, which the still does not show.
   */
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

/*
 * The flagships share one container — the V4 crimp-top — and one label design,
 * re-lettered per product (`content/media/registry.ts`). Their models differ
 * only in the label's picture, so one still of the bare container is every
 * flagship's bench vial, and the label's colours are every flagship's band.
 */
const V4_BARE: BenchVial = {
  src: "/images/containers/v4-bare.webp",
  width: 1312,
  height: 2865,
  model: "/models/reta-v7.glb",
  bodyTop: 0.3326,
  bodyBottom: 0.9466,
  radius: 0.2265,
};

/** The flagship label: its stripe's ink to navy, and its navy. */
const FLAGSHIP_LABEL = {
  stripe: ["#010104", "#1b1a67", "#3432c8"],
  ink: "#00167a",
} as const;

const BENCHES: Readonly<Record<string, Bench>> = {
  reta: { vial: V4_BARE, ...FLAGSHIP_LABEL },
  glow: { vial: V4_BARE, ...FLAGSHIP_LABEL },
  "ghk-cu": { vial: V4_BARE, ...FLAGSHIP_LABEL },
};

export function benchFor(slug: string): Bench | null {
  return BENCHES[slug] ?? null;
}

/** Every product with a bench, for `check:media`. */
export function allBenches(): readonly (readonly [string, Bench])[] {
  return Object.entries(BENCHES);
}
