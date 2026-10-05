/*
 * THE ASSEMBLY'S TIMING — one table for both ways it runs.
 *
 * Each part's stretch of an assembly, as fractions of the whole: the hub
 * registers, the four nodes register a beat apart, each connection reaches
 * from both ends and meets (clockwise from the top node, `k` = 0…3), and each
 * node is drawn toward the hub as its connection closes, then relaxes.
 *
 * On scroll, `NeogenMark` writes these as `--p0`/`--p1` on each part and
 * `NeogenMark.module.css` maps them onto the scroll or view range. On a
 * clock, `markMotion.ts` multiplies them by `ASSEMBLY_MS`. Change a number
 * here and both change.
 */

export type Phase = readonly [start: number, end: number];

export const ASSEMBLY = {
  hub: (): Phase => [0, 0.16],
  node: (k: number): Phase => [0.04 + 0.05 * k, 0.22 + 0.05 * k],
  reach: (k: number): Phase => [0.24 + 0.09 * k, 0.52 + 0.09 * k],
  tension: (k: number): Phase => [0.52 + 0.09 * k, 0.7 + 0.09 * k],
} as const;

/** The assembly on a clock (the add-to-bag confirmation). */
export const ASSEMBLY_MS = 1000;

/** How far a node is drawn toward the hub as its connection closes, in the artwork's units (485 tall). */
export const TENSION = 9;

/** A part registering (hub, node): fast out of nothing, settling. */
export const EASE_REGISTER = "cubic-bezier(.2,.7,.3,1)";
/** A connection reaching: gathers, then closes quickly. */
export const EASE_REACH = "cubic-bezier(.45,0,.2,1)";
/** A node drawn in by its connection, and let go. */
export const EASE_TENSION = "ease-in-out";
