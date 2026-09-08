"use client";

import { useSyncExternalStore } from "react";

/**
 * WebGL2 capability, cached for the lifetime of the document.
 *
 * Support cannot change while the page is open, so the probe runs once and the
 * result is memoised — `useSyncExternalStore` would otherwise call the snapshot
 * on every render, and creating a GL context per render would be ruinous.
 */
let cached: boolean | null = null;

function detect(): boolean {
  try {
    // A throwaway context: created, probed, then immediately released so we
    // never hold a second GL context alongside the real Canvas.
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    // Some privacy modes throw rather than returning null.
    return false;
  }
}

/** Capability is fixed for the document's lifetime — nothing to subscribe to. */
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  if (cached === null) cached = detect();
  return cached;
}

/**
 * Server snapshot: `false`, the CALM default — matching `useReducedMotion`.
 *
 * The static fallback is therefore what server-renders and what paints first,
 * so a visitor without WebGL never sees an empty frame, and a visitor with it
 * upgrades to the canvas on hydration.
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Progressive-enhancement gate for the 3D layer.
 *
 * Per CONVENTIONS §5 there is no JavaScript breakpoint logic in this project.
 * This is not layout logic — it answers a capability question CSS cannot
 * answer, which is exactly the exception §5 reserves for 3D behaviour.
 */
export function useWebGLSupport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
