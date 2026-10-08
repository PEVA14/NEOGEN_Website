import { BufferAttribute, BufferGeometry } from "three";

/**
 * THE SPECIFICATIONS RIBBON's band — a label-styled band that unwinds FROM a
 * vial and unrolls across the page into the panel that holds section 02's
 * specifications (owner's sketches, 2026-09-30 and 10-01).
 *
 * At rest the band is wound round the vial's body, and its free end is rolled
 * up just past the vial's edge. When it plays, the band comes off the back of
 * the vial and emerges from behind it, while the roll travels right laying it
 * down flat — both ends feeding the run between them — until the band reaches
 * the panel's end, still wound round the vial it came from.
 *
 * All lengths are CSS pixels: an orthographic canvas over the bench, one world
 * unit to the pixel, measured from the DOM.
 */

/** The script, in progress units (0 at rest, 1 landed). */
export const RIBBON = {
  /** The band unwinds and the roll travels to the panel's end. */
  unroll: [0, 0.86],
  /** The DOM panel's content resolves over the laid-down band. */
  resolve: [0.82, 0.97],
} as const;

/** Smoothstep of `p` across [from, to]: 0 before, 1 after. */
export function phase(p: number, from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (p - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** The panel's opacity, written per frame by the band (outside React). */
export function setOpacity(element: HTMLElement, value: number | ""): void {
  element.style.opacity = String(value);
}

/** The roll at rest, as a share of the band's height. */
export const ROLL = 0.2;
/** How much of the laid-down length the vial gives up; the roll gives the rest. */
const FROM_VIAL = 0.35;
/** How much stays wound at the end: past the visible quarter, so the band is
    still seen round the vial. In half-turns. */
const WOUND_AT_END = 1.6;
/** Each turn round the vial adds this to its radius (no z-fighting). */
const LAYER = 1.5;

const COLUMNS = 1100;

export function ribbonGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const count = (COLUMNS + 1) * 2;
  const uvs = new Float32Array(count * 2);
  const along = new Float32Array(COLUMNS + 1);
  const index: number[] = [];
  for (let c = 0; c <= COLUMNS; c += 1) {
    // From the end wound innermost on the vial to the free end in the roll.
    along[c] = c / COLUMNS;
    uvs.set([c / COLUMNS, 0, c / COLUMNS, 1], c * 4);
    if (c < COLUMNS) {
      const a = c * 2;
      // Where the band runs flat to the right, its printed side faces the viewer.
      index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  }
  geometry.setIndex(index);
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  // Each column's place across (x) and in depth (z): the band is straight up and down.
  geometry.userData.along = along;
  geometry.userData.xz = new Float32Array((COLUMNS + 1) * 2);
  geometry.userData.lift = new Float32Array(COLUMNS + 1);
  return geometry;
}

/** The band's lengths for a bench, fixed by its geometry (pixels). */
export interface RibbonPlan {
  /** Whole band. */
  length: number;
  /** Wound round the vial at rest, and at the end. */
  woundAtRest: number;
  woundAtEnd: number;
  /** Flat run from the vial's back at rest (just past its edge) and at the end. */
  runAtRest: number;
  runAtEnd: number;
  /** Rolled at rest, and the paper thickness that gives the roll its size. */
  rolledAtRest: number;
  thickness: number;
}

export function planRibbon(radius: number, runAtEnd: number, height: number): RibbonPlan {
  const rollRadius = ROLL * height;
  const runAtRest = radius + rollRadius;
  const laid = runAtEnd - runAtRest;
  const woundAtEnd = WOUND_AT_END * Math.PI * radius;
  const woundAtRest = woundAtEnd + FROM_VIAL * laid;
  const rolledAtRest = laid * (1 - FROM_VIAL);
  return {
    length: woundAtEnd + runAtEnd,
    woundAtRest,
    woundAtEnd,
    runAtRest,
    runAtEnd,
    rolledAtRest,
    thickness: (Math.PI * rollRadius * rollRadius) / Math.max(1, rolledAtRest),
  };
}

/**
 * Lays the band out at progress `t` (0 at rest, 1 laid down), in the canvas's
 * world: x across (the vial's axis at `axis`), y up, z toward the viewer, with
 * the flat run in the plane z = 0 — behind the vial, whose axis sits one
 * radius in front of it. Returns the vial's axis depth, for the occluder.
 *
 *   wound   round the vial, outermost turn leaving at the vial's back,
 *           heading right; upstream it runs round the left, the front, the
 *           right — so on the visible half it is seen wrapped round the glass
 *   run     flat, from the vial's back to the roll
 *   rolled  the free end, rolled print-in, sitting on the run toward the
 *           viewer, one paper thickness smaller each turn
 */
export function layRibbon(
  geometry: BufferGeometry,
  plan: RibbonPlan,
  {
    t,
    axis,
    radius,
    top,
    bottom,
    level,
  }: {
    t: number;
    axis: number;
    radius: number;
    top: number;
    bottom: number;
    /**
     * tan of the camera's downward tilt. The part wound round the vial is
     * raised by the vial's axis depth × this, so at the vial's edge it is
     * exactly level with the panel it runs into — no step where the band
     * leaves the vial (owner, 2026-10-01) — while across the front it still
     * dips in the gentle arc of a band seen wrapped round glass, a little
     * from above (levelled flat, it read as "a plain white rectangle").
     */
    level: number;
  },
): number {
  const position = geometry.getAttribute("position") as BufferAttribute;
  const normal = geometry.getAttribute("normal") as BufferAttribute;
  const along = geometry.userData.along as Float32Array;
  const xz = geometry.userData.xz as Float32Array;
  const lift = geometry.userData.lift as Float32Array;
  const wound = plan.woundAtRest + (plan.woundAtEnd - plan.woundAtRest) * t;
  const run = plan.runAtRest + (plan.runAtEnd - plan.runAtRest) * t;
  const rolled = Math.max(0, plan.length - wound - run);
  const perTurn = LAYER / (2 * Math.PI * radius);
  const outer = radius + LAYER + perTurn * wound;
  const axisZ = outer;
  const rollOuter = Math.sqrt((rolled * plan.thickness) / Math.PI);
  const k = plan.thickness / (2 * Math.PI);
  /* Where the outer turn crosses the vial's edge (x = axis + radius) — the
     panel's edge — it sits this far forward; raised by that, it is level
     with the panel exactly there. */
  const seam = (axisZ + Math.sqrt(Math.max(0, outer * outer - radius * radius))) * level;

  for (let c = 0; c < along.length; c += 1) {
    const s = along[c]! * plan.length;
    let x: number;
    let z: number;
    lift[c] = 0;
    if (s < wound) {
      // d: back along the band from where it leaves the vial.
      const d = wound - s;
      const alpha = Math.PI + d / radius;
      const r = outer - perTurn * d;
      x = axis + r * Math.sin(alpha);
      z = axisZ + r * Math.cos(alpha);
      lift[c] = seam;
    } else if (s < wound + run || rollOuter < 0.01) {
      x = axis + (s - wound);
      z = 0;
    } else {
      const d = Math.min(s - wound - run, rolled);
      const phi =
        (rollOuter -
          Math.sqrt(Math.max(0, rollOuter * rollOuter - (plan.thickness * d) / Math.PI))) /
        k;
      const r = rollOuter - k * phi;
      x = axis + run + r * Math.sin(phi);
      z = rollOuter - r * Math.cos(phi);
    }
    xz[c * 2] = x;
    xz[c * 2 + 1] = z;
  }

  /* Normals from the band's own direction (a column's neighbours), which is
     all a vertical strip needs: (-dz, 0, dx), the printed side's. */
  const last = along.length - 1;
  for (let c = 0; c <= last; c += 1) {
    const a = Math.max(0, c - 1) * 2;
    const b = Math.min(last, c + 1) * 2;
    const dx = xz[b]! - xz[a]!;
    const dz = xz[b + 1]! - xz[a + 1]!;
    const length = Math.hypot(dx, dz) || 1;
    const x = xz[c * 2]!;
    const z = xz[c * 2 + 1]!;
    position.setXYZ(c * 2, x, top + lift[c]!, z);
    position.setXYZ(c * 2 + 1, x, bottom + lift[c]!, z);
    normal.setXYZ(c * 2, -dz / length, 0, dx / length);
    normal.setXYZ(c * 2 + 1, -dz / length, 0, dx / length);
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
  return axisZ;
}

/**
 * A box in the band's frame: CSS pixels, x along the band, y down across it.
 * On a wide screen that is the page's own frame; upright (a phone), the
 * page's boxes turned a quarter back into it (`RibbonOverlay`).
 */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface Marks {
  hairline: Box;
  stripe: Box;
  lockup: Box;
}

/**
 * Where the band's print puts its marks, in band pixels: x along the band from
 * its inner end, y down from its top edge. Page x maps to band length through
 * where the band lies at the end (`axisPage` is the vial's axis on the page).
 * The paper shader draws them; nothing is painted ahead.
 *
 *   front  the side that ends up facing the viewer, laid down: the panel's own
 *          marks — hairline and stripe — measured off its elements, so the
 *          panel resolves over the same marks
 *   back   the side wound outward on the vial and round the roll: the same
 *          hairline and stripe, and the lockup twice — where the vial shows it
 *          at rest, and where it shows it once the band is laid down, so the
 *          vial keeps its label (owner, 2026-10-01: "make the vial here not be
 *          so empty, maybe leave the logo there"). The panel has none.
 */
export interface RibbonPrint {
  length: number;
  height: number;
  /** top, height */
  hairline: [number, number];
  /** top, height, and where its gradient runs from and to along the band */
  stripe: [number, number, number, number];
  /** The lockup's top, width and height. */
  lockup: [number, number, number];
  /** Its left edge on the back, at rest and laid down. */
  lockupBack: [number, number];
  /**
   * The two lockups would share the vial's visible face for part of the run
   * (the band unwinds too little to carry the first out of view before the
   * second comes round): hand over from one to the other instead of showing
   * both. Across only; upright they are always apart.
   */
  handover: boolean;
  /**
   * Upright only: where the back carries the product's name and range at
   * rest — along the band from, to; across it from, to. Null across.
   */
  label: [number, number, number, number] | null;
  /**
   * Upright, the logo is set upright on the page too, beside the name: its
   * `lockup` is then across-from, along-length, across-width.
   */
  upright: boolean;
}

export function ribbonPrint(
  plan: RibbonPlan,
  axisPage: number,
  panel: Box,
  marks: Marks,
  radius: number,
  /** The whole vial is in view (upright), not only the half by its edge. */
  whole = false,
): RibbonPrint {
  const X = (pageX: number) => plan.woundAtEnd + (pageX - axisPage);
  const Y = (pageY: number) => pageY - panel.top;
  /* Where the vial shows its label: centred on its visible quarter — between
     its front and its right edge — at rest and once laid down. Across, the
     vial stands half off the page, so that quarter is all of it there is:
     from the front (its axis, the page's edge) to its right silhouette. The
     second logo is on an inner turn at rest, and comes round into view from
     behind the right silhouette as the outer turns leave; the first rolls
     past the front and off the page.

     That is only true when the band unwinds enough to carry the first one
     wholly past the front while the second comes wholly round: an eighth of
     a turn and half a logo (`clear`). Below that (a very short panel) both
     would share the face mid-run: the second takes over from the first
     (`handover`), each still printed where it sits, never drifting into the
     page's edge. (Before 2026-10-07 a short panel got one logo midway, which
     started wrapped past the right silhouette and landed straddling the
     vial's axis — the mark cut off by the page's edge — on almost every
     product with one or two presentations.)

     The whole vial in view (upright): the logo faces the viewer square on,
     and the front that shows it is a half turn wide, not a quarter. */
  const shown = (whole ? 1 : 1.25) * Math.PI * radius;
  const half = marks.lockup.width / 2;
  const unwound = plan.woundAtRest - plan.woundAtEnd;
  const atRest = plan.woundAtRest - shown - half;
  const atEnd = plan.woundAtEnd - shown - half;
  /* A little more than the geometry needs: the layers add to the radius. */
  const clear = 0.25 * Math.PI * radius + half + 2 * LAYER;

  /* Upright, the logo reads upright, left-aligned with the name, above it at
     rest; a second one stands at the vial's front once the band is laid
     down. They are always apart: the band has unwound between them. */
  type Logos = Pick<RibbonPrint, "lockup" | "lockupBack" | "upright" | "handover">;
  let logos: Logos = {
    lockup: [Y(marks.lockup.top), marks.lockup.width, marks.lockup.height],
    lockupBack: [atRest, atEnd],
    upright: false,
    handover: unwound < clear,
  };
  if (whole) {
    const width = 0.42 * panel.height;
    const length = (width * 239) / 744;
    const from = (wound: number, d: number) => wound - d * Math.PI * radius - length / 2;
    logos = {
      lockup: [0.78 * panel.height - width, length, width],
      lockupBack: [from(plan.woundAtRest, 0.8), from(plan.woundAtEnd, 1)],
      upright: true,
      handover: false,
    };
  }
  return {
    length: plan.length,
    height: panel.height,
    hairline: [Y(marks.hairline.top), Math.max(1, marks.hairline.height)],
    stripe: [Y(marks.stripe.top), marks.stripe.height, X(marks.stripe.left), X(marks.stripe.right)],
    ...logos,
    /* The name and range on the vial at rest (owner, 2026-10-01: "have the
       text start on the vial and then disappear since we see more of it"):
       below the logo on the front, between the stripe and the hairline. The
       band carries them off as it unwinds, and they fade as it does. */
    label: whole
      ? [
          plan.woundAtRest - 1.29 * Math.PI * radius,
          plan.woundAtRest - 0.95 * Math.PI * radius,
          0.1 * panel.height,
          0.78 * panel.height,
        ]
      : null,
  };
}
