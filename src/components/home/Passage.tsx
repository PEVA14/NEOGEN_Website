import type { ReactNode } from "react";

import type { WorldId } from "@/config/worlds";

import styles from "./Passage.module.css";

/**
 * A PLACE ON THE HOMEPAGE (owner, 2026-10-07: "a nice effect that feels like
 * we are travelling to another section, not just scrolling down through
 * different blocky components").
 *
 * The homepage's sections are layers. How a place is LEFT is chosen per
 * boundary (`leave`), so the journey has a rhythm rather than one effect
 * repeated:
 *
 *   travel  it falls behind — lags the scroll and sinks into shade — while
 *           the next place, painted above it, travels up over it
 *   dusk    it stays where it is and only dims as the next place arrives
 *   stay    nothing: the next place simply follows (the default)
 *
 * And a flagship ARRIVES in its own character (`arrive`; owner: "make the
 * transitions into the flagships more unique to each … GLOW could be a little
 * dim while going into it just to then BRIGHTEN up"):
 *
 *   reta    precision — a hairline in RETA's blue opens from the centre
 *           across its edge, its two end ticks travelling out like a
 *           caliper's jaws, as the world rises in
 *   glow    light — the world arrives dark and brightens to full as it fills
 *           the window, with a warm bloom at the moment it does
 *   ghk-cu  material — a burnished highlight sweeps across the plate as it
 *           rises, as light runs over metal
 *
 * Driven by the reader's own scroll (a CSS view timeline on the passage),
 * transform and opacity only, no loop. TRANSLATION ONLY, NEVER A SCALE on the
 * passage itself: the shared 3D canvas measures its stage's box, and a
 * changing size made it redraw from nothing. Cinematic tier: under reduced
 * motion, or where scroll timelines do not exist, the places simply follow one
 * another, every world fully lit.
 *
 * Every section after the hero is in a passage, whether or not it leaves with
 * an effect: positioned, each paints above the one before, which is what lets
 * a `travel` slide beneath its successor. A place left by `travel` is followed
 * by one that paints its own ground.
 */
export function Passage({
  children,
  leave = "stay",
  arrive,
}: {
  children: ReactNode;
  leave?: "travel" | "dusk" | "stay";
  arrive?: WorldId;
}) {
  return (
    <div
      className={styles.passage}
      data-leave={leave}
      data-arrive={arrive}
      data-world-tint={arrive}
      data-motion="cinematic"
    >
      {children}
    </div>
  );
}
