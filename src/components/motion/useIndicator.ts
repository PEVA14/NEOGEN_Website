"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * ONE MARK THAT TRAVELS TO WHAT IS SELECTED — instead of every option
 * switching its own fill on and off.
 *
 * Motion's shared-layout `layoutId` idea (the selected pill that slides
 * between tabs), done with a measured box and a CSS transition: the hook
 * writes the selected element's box into four custom properties on the
 * indicator (`--x`, `--y`, `--w`, `--h`, relative to `container`), and the
 * indicator's own CSS decides how it travels. The first placement, and any
 * placement caused by the layout itself changing (a resize, a font loading),
 * is instant; only a change of selection moves.
 *
 * `selected` is a selector inside `container`; `key` is anything that changes
 * when the selection does (the selected id).
 */
export function useIndicator(
  container: RefObject<HTMLElement | null>,
  indicator: RefObject<HTMLElement | null>,
  selected: string,
  key: unknown,
) {
  useLayoutEffect(() => {
    const root = container.current;
    const mark = indicator.current;
    if (!root || !mark) return;

    const place = (animate: boolean) => {
      const target = root.querySelector<HTMLElement>(selected);
      if (!target) {
        mark.setAttribute("data-empty", "true");
        return;
      }
      mark.removeAttribute("data-empty");
      const a = root.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      if (!animate) mark.style.setProperty("transition", "none");
      mark.style.setProperty("--x", `${b.left - a.left + root.scrollLeft}px`);
      mark.style.setProperty("--y", `${b.top - a.top + root.scrollTop}px`);
      mark.style.setProperty("--w", `${b.width}px`);
      mark.style.setProperty("--h", `${b.height}px`);
      if (!animate) {
        void mark.offsetWidth;
        mark.style.removeProperty("transition");
      }
    };

    const placed = mark.getAttribute("data-placed") === "true";
    place(placed);
    mark.setAttribute("data-placed", "true");

    /* Its first report is only the observation starting: ignore it, or it
       would cut short the travel that has just begun. */
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      place(false);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [container, indicator, selected, key]);
}
