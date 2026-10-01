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
  }: { t: number; axis: number; radius: number; top: number; bottom: number },
): number {
  const position = geometry.getAttribute("position") as BufferAttribute;
  const normal = geometry.getAttribute("normal") as BufferAttribute;
  const along = geometry.userData.along as Float32Array;
  const xz = geometry.userData.xz as Float32Array;
  const wound = plan.woundAtRest + (plan.woundAtEnd - plan.woundAtRest) * t;
  const run = plan.runAtRest + (plan.runAtEnd - plan.runAtRest) * t;
  const rolled = Math.max(0, plan.length - wound - run);
  const perTurn = LAYER / (2 * Math.PI * radius);
  const outer = radius + LAYER + perTurn * wound;
  const axisZ = outer;
  const rollOuter = Math.sqrt((rolled * plan.thickness) / Math.PI);
  const k = plan.thickness / (2 * Math.PI);

  for (let c = 0; c < along.length; c += 1) {
    const s = along[c]! * plan.length;
    let x: number;
    let z: number;
    if (s < wound) {
      // d: back along the band from where it leaves the vial.
      const d = wound - s;
      const alpha = Math.PI + d / radius;
      const r = outer - perTurn * d;
      x = axis + r * Math.sin(alpha);
      z = axisZ + r * Math.cos(alpha);
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
    position.setXYZ(c * 2, x, top, z);
    position.setXYZ(c * 2 + 1, x, bottom, z);
    normal.setXYZ(c * 2, -dz / length, 0, dx / length);
    normal.setXYZ(c * 2 + 1, -dz / length, 0, dx / length);
  }
  position.needsUpdate = true;
  normal.needsUpdate = true;
  return axisZ;
}

interface Marks {
  hairline: DOMRect;
  stripe: DOMRect;
  lockup: DOMRect;
}

/**
 * Where the band's print puts its marks, in band pixels: x along the band from
 * its inner end, y down from its top edge. Page x maps to band length through
 * where the band lies at the end (`axisPage` is the vial's axis on the page).
 * The paper shader draws them; nothing is painted ahead.
 *
 *   front  the side that ends up facing the viewer, laid down: the panel's own
 *          marks — hairline, stripe, lockup — measured off its elements, so the
 *          panel resolves over the same marks
 *   back   the side wound outward on the vial and round the roll: the same
 *          hairline and stripe, and the lockup where the vial shows it at rest
 */
export interface RibbonPrint {
  length: number;
  height: number;
  /** top, height */
  hairline: [number, number];
  /** top, height, and where its gradient runs from and to along the band */
  stripe: [number, number, number, number];
  /** front's left, top, width, height */
  lockup: [number, number, number, number];
  /** The back's lockup, left edge. */
  lockupBack: number;
}

export function ribbonPrint(
  plan: RibbonPlan,
  axisPage: number,
  panel: DOMRect,
  marks: Marks,
  radius: number,
): RibbonPrint {
  const X = (pageX: number) => plan.woundAtEnd + (pageX - axisPage);
  const Y = (pageY: number) => pageY - panel.top;
  /* Where the vial's visible quarter is at rest — between its front and its
     right edge, half a radius in — so the wound band reads as the vial's own
     label before it unwinds. */
  const atRest = plan.woundAtRest - 1.25 * Math.PI * radius;
  return {
    length: plan.length,
    height: panel.height,
    hairline: [Y(marks.hairline.top), Math.max(1, marks.hairline.height)],
    stripe: [Y(marks.stripe.top), marks.stripe.height, X(marks.stripe.left), X(marks.stripe.right)],
    lockup: [X(marks.lockup.left), Y(marks.lockup.top), marks.lockup.width, marks.lockup.height],
    lockupBack: atRest - marks.lockup.width / 2,
  };
}
