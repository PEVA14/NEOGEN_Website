"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * `through` — 0 when the element's top enters the bottom of the viewport,
 *             1 when its bottom leaves the top. For elements that pass by.
 *
 * `pinned`  — 0 when a tall track's top reaches the top of the viewport,
 *             1 when its bottom does. This is the progress of a `position:
 *             sticky` composition through its own scroll distance, and it is
 *             what drives the RETA choreography.
 *
 * `exit`    — 0 while the element's top is at the top of the viewport, 1 once
 *             it has scrolled fully past. For an element that starts in view at
 *             page load: `through` would begin at 0.5 there and waste half its
 *             range before the user has scrolled at all.
 */
export type ProgressMode = "through" | "pinned" | "exit";

interface Options {
  mode?: ProgressMode;
  /**
   * Called after every measurement with the new progress.
   *
   * Exists so a consumer can derive coarse state (which copy beat is active)
   * WITHOUT a second scroll listener. Kept in a ref internally, so passing an
   * inline function does not re-subscribe on every render.
   */
  onSample?: (progress: number) => void;
}

/**
 * Scroll progress of an element, as a 0→1 ref.
 *
 * Returns a REF, not state, on purpose: the 3D layer reads it inside
 * `useFrame`, so driving it through React state would re-render a Canvas
 * subtree every scroll frame for no benefit.
 *
 * Cheap by construction: one passive scroll listener, coalesced into a single
 * rAF, and an IntersectionObserver so nothing is measured off-screen.
 */
export function useSectionProgress(
  target: RefObject<HTMLElement | null>,
  { mode = "through", onSample }: Options = {},
): RefObject<number> {
  const progress = useRef(0);
  const sampleRef = useRef(onSample);

  // Assigned in an effect, not during render: writing to a ref while rendering
  // is what `react-hooks/refs` forbids. One frame of staleness is irrelevant
  // for a scroll callback.
  useEffect(() => {
    sampleRef.current = onSample;
  }, [onSample]);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    let frame = 0;
    let visible = false;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 1;

      let value: number;
      if (mode === "pinned") {
        // Distance the track can scroll while its sticky child stays pinned.
        const distance = rect.height - viewport;
        value = distance <= 0 ? 0 : -rect.top / distance;
      } else if (mode === "exit") {
        value = rect.height <= 0 ? 0 : -rect.top / rect.height;
      } else {
        const total = rect.height + viewport;
        value = total <= 0 ? 0 : (viewport - rect.top) / total;
      }

      progress.current = Math.min(1, Math.max(0, value));
      sampleRef.current?.(progress.current);
    };

    const schedule = () => {
      if (!visible || frame) return;
      frame = requestAnimationFrame(measure);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        // Measure on the way in and on the way out, so the value is correct at
        // the boundaries even though we stop tracking off-screen.
        measure();
      },
      { threshold: 0 },
    );

    observer.observe(el);
    measure();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, mode]);

  return progress;
}
