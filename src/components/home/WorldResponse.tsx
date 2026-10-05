"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/reducedMotion";

/**
 * TRES MUNDOS, EACH BEHAVING LIKE ITSELF — a foretaste, not the payoff.
 *
 * The three flagship panels share one small engine and three different
 * physics (WorldBand.module.css):
 *
 *   RETA     calibration — when engaged, registration brackets close in on
 *            the vial and lock onto its silhouette, and one inspection line
 *            passes down it. Precise; the world it opens is an instrument.
 *   GLOW     illumination — a light comes up BEHIND the vial and separates
 *            it from its ground, leaning toward the pointer. The world it
 *            opens is lit by its object.
 *   GHK-Cu   material — the panel takes the pointer's weight: the plate
 *            tilts a few degrees in depth, the vial standing proud of it, and
 *            a copper sheen crosses the ground with the light. The world it
 *            opens is a surface that responds.
 *
 * What engages a panel: a fine pointer over it or keyboard focus in it; on
 * a phone, the panel settling in the middle of the swipe shelf — the swipe
 * is the gesture, so each world answers once as it arrives. Nothing plays on
 * its own. This writes `data-engaged` and the pointer's position (`--px`,
 * `--py`, −1…1) on the panel; the CSS does the rest. Reduced motion: no
 * engagement at all — the panels are the stills they were.
 */
export function WorldResponse({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    if (prefersReducedMotion()) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const panels = [...node.querySelectorAll<HTMLElement>("[data-world-panel]")];

    const engage = (panel: HTMLElement, on: boolean) => {
      if (on) panel.setAttribute("data-engaged", "");
      else {
        panel.removeAttribute("data-engaged");
        panel.style.setProperty("--px", "0");
        panel.style.setProperty("--py", "0");
      }
    };
    /*
     * One measurement per hover, one write per frame (owner, 2026-10-04:
     * scrolling lagged). Reading the card's box on every pointer move, right
     * after writing its pointer variables, forced a layout each time; now the
     * box is read when the pointer enters (and again after the page scrolls),
     * and the variables are written at most once a frame.
     */
    let box: { panel: HTMLElement; rect: DOMRect } | null = null;
    let pending: { panel: HTMLElement; x: number; y: number } | null = null;
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!pending) return;
      const { panel, x, y } = pending;
      pending = null;
      if (!box || box.panel !== panel) box = { panel, rect: panel.getBoundingClientRect() };
      const r = box.rect;
      panel.style.setProperty("--px", (((x - r.left) / r.width) * 2 - 1).toFixed(3));
      panel.style.setProperty("--py", (((y - r.top) / r.height) * 2 - 1).toFixed(3));
      if (!panel.hasAttribute("data-engaged")) engage(panel, true);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !fine.matches) return;
      pending = { panel: event.currentTarget as HTMLElement, x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const forget = () => {
      box = null;
    };
    window.addEventListener("scroll", forget, { passive: true });
    const leave = (event: PointerEvent) => {
      pending = null;
      box = null;
      engage(event.currentTarget as HTMLElement, false);
    };
    const focusIn = (event: FocusEvent) => engage(event.currentTarget as HTMLElement, true);
    const focusOut = (event: FocusEvent) => engage(event.currentTarget as HTMLElement, false);

    for (const panel of panels) {
      panel.addEventListener("pointermove", move);
      panel.addEventListener("pointerleave", leave);
      panel.addEventListener("focusin", focusIn);
      panel.addEventListener("focusout", focusOut);
    }

    /* A phone: the panel that settles in the shelf answers. */
    let observer: IntersectionObserver | null = null;
    const shelf = node.querySelector<HTMLElement>("[data-world-shelf]");
    if (!fine.matches && shelf && shelf.scrollWidth > shelf.clientWidth + 8) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const panel = entry.target as HTMLElement;
            engage(panel, entry.intersectionRatio > 0.85);
          }
        },
        { root: shelf, threshold: [0, 0.85, 1] },
      );
      for (const panel of panels) observer.observe(panel);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", forget);
      observer?.disconnect();
      for (const panel of panels) {
        panel.removeEventListener("pointermove", move);
        panel.removeEventListener("pointerleave", leave);
        panel.removeEventListener("focusin", focusIn);
        panel.removeEventListener("focusout", focusOut);
      }
    };
  }, []);

  return (
    <div ref={root} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
