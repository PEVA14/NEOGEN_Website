"use client";

import { useSyncExternalStore } from "react";

/**
 * A real pointing device — a mouse or trackpad, not a finger.
 *
 * Gated on capability rather than width: a touchscreen laptop and a small
 * desktop window are both wide, and neither fact says whether hovering means
 * anything. `pointer: fine` does.
 */
const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void): () => void {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** Assume touch on the server: the calmer default, and the common case. */
function getServerSnapshot(): boolean {
  return false;
}

export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
