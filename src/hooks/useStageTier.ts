"use client";

import { useSyncExternalStore } from "react";

/**
 * `compact` — phones. Gets its OWN composition, not a scaled-down desktop one:
 *             a smaller, more centred vial, a shorter scroll track, and the
 *             cheaper glass path.
 * `full`    — everything else.
 */
export type StageTier = "compact" | "full";

/** Mirrors the 48rem breakpoint `motion.css` already uses for cinematic amplitude. */
const QUERY = "(min-width: 48rem)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): StageTier {
  return window.matchMedia(QUERY).matches ? "full" : "compact";
}

/** Mobile-first: the cheapest composition is what server-renders. */
function getServerSnapshot(): StageTier {
  return "compact";
}

/**
 * Which 3D composition and cost tier this viewport gets.
 *
 * CONVENTIONS §5 keeps layout in CSS with no JavaScript breakpoint logic. This
 * is not layout: a WebGL camera, a model's world-space offset and a material's
 * cost cannot be expressed in CSS, which is exactly the 3D exception §5
 * reserves. Layout around the canvas is still pure CSS.
 */
export function useStageTier(): StageTier {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
