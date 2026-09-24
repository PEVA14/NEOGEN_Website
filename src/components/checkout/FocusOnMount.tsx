"use client";

import { useEffect } from "react";

/**
 * Bring an element into view and give it focus once, when it first renders.
 *
 * For the checkout's error summary: after a failed submit the browser restores
 * the previous scroll position, which on a phone left the summary under the
 * sticky header and focus on <body>. Scrolling respects the page's
 * `scroll-padding` (set from the header height), and focus puts a screen
 * reader on the list of what to fix. Instant, never smooth.
 */
export function FocusOnMount({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }, [targetId]);
  return null;
}
