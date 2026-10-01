/**
 * THE PRODUCT PAGE'S LIVE BOX: the media frame, grown by this fraction of its
 * own width and height on every side. The flagship's canvas fills it, with the
 * vial at its centre — so the camera always looks straight at the vial, and
 * every screen sees it through the same lens, only larger or smaller.
 *
 * The flagship's stand-in is a photograph of exactly this box
 * (`scripts/capture-specimen.mjs --stage`); `check:media` fails if the margin
 * changes without re-photographing it.
 */
export const LIVE_FRAME_MARGIN = 0.2;
