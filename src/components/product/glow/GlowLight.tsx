"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

import { incomingSpecimen } from "@/components/vial-transition/incoming";

import { useArrival, type Arrival } from "../arrival";
import styles from "./glow.module.css";

/**
 * GLOW — "the environment becomes light" (flagship idea #5).
 *
 * RETA's world is an instrument that forms around its specimen and reads it.
 * GLOW's is lit BY its specimen: the vial is the only light in the room. What
 * can be seen is what its light reaches — the surfaces, the name across the
 * field, the page's own type.
 *
 *   illuminate   arriving from a card, the vial carries its light out of the
 *                catalogue; the page is revealed only where that light falls,
 *                and when it lands the light opens into the room
 *   rest         the vial stands in a halo of its own light; the page is quiet
 *
 * Everything is measured off the real page (where the vial stands), so it
 * holds on any screen.
 */

/** If the arrival's light is never seen to finish, stop holding the 3D. */
const FORMING_LIMIT_MS = 2600;

/**
 * THE ARRIVAL — measured once, before the new page is captured: the vial on
 * the card it left (after a card tap) and the vial in its frame, both in the
 * stage's own box. Written as custom properties for the keyframes.
 */
export function useGlowArrival(
  slug: string,
  enabled: boolean,
  stage: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
): { arrival: Arrival; forming: boolean; exposing: boolean; onFormed: () => void } {
  const arrival = useArrival(slug, enabled);
  /* The canvas waits for the light: its boot is main-thread work, and the
     arrival's reveal is painted. The stand-in holds the vial meanwhile. */
  const [forming, setForming] = useState(enabled && arrival === "specimen");
  /* The page is revealed by the light until its arrival has played. */
  const [exposing, setExposing] = useState(enabled);

  useEffect(() => {
    if (!forming) return;
    const timer = window.setTimeout(() => setForming(false), FORMING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [forming]);

  useLayoutEffect(() => {
    const node = stage.current;
    const frame = panel.current;
    if (!enabled || !node || !frame) return;
    const measure = () => {
      const box = node.getBoundingClientRect();
      const land = frame.getBoundingClientRect();
      const x1 = land.left + land.width / 2 - box.left;
      const y1 = land.top + land.height / 2 - box.top;
      node.style.setProperty("--glow-x1", `${x1.toFixed(1)}px`);
      node.style.setProperty("--glow-y1", `${y1.toFixed(1)}px`);
      // The vial's foot, where its light falls on the floor.
      node.style.setProperty("--glow-floor", `${(y1 + land.height * 0.34).toFixed(1)}px`);
      node.style.setProperty("--glow-frame", `${land.height.toFixed(1)}px`);
    };
    measure();

    if (arrival === "specimen") {
      const origin = incomingSpecimen(slug);
      const box = node.getBoundingClientRect();
      const root = document.documentElement;
      const top = box.top + window.scrollY;
      const left = box.left + window.scrollX;
      const land = frame.getBoundingClientRect();
      // The card is drawn where it was on screen; the stage, at its
      // document position once the navigation has scrolled to the top.
      const at = {
        x0: origin ? origin.x + origin.width / 2 - left : null,
        y0: origin ? origin.y + origin.height / 2 - top : null,
        x1: land.left + window.scrollX + land.width / 2 - left,
        y1: land.top + window.scrollY + land.height / 2 - top,
      };
      for (const [k, v] of Object.entries(at)) {
        if (v !== null) node.style.setProperty(`--glow-${k}`, `${v.toFixed(1)}px`);
      }
      // The page's own type waits for the light, not for the page's fade,
      // and the store dims warm (vial-transition.css).
      root.setAttribute("data-world-lit", "");
      const done = () => root.removeAttribute("data-world-lit");
      const timer = window.setTimeout(done, 1500);
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => {
        window.clearTimeout(timer);
        done();
        observer.disconnect();
      };
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, arrival, slug, stage, panel]);

  const onFormed = useCallback(() => {
    setForming(false);
    setExposing(false);
  }, []);
  return { arrival, forming, exposing, onFormed };
}

/** The lamp: GLOW's light, centred on the vial — the world's atmosphere. */
export function GlowLamp({ onFormed }: { onFormed: () => void }) {
  return (
    <>
      <span className={styles.lamp} data-motion="cinematic" onAnimationEnd={onFormed} />
      {/* Close behind the vial, where it stands: its own light, at rest. */}
      <span className={styles.halo} data-motion="cinematic" />
      {/* The same light, close round the vial while it is carried. */}
      <span className={styles.carried} data-motion="cinematic" />
      <span className={styles.floor} data-motion="cinematic" />
    </>
  );
}
