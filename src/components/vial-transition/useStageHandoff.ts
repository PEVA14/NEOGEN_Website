"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

import { incomingOrigin, isIncoming } from "./incoming";

/** If no flight is observed after all, stop holding the 3D anyway. */
const HOLD_LIMIT_MS = 1400;

interface PseudoElementHandle {
  getAnimations(): Animation[];
}

/**
 * THE PRODUCT PAGE'S SIDE OF THE HANDOFF — three phases.
 *
 *   flight   the specimen is travelling (a view transition). The 3D layer is
 *            NOT mounted: its boot would land in the middle of the animation.
 *   settled  the flight has landed and the page is still. The canvas mounts
 *            now, behind the specimen, which stands in for it — the ~240ms boot
 *            happens while the user looks at a finished picture.
 *   live     the canvas has drawn. The specimen dissolves into the live object.
 *
 * Without a card click there is no flight: the page starts `settled`, exactly
 * as it always did, and the specimen is the loading stand-in.
 */
export function useStageHandoff(slug: string) {
  const [holding, setHolding] = useState(() => isIncoming(slug));
  const [live, setLive] = useState(false);

  // A backstop: the mark was set but no transition paired (the destination
  // suspended into a fallback, the card was off-screen, the browser declined).
  useEffect(() => {
    if (!holding) return;
    const timer = window.setTimeout(() => setHolding(false), HOLD_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [holding]);

  /**
   * `onShare` on the product page's specimen: the flight has begun. Release
   * the hold when the group's own animations finish — the real landing, not a
   * duration copied from the stylesheet.
   */
  const onShare = useCallback((instance: unknown) => {
    const group = (instance as { group?: PseudoElementHandle }).group;
    const animations = group?.getAnimations() ?? [];
    if (animations.length === 0) {
      setHolding(false);
      return;
    }
    void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() =>
      setHolding(false),
    );
  }, []);

  const onFirstFrame = useCallback(() => setLive(true), []);

  return { holding, live, onShare, onFirstFrame };
}

const VARS = ["x0", "y0", "r0", "x1", "y1", "r1"] as const;

/**
 * WHERE THE WORLD GROWS FROM. A circle that opens on the card the specimen left
 * and drifts to where it lands, covering the stage — measured, then handed to
 * the browser as custom properties the view-transition keyframes read. Nothing
 * is written per frame (trap 7): these are set once, before the new state is
 * captured, and removed after.
 *
 * Positions are in the stage's own box, as it will be once the navigation has
 * scrolled to the top — a layout effect can run before that scroll, so the
 * current scroll offset is added back rather than trusted.
 */
export function useWorldOrigin(
  slug: string,
  enabled: boolean,
  stage: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const origin = incomingOrigin(slug);
    const box = stage.current?.getBoundingClientRect();
    const land = panel.current?.getBoundingClientRect();
    if (!origin || !box || !land) return;

    const top = box.top + window.scrollY;
    const left = box.left + window.scrollX;
    const x0 = origin.x + origin.width / 2 - left;
    // The card is drawn where it was on screen (the old state is a snapshot of
    // the viewport); the stage will be at its document position, scrolled to 0.
    const y0 = origin.y + origin.height / 2 - top;
    const x1 = land.left + window.scrollX + land.width / 2 - left;
    const y1 = land.top + window.scrollY + land.height / 2 - top;
    // Starts INSIDE the card's stage (which is dark), so its first frames are
    // invisible and the world is seen to grow out of the card, not appear on it.
    const r0 = Math.min(origin.width, origin.height) * 0.3;
    const r1 = Math.max(
      Math.hypot(x1, y1),
      Math.hypot(box.width - x1, y1),
      Math.hypot(x1, box.height - y1),
      Math.hypot(box.width - x1, box.height - y1),
    );

    const root = document.documentElement.style;
    const values = { x0, y0, r0, x1, y1, r1 };
    for (const key of VARS) root.setProperty(`--vt-world-${key}`, `${values[key].toFixed(1)}px`);
    // Not cancelled on cleanup: the effect re-runs when the hold ends, and the
    // properties must still be removed then.
    window.setTimeout(() => {
      for (const key of VARS) root.removeProperty(`--vt-world-${key}`);
    }, 2500);
  }, [slug, enabled, stage, panel]);
}
