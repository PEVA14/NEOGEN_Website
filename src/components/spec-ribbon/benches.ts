/**
 * THE SPECIFICATIONS RIBBON'S BENCH — what every product's ribbon is made of.
 * Plain data (no three.js), so `check:media` can read it.
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
 * EVERY PRODUCT SHIPS IN ONE CONTAINER — the V4 crimp-top — under one label
 * design, re-lettered per product (`content/media/registry.ts`). The flagships'
 * models differ only in the label's picture, and every other product is shot
 * on RETA's container wearing its own name. So one still of the bare
 * container is every product's bench vial, and the label's colours are every
 * product's band; the name and range on the vial are drawn per product at run
 * time (`RibbonOverlay`, `drawWords`).
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

/** The bench every product page sets section 02 on. */
export const BENCH: Bench = {
  vial: V4_BARE,
  // The label's stripe, ink to navy, and its navy.
  stripe: ["#010104", "#1b1a67", "#3432c8"],
  ink: "#00167a",
};
