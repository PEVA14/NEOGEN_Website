import type { StageTier } from "@/hooks/useStageTier";

/**
 * Scroll choreography for the RETA experience.
 *
 * All movement is expressed as keyframe STOPS sampled by a 0→1 scroll
 * progress. Keeping the whole sequence as data means the choreography can be
 * read and re-timed in one place, and a second world can define its own stops
 * without touching the render code.
 *
 * Segments are eased, not linear, so the vial arrives at each beat rather than
 * snapping between them — "controlled and precise", not mechanical.
 */

/** Smoothstep. Eases both ends of a segment. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Samples a keyframe track. `stops` are distributed evenly across 0→1, so
 * three stops means two eased segments meeting at progress 0.5.
 */
export function sampleTrack(progress: number, stops: readonly number[]): number {
  if (stops.length === 0) return 0;
  if (stops.length === 1) return stops[0];

  const clamped = Math.min(1, Math.max(0, progress));
  const segments = stops.length - 1;
  const scaled = clamped * segments;
  const index = Math.min(Math.floor(scaled), segments - 1);
  const t = ease(scaled - index);

  return stops[index] + (stops[index + 1] - stops[index]) * t;
}

/**
 * The pose track for one tier.
 *
 * `offsetX` / `offsetY` are FRACTIONS OF THE VIEWPORT, resolved against R3F's
 * world-space viewport at render time. That is what keeps the vial anchored to
 * the same place in the composition on a 13" laptop and a 32" display, instead
 * of drifting because the world units no longer match the frame.
 */
export interface PoseTrack {
  /** Fraction of viewport width from centre. Positive = right. */
  offsetX: readonly number[];
  /** Fraction of viewport height from centre. Positive = up. */
  offsetY: readonly number[];
  /** Depth, in world units. Negative pushes the vial away from the camera. */
  offsetZ: readonly number[];
  /** Uniform scale. Drives how much of the frame height the vial commands. */
  scale: readonly number[];
  /** Y spin — the main scroll-driven rotation, in radians. */
  rotationY: readonly number[];
  /** The diagonal lean, in radians. Negative rests the cap toward the right. */
  rotationZ: readonly number[];
  /** Forward/back tilt, in radians. Sells dimensionality. */
  rotationX: readonly number[];
  /** Accent rim intensity across the sequence. Restrained evolution only. */
  rimIntensity: readonly number[];
}

/*
 * THE SPECIMEN ON A TURNTABLE — one held pose, not four camera moves.
 *
 * This track used to travel: a reveal, a hard crop into the shoulder and neck,
 * a reframe, a resolve. It was built as cinema, and as cinema it worked — but
 * the section's intent was always a SMALL object held in the middle of the
 * frame, turning, and answerable to the cursor.
 *
 * Those two are mutually exclusive. An object that travels and crops cannot
 * also be a thing you turn: the scroll keeps pulling it out from under the
 * pointer, and the cursor is left arguing with the choreography for control of
 * the same axis. So the pose is now CONSTANT — centred, small, diagonal — and
 * every stop below holds the same value.
 *
 * What scroll still drives: the copy beats, and the rim breathing across the
 * sequence. What the pointer drives: rotation, in `VialModel`.
 *
 * The diagonal never resolves to vertical: `rotationZ` holds ~-15 degrees, so
 * the object reads as a considered attitude rather than standing up straight.
 */
const FULL: PoseTrack = {
  offsetX: [0, 0, 0, 0],
  offsetY: [0, 0, 0, 0],
  offsetZ: [0, 0, 0, 0],
  // Apparent size is scale / (CAMERA_Z - offsetZ). At this distance 1.0 filled
  // roughly half the frame height; this lands near a third of it, which is the
  // proportion the figma frames the vial at — an object inside the
  // composition rather than the composition itself.
  scale: [0.66, 0.66, 0.66, 0.66],
  // The base attitude only. The passive turn and the cursor's accumulated
  // travel are added on top of this, per frame.
  rotationY: [0, 0, 0, 0],
  rotationZ: [-0.26, -0.26, -0.26, -0.26],
  rotationX: [-0.05, -0.05, -0.05, -0.05],
  rimIntensity: [8, 10, 12, 7],
};

/*
 * COMPACT — the same turntable, composed for a portrait frame.
 *
 * Lifted above centre because the copy owns the lower half of a phone screen,
 * and smaller again: the same world scale reads much larger in a narrow frame.
 * There is no pointer here — `useFinePointer` is false on touch — so the
 * passive turn is the whole of the motion, which is also why it never needs to
 * compete with a cursor for the same axis.
 */
const COMPACT: PoseTrack = {
  offsetX: [0, 0, 0, 0],
  offsetY: [0.12, 0.12, 0.12, 0.12],
  offsetZ: [0, 0, 0, 0],
  scale: [0.52, 0.52, 0.52, 0.52],
  rotationY: [0, 0, 0, 0],
  rotationZ: [-0.24, -0.24, -0.24, -0.24],
  rotationX: [-0.04, -0.04, -0.04, -0.04],
  rimIntensity: [8, 10, 12, 7],
};

/*
 * HERO — the brand's first beat, deliberately QUIETER than the RETA sequence.
 *
 * Two stops, one slow arc, no crop-and-return: the homepage must not open on
 * its own climax. The vial is large and tilted enough to be the composition's
 * anchor and to overlap the wordmark, but it resolves rather than performs.
 * The deep four-state choreography belongs to RETA, further down.
 */
const HERO_FULL: PoseTrack = {
  // Right of centre, so the wordmark's opening letters stay legible and the
  // vial crosses its second half rather than burying the whole mark.
  offsetX: [0.19, 0.24],
  offsetY: [0.0, 0.05],
  offsetZ: [0.0, -0.2],
  // ~59% of frame height: dominant, but the silhouette still reads whole.
  scale: [1.15, 1.06],
  rotationY: [-0.55, -0.22],
  rotationZ: [-0.3, -0.37],
  rotationX: [-0.06, -0.11],
  rimIntensity: [9, 11],
};

const HERO_COMPACT: PoseTrack = {
  offsetX: [0.02, 0.05],
  offsetY: [0.1, 0.14],
  offsetZ: [-0.25, -0.45],
  // Roughly half the desktop presence. A portrait frame is narrow, so the same
  // world scale reads far larger there — the vial was filling ~80% of the
  // width and leaving no room for the wordmark or the copy.
  scale: [0.7, 0.64],
  rotationY: [-0.4, -0.15],
  rotationZ: [-0.26, -0.32],
  rotationX: [-0.05, -0.08],
  rimIntensity: [9, 11],
};

/*
 * PRESENTER — the PDP.
 *
 * Not a sequence. The product page opens on a composition that is already
 * resolved, so there is nothing to choreograph: one held attitude, and the
 * object's position and size come entirely from the MEASURED media well via the
 * anchor. That is why every offset here is zero and the scale is 1 — they are
 * the values the anchor overrides, kept only so the pose is well-defined for a
 * frame rendered before the first measurement lands.
 *
 * Movement on this page is continuous slow rotation plus an optional pointer
 * response, both applied in `VialModel`. A museum display, not a sequence:
 * the vial turns because objects on a turntable turn, not because the page is
 * telling a story.
 */
const PRESENTER: PoseTrack = {
  offsetX: [0],
  offsetY: [0],
  offsetZ: [0],
  scale: [1],
  // The base attitude. Rotation about Y is accumulated on top of this.
  rotationY: [0],
  // The diagonal is preserved — the vial is never stood up straight.
  rotationZ: [-0.26],
  rotationX: [-0.045],
  // Steady. The rim no longer "recedes as Quiet Mode arrives", because the
  // opening composition stays inside the RETA world now.
  rimIntensity: [7],
};

/** Which choreography a stage plays. */
export type StageVariant = "hero" | "sequence" | "presenter";

export function poseTrack(tier: StageTier, variant: StageVariant = "sequence"): PoseTrack {
  if (variant === "hero") return tier === "compact" ? HERO_COMPACT : HERO_FULL;
  if (variant === "presenter") return PRESENTER;
  return tier === "compact" ? COMPACT : FULL;
}

/**
 * The resolved frame for reduced motion.
 *
 * Sits just inside the REVEAL state: the whole vial, diagonal, uncropped, label
 * readable. Deliberately NOT the MATERIAL close-up — a heavy crop is a poor
 * static frame for someone who will never scroll it into context. Reduced
 * motion removes the movement, never the product.
 */
export const RESTING_PROGRESS = 0.05;

/**
 * Camera distance. Fixed, with framing driven by the vial's own scale track.
 *
 * Moving the model rather than the camera keeps perspective character constant
 * through the sequence, and avoids mutating the camera object R3F owns.
 */
export const CAMERA_Z = 3.9;

/** Where the backdrop plane sits behind the subject, in world units. */
export const BACKDROP_Z = -2.4;

/** Idle amplitudes. Presence, not bobbing. */
export const IDLE_ROTATION = 0.035;
export const IDLE_FLOAT = 0.008;
