"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero's scroll cue line. The loop only means something while it can be
 * seen, but an infinite CSS animation keeps Chrome re-layerizing and committing
 * every frame wherever the reader is — measured at the footer, it was the whole
 * idle main-thread cost of the homepage. So the line watches itself and pauses
 * its loop once it leaves the viewport (`data-offscreen`, Hero.module.css).
 *
 * Reduced motion is untouched: the animation is never declared there, and
 * `motion.css` removes `data-motion="decorative"` outright.
 */
export function ScrollCueLine({ className }: { className: string }) {
  const line = useRef<HTMLSpanElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const node = line.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={line}
      className={className}
      data-motion="decorative"
      data-offscreen={offscreen ? "" : undefined}
      aria-hidden="true"
    />
  );
}
