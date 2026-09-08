"use client";

import { useEffect } from "react";

/**
 * Inverts the sticky header when it sits over an Experience Mode section.
 *
 * The header is Quiet Mode — paper, dark ink — but the homepage runs it across
 * full-viewport dark worlds. Leaving it light there puts a bright bar across a
 * cinematic composition and drops its contrast to near nothing.
 *
 * Implemented as a tiny island rather than by making the whole header a client
 * component: the nav, wordmark and bag stay server-rendered, and this only
 * toggles one attribute. It renders no markup of its own.
 *
 * CONVENTIONS §5 keeps layout in CSS with no JS breakpoint logic — this is not
 * layout, it is "what is currently behind a fixed element", which CSS has no
 * way to ask.
 */
export function HeaderSurfaceSync() {
  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;

    const darkSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-surface='dark']"),
    );
    if (darkSections.length === 0) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const band = header.getBoundingClientRect();
      // Test the header's own band, not the viewport: what matters is the
      // surface directly beneath the bar.
      const over = darkSections.some((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top < band.bottom && rect.bottom > band.top;
      });
      header.dataset.surface = over ? "dark" : "light";
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      // Leave the header in its Quiet default if this ever unmounts.
      header.dataset.surface = "light";
    };
  }, []);

  return null;
}
