import MANIFEST from "./specimens.json";

/**
 * A studio still, split into the two layers it was always made of.
 *
 * Written by `scripts/capture-specimen.mjs` from three passes of the SAME
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
  /** Flagships: the product page's stand-in. */
  stage?: StageStandIn;
}

/**
 * THE FLAGSHIP'S STAND-IN — the live vial on its product page, photographed
 * from its own canvas as the first frame draws it (`capture-specimen --stage`),
 * so the stand-in and the frame it dissolves into are the same picture.
 *
 * Every box is in fractions of the MEDIA FRAME (x of its width, y of its
 * height), which is 4:5 on every screen.
 */
export interface StageStandIn {
  src: string;
  /** The model it was photographed from; `check:media` holds them together. */
  model: string;
  /** `LIVE_FRAME_MARGIN` when it was taken. */
  margin: number;
  /** The vial's lean on screen, clockwise, in degrees. */
  lean: number;
  pixels: { width: number; height: number };
  /** The photograph's box: the leaning vial, padded. */
  crop: { x: number; y: number; w: number; h: number };
  /** The vial's centre. */
  centre: { x: number; y: number };
  /** Its box when stood upright about that centre, padded. */
  upright: { w: number; h: number };
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
  /** A rendered cut-out, or a drawn product's drawn vial. */
  specimen: (slug: string) => `vt-specimen-${slug}`,
};
