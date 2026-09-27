"use client";

import { useEffect } from "react";

/**
 * LANDING ON A FRAGMENT, ON A PAGE THAT IS STILL GROWING.
 *
 * NEOGEN's reading surfaces are long, and they link into each other by
 * fragment: a product page links a definition as `/glosario#vida-media`, the
 * Quick Record links `#mecanismo` on a record, an area links `#calidad` on a
 * product page. The browser resolves the fragment against the document as it
 * stands at that moment — on a phone, around 2,000px — and the page then lays
 * out to ten times that. Nothing corrects the scroll position afterwards, so
 * the reader arrives at the top of a 23,000px glossary with no sign of the
 * word they asked for.
 *
 * Measured on the production build at 390px: both the glossary and the
 * compound records failed this way on arrival, while a desktop viewport
 * happened to settle in time and an in-page click always worked. So the jump
 * is re-made while the page is still growing, and then left alone:
 *
 *   - bounded to a second and a half, after which the page is the reader's;
 *   - abandoned the moment they scroll or type;
 *   - skipped entirely if the page has already moved, so a browser that got
 *     it right, or a reader who scrolled before this ran, is never overruled.
 *
 * `instant`, because this corrects a jump that should already have happened —
 * the smooth behaviour the stylesheet sets would animate the same journey a
 * second time. The offset that keeps the target clear of the sticky header is
 * CSS (`scroll-padding-block-start` in `globals.css`), so it applies here too.
 *
 * Mounted once in the locale layout, because what is lacking is the browser's
 * behaviour on a long document, not any one page's markup.
 */
export function FragmentLanding() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || window.scrollY > 32) return;

    let active = true;
    const stop = () => {
      active = false;
    };
    /* Looked up per tick rather than captured: on a page whose list renders
       after mount, the element a fragment names may not exist yet. */
    const jump = () => {
      if (active) {
        document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
      }
    };
    const events = ["wheel", "touchstart", "keydown"] as const;

    const observer = new ResizeObserver(jump);
    observer.observe(document.documentElement);
    const timer = window.setTimeout(stop, 1500);
    for (const event of events) window.addEventListener(event, stop, { passive: true });
    jump();

    return () => {
      stop();
      observer.disconnect();
      window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, stop);
    };
  }, []);

  return null;
}
