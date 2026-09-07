"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Server snapshot.
 *
 * Returns `true` — the CALM default. If the preference cannot be known during
 * SSR, we assume reduced motion and let the client upgrade to full motion once
 * it confirms otherwise. Guessing the other way would flash cinematic motion at
 * exactly the users who asked not to see it.
 */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Reads `prefers-reduced-motion`.
 *
 * ONLY for motion that CSS cannot express — 3D camera behaviour, scroll-linked
 * choreography driven in JavaScript, imperative animation. Anything a media
 * query can handle belongs in `src/styles/motion.css`.
 *
 * Reduced motion simplifies or removes CINEMATIC motion. It must not remove
 * interface state feedback, and it must never remove content, hierarchy,
 * product identity, navigation or commerce.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
