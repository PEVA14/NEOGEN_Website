import type { CSSProperties } from "react";

import type { WorldId } from "@/config/worlds";

import styles from "./SectionSeam.module.css";

/**
 * THE SEAM BETWEEN TWO GROUNDS (UX pass, 2026-10-07: "transitions between
 * sections … don't feel abrupt or disconnected").
 *
 * The homepage alternates Quiet paper and Impact worlds, and where a world
 * gave way to paper the boundary was a cut: a near-black ground met the paper
 * on one pixel. A seam sits on that boundary and lets the world's ground
 * reach a little way into the section arriving — a gradient of its own
 * colour over the new section's top — then lift as the boundary rises up the
 * window, so by the time the new section is being read it stands exactly as
 * designed. The impact releases into the quiet instead of being spliced off:
 * continuity, not an entrance (CONVENTIONS §20.1).
 *
 * Only out of a world. The way into one keeps its clean edge and accent rule
 * (settled, DEFERRED_POLISH); tried the other way, a paper veil over a dark
 * world read as fog.
 *
 * WITHIN THE MOTION CONTRACT. Caused by the reader's own scroll position
 * (a CSS view timeline, like RETA's arrival), opacity only, no reflow, no
 * loop, nothing waiting at `opacity: 0` — the veil starts visible and only
 * ever lifts. Cinematic tier: under reduced motion, or where scroll
 * timelines do not exist, there is no veil and the boundary is the clean
 * edge it always was.
 *
 * `ground` is a CSS colour: a token, or a variable `world` resolves on the
 * seam itself (`--world-void`).
 */
export function SectionSeam({
  ground,
  world,
}: {
  ground: string;
  /** Resolves `--world-void` and the world's other tints on the seam. */
  world?: WorldId;
}) {
  return (
    <div
      className={styles.seam}
      style={{ "--seam-ground": ground } as CSSProperties}
      data-world-tint={world}
      data-motion="cinematic"
      aria-hidden="true"
    />
  );
}
