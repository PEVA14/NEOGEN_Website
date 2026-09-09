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
 * FOUR MOMENTS IN ONE CAMERA MOVE — not four slides.
 *
 * Framing is driven by `scale` together with `offsetZ`. Translating the subject
 * toward the camera changes foreshortening exactly as a dolly does, so the
 * sequence gets real perspective change and controlled CROPPING without
 * mutating the camera object R3F owns.
 *
 * Apparent size is proportional to scale / (CAMERA_Z - offsetZ), which makes
 * the desktop progression roughly:
 *
 *   01 REVEAL     1.00x   whole silhouette, ~51% of frame height
 *   02 MATERIAL   2.19x   a deliberate detail: shoulder, neck, top of label
 *   03 COMPOSITION 1.37x  reframed, sharing the composition with the copy
 *   04 RESOLVE    1.02x   full silhouette again — the visual conclusion
 *
 * 02 was pulled back from 2.66x: at that distance the crop filled the frame
 * with reflection rather than with product, which is cinematically empty. The
 * goal is product photography, not maximum scale.
 *
 * The diagonal never resolves to vertical: `rotationZ` stays between roughly
 * -13 and -26 degrees throughout, so every state reads as a considered
 * attitude rather than an object standing up straight.
 */
const FULL: PoseTrack = {
  offsetX: [0.17, -0.05, 0.18, 0.03],
  // 02 sits LOW in frame on purpose: dropping the vial pushes the shoulder,
  // neck and the top of the label into the centre of the shot, which is the
  // deliberate detail that state is meant to frame.
  offsetY: [0.02, -0.15, 0.06, 0.0],
  offsetZ: [-0.25, 0.65, 0.15, -0.45],
  scale: [1.05, 1.8, 1.3, 1.12],
  rotationY: [-0.95, -0.35, 0.65, 1.25],
  rotationZ: [-0.34, -0.26, -0.44, -0.32],
  rotationX: [-0.1, 0.02, -0.13, -0.05],
  rimIntensity: [8, 10, 12, 7],
};

/*
 * COMPACT — its own composition, not a shrunken desktop one.
 *
 * The vial sits near centre and high so copy owns the lower half of a portrait
 * screen. Travel, crop and rotation are all reduced, for the same reason
 * `motion.css` lowers cinematic amplitude below 48rem: on a small screen, less
 * movement reads as more control. State 02 still crops, but far less severely —
 * a heavy crop on a narrow viewport loses the object entirely.
 */
const COMPACT: PoseTrack = {
  offsetX: [0.03, 0.0, 0.05, 0.0],
  offsetY: [0.15, 0.02, 0.16, 0.12],
  offsetZ: [-0.2, 0.35, 0.05, -0.4],
  scale: [0.9, 1.25, 1.0, 0.92],
  rotationY: [-0.6, -0.25, 0.5, 0.9],
  rotationZ: [-0.28, -0.22, -0.36, -0.27],
  rotationX: [-0.07, 0.02, -0.1, -0.04],
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
