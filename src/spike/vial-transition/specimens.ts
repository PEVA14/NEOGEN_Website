import MANIFEST from "./specimens.json";

/**
 * A studio still, split into the two layers it was always made of.
 *
 * Written by `scripts/spike/capture-specimen.mjs` from three passes of the SAME
 * frame, and checked there: ground + specimen, recombined, reproduce the
 * registered studio still to within JPEG noise. So a card that draws the two
 * layers looks exactly like the card that drew the one picture.
 */
export interface Specimen {
  /** The set without the upright object: sweep, floor, reflection, shadow. */
  ground: string;
  /** The object alone, alpha-cut to its own silhouette, cropped to `box`. */
  specimen: string;
  frame: { width: number; height: number };
  /** The cut-out's box, in frame pixels and as fractions of the frame. */
  box: {
    left: number;
    top: number;
    width: number;
    height: number;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** The silhouette alone, unpadded, as fractions of the frame. */
  object: { x: number; y: number; w: number; h: number };
}

const SPECIMENS = MANIFEST as unknown as Record<string, Specimen>;

export function specimenFor(slug: string): Specimen | null {
  return SPECIMENS[slug] ?? null;
}

/*
 * View-transition names, one family per product. A name must be unique on a
 * page at the moment a transition starts, or the browser skips the whole
 * transition — which is why only the catalogue GRID and the product page's
 * OPENING carry them, and never the homepage, the masthead or related rows,
 * where the same product can appear twice.
 */
export const names = {
  /** A flagship card's stage, and the world it opens into on the product page. */
  world: (slug: string) => `vt-world-${slug}`,
  specimen: (slug: string) => `vt-specimen-${slug}`,
  /** Products with no still: their drawn plate travels whole. */
  plate: (slug: string) => `vt-plate-${slug}`,
};
