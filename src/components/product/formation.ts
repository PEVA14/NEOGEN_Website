"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

import type { WorldFormation } from "@/config/worlds";
import { incomingSpecimen, isIncoming } from "@/components/vial-transition/incoming";

/**
 * THE WORLD COMES OUT OF THE PRODUCT — the product page's side of it.
 *
 * The vial transition (`components/vial-transition`) carries the specimen from
 * the catalogue into the media frame. This is what the world does about it:
 * on RETA, a `calibration` — the store's light goes out, the world's cold light
 * travels with the specimen, and every line of the instrument is projected
 * outward from the specimen's axes as it lands (ProductStage.module.css,
 * "Formation"). One sequence, one clock: everything below is timed from the
 * moment the new page is committed, which is the moment the flight begins.
 *
 * Two arrivals, decided once per mount:
 *
 *   specimen  a catalogue card sent it (`isIncoming`). The light starts on the
 *             card and travels with the vial; the geometry deploys as it lands.
 *   direct    anything else — a typed URL, a reload, any other link, the back
 *             button. Nothing travelled, so nothing pretends to: the specimen
 *             is already standing there and only the instrument wakes around
 *             it, shorter. Server-rendered this way, so it plays from the
 *             first paint without waiting for JavaScript.
 *
 * Everything that moves is CSS on `transform` and `opacity`, so the compositor
 * runs it; nothing is written per frame from here (V2 notes, trap 7).
 */
export type Arrival = "specimen" | "direct";

/**
 * The light's size while it is held round the vial: the radius of its ellipse
 * as a multiple of the vial's height (on the card; in the frame, whose height
 * is the vial's ÷ 0.66). It fades out at 65% of that radius.
 */
const HELD_RADIUS = 1.0;
const LANDED_RADIUS = 0.85;

/** The atmosphere's ellipse at rest, as fractions of the stage (worlds.css). */
const REST_RX = 1.2;
const REST_RY = 0.9;

/** If the formation's last animation is never seen to end, stop waiting. */
const FORMING_LIMIT_MS = 2600;

export function useFormation(
  slug: string,
  formation: WorldFormation | null,
  stage: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
) {
  const [arrival] = useState<Arrival>(() =>
    formation && isIncoming(slug) ? "specimen" : "direct",
  );
  /*
   * While a specimen's world forms, the 3D stays unmounted: the canvas boot is
   * ~240ms of main thread (CONVENTIONS §11, rule 2) and belongs after the
   * world has formed, not inside it. The stand-in — the live vial's own first
   * frame — holds the object meanwhile, so all this changes is WHEN the vial
   * starts to turn: once the instrument around it is complete.
   */
  const [forming, setForming] = useState(arrival === "specimen");

  useEffect(() => {
    if (!forming) return;
    const timer = window.setTimeout(() => setForming(false), FORMING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [forming]);

  /** `onAnimationEnd` on the world's light, whose animation is the longest. */
  const onFormed = useCallback(() => setForming(false), []);

  /*
   * WHERE THE LIGHT STARTS. Measured once, before the new page is captured:
   * the vial on the card it left, and the frame it lands in, in the stage's own
   * box as it will be once the navigation has scrolled to the top (the card
   * is drawn where it was on screen; the stage, at its document position).
   * Written as custom properties on the stage for the keyframes to read.
   */
  useLayoutEffect(() => {
    const node = stage.current;
    if (arrival !== "specimen" || !node) return;
    const origin = incomingSpecimen(slug);
    const box = node.getBoundingClientRect();
    const land = panel.current?.getBoundingClientRect();
    if (!origin || !land || box.width === 0) return;

    const top = box.top + window.scrollY;
    const left = box.left + window.scrollX;
    // The light's own centre is the stage's top centre (where it rests), so
    // every position is an offset from there.
    const restX = box.width / 2;
    const at = (x: number, y: number) => [x - left - restX, y - top] as const;
    const [x0, y0] = at(origin.x + origin.width / 2, origin.y + origin.height / 2);
    const [x1, y1] = at(
      land.left + window.scrollX + land.width / 2,
      land.top + window.scrollY + land.height / 2,
    );

    /*
     * Scaled per axis, so that while it is held the light is ROUND round the
     * vial. The ellipse at rest is the stage's own proportion — wide on a
     * laptop, tall on a phone — and scaled evenly it pinched into a flat bar
     * or a narrow column there; it only takes the stage's shape as it rises.
     */
    const r0 = origin.height * HELD_RADIUS;
    const r1 = land.height * LANDED_RADIUS;
    const sx = (r: number) => r / (box.width * REST_RX);
    const sy = (r: number) => r / (box.height * REST_RY);

    const values = { x0, y0, x1, y1 };
    for (const [key, value] of Object.entries(values)) {
      node.style.setProperty(`--wf-${key}`, `${value.toFixed(1)}px`);
    }
    const scales = { s0x: sx(r0), s0y: sy(r0), s1x: sx(r1), s1y: sy(r1) };
    for (const [key, value] of Object.entries(scales)) {
      node.style.setProperty(`--wf-${key}`, value.toFixed(4));
    }
  }, [arrival, slug, stage, panel]);

  /*
   * The page's own type waits for the dark. The view transition's pseudo-
   * elements hang off <html>, so this is where the flight's stylesheet can
   * hear that a world is forming (vial-transition.css): otherwise the product
   * page's name and price fade in over the catalogue while its light is still
   * going out — two pages at once.
   */
  useLayoutEffect(() => {
    if (arrival !== "specimen") return;
    const root = document.documentElement;
    root.setAttribute("data-world-forming", "");
    const done = () => root.removeAttribute("data-world-forming");
    const timer = window.setTimeout(done, 1500);
    return () => {
      window.clearTimeout(timer);
      done();
    };
  }, [arrival]);

  return { arrival, forming, onFormed };
}
