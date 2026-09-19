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
/*
 * THE RETA SCENE — an arrival, driven by "through" progress.
 *
 * The section is scrolled INTO, not pinned (owner direction, 2026-09-18), so
 * progress runs 0 → 1 as the scene crosses the viewport and 0.5 is the scene
 * centred. Five stops:
 *
 *   0     entering   low, far, small, turned away and steeply tilted
 *   0.25  rising     coming up and round
 *   0.5   presented  centred, full size, label to the reader
 *   0.75  held       the same pose, so the reading moment is still
 *   1     leaving    easing back a little as the next section arrives
 *
 * The passive turn and the cursor's turntable are added on top of this.
 */
const FULL: PoseTrack = {
  offsetX: [0, 0, 0, 0, 0],
  // Presented slightly below centre, so the cap clears the title block.
  offsetY: [-0.4, -0.2, -0.09, -0.09, -0.04],
  offsetZ: [-1.4, -0.45, 0, 0, -0.25],
  // Apparent size is scale / (CAMERA_Z - offsetZ); 1.0 fills about half the
  // frame height, so 0.8 presents the vial at ~40% of the scene.
  scale: [0.48, 0.7, 0.8, 0.8, 0.75],
  rotationY: [-2.4, -1, 0, 0, 0.45],
  rotationZ: [-0.72, -0.45, -0.22, -0.22, -0.3],
  rotationX: [0.28, 0.1, -0.05, -0.05, -0.1],
  rimIntensity: [3, 9, 13, 12, 7],
};

/* Phones: the canvas is only the vial's own band, so the scales are larger. */
const COMPACT: PoseTrack = {
  offsetX: [0, 0, 0, 0, 0],
  offsetY: [-0.3, -0.1, 0, 0, 0.04],
  offsetZ: [-1.2, -0.4, 0, 0, -0.2],
  scale: [0.9, 1.25, 1.45, 1.45, 1.35],
  rotationY: [-2.2, -0.9, 0, 0, 0.4],
  rotationZ: [-0.6, -0.4, -0.2, -0.2, -0.26],
  rotationX: [0.24, 0.08, -0.04, -0.04, -0.08],
  rimIntensity: [3, 9, 13, 12, 7],
};

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
 * The resolved frame per variant. The RETA scene's strongest pose is its
 * middle — presented, facing the reader — so reduced motion holds that.
 */
export function restingProgress(variant: StageVariant): number {
  return variant === "sequence" ? 0.5 : RESTING_PROGRESS;
}

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
