"use client";

import { useEffect, useId, useState, useSyncExternalStore, type RefObject } from "react";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useStageTier, type StageTier } from "@/hooks/useStageTier";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";

import { readWorldPalette, type WorldPalette } from "./worldPalette";

interface VialStage {
  tier: StageTier;
  reducedMotion: boolean;
  palette: WorldPalette | null;
  /** True only when the 3D layer should be mounted right now. */
  canRender3D: boolean;
  /**
   * True only once it is KNOWN that this device cannot draw the 3D layer — on
   * the client, after the WebGL probe. The server and the first paint cannot
   * know, and must not show a stand-in to everyone in the meantime.
   */
  noWebGL: boolean;
}

const noop = () => () => {};

/*
 * THE ONE-CONTEXT REGISTRY.
 *
 * Visibility alone does not enforce "one WebGL context at a time" — it only
 * asks nicely. With a 40% root margin, a full-height hero and a multi-viewport
 * pinned track below it are BOTH intersecting for the whole stretch between
 * them, and the page ends up running two renderers, two transmission passes
 * and two render loops for a composition where only one is ever on screen.
 * Measured on the homepage: two live canvases, and the frame cost to match.
 *
 * So the stages arbitrate. Each publishes how much of it is on screen, and
 * exactly one — the most visible — is granted the canvas. Ratio, not mere
 * intersection, is what makes the handover happen at the right moment: the
 * incoming stage takes over only once it genuinely owns more of the viewport
 * than the outgoing one.
 */
const ratios = new Map<string, number>();
const listeners = new Set<() => void>();

function publishRatio(id: string, ratio: number): void {
  if (ratios.get(id) === ratio) return;
  ratios.set(id, ratio);
  listeners.forEach((notify) => notify());
}

function releaseRatio(id: string): void {
  ratios.delete(id);
  listeners.forEach((notify) => notify());
}

/** True when this stage is the most visible one, and visible at all. */
function holdsContext(id: string): boolean {
  const own = ratios.get(id) ?? 0;
  if (own <= 0) return false;

  for (const [other, ratio] of ratios) {
    // Ties go to whichever registered first, so a handover needs a real lead
    // rather than flapping between two equally visible stages.
    if (other !== id && ratio > own) return false;
  }
  return true;
}

/** True when some other stage is on screen or within its margin. */
function contested(id: string): boolean {
  for (const [other, ratio] of ratios) if (other !== id && ratio > 0) return true;
  return false;
}

/**
 * Shared runtime for every stage that hosts the vial.
 *
 * ONE WEBGL CONTEXT AT A TIME, enforced by the registry above rather than
 * assumed from layout. The homepage has two 3D moments — the hero and the RETA
 * sequence — and mounting both holds two GL contexts, two transmission render
 * targets and two render loops for a composition where only one is ever on
 * screen.
 *
 * The margin is generous so a stage becomes eligible before it is looked at;
 * the ratio arbitration then decides which eligible stage actually gets the
 * canvas. The GLB is cached by `useLoader`, so a handover re-parses nothing.
 */
export function useVialStage(
  target: RefObject<HTMLElement | null>,
  {
    modelPath,
    keep = false,
  }: {
    modelPath: string | null;
    /**
     * Keep the canvas once granted, until another stage needs it, instead of
     * giving it up whenever this stage leaves its margin. For a page with one
     * stage: rebuilding the canvas on the way back — a new context, the
     * label's upload, the programs — cost a ~60 ms frame just as the stage
     * came back into view (owner, 2026-10-01: "when scrolling back up it
     * staggers"). The loop draws nothing while it is off screen
     * (`FrameBudget`), so keeping it costs memory, not frames.
     */
    keep?: boolean;
  },
): VialStage {
  const tier = useStageTier();
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();
  // False on the server and during hydration, true on the client after it.
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

  const id = useId();
  const [palette, setPalette] = useState<WorldPalette | null>(null);
  const [granted, setGranted] = useState(false);
  /*
   * WAIT FOR IDLE. The 3D layer — three.js, the GLB parse, shader compilation
   * — is the heaviest work on any page that hosts the vial, and starting it
   * during hydration made it compete with the page becoming interactive
   * (performance audit, 2026-09-19). The poster paints first either way; the
   * canvas takes over once the main thread is free, or after 1.5 s at most.
   */
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const done = () => setIdle(true);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(done, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(done, 600);
    return () => clearTimeout(handle);
  }, []);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const sync = () => setGranted((held) => holdsContext(id) || (keep && held && !contested(id)));
    listeners.add(sync);

    const observer = new IntersectionObserver(
      ([entry]) => {
        // The margin makes a stage eligible early enough to be ready before it
        // is looked at; the ratio decides which eligible stage actually wins.
        publishRatio(id, entry.isIntersecting ? entry.intersectionRatio || 0.0001 : 0);

        // Colour is read off the LIVE element so `worlds.css` stays the single
        // source of truth for the palette (CONVENTIONS §3). Read here, in the
        // observer callback, rather than in an effect body: computed styles are
        // only meaningful once the element is laid out, and setState from a
        // callback avoids the cascading render an effect-body call would cause.
        setPalette((current) => current ?? readWorldPalette(el));
      },
      {
        rootMargin: "40% 0px 40% 0px",
        // Ratios have to be sampled continuously, or the arbitration only ever
        // sees "intersecting" and cannot tell which stage is more on screen.
        threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1],
      },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      listeners.delete(sync);
      releaseRatio(id);
    };
  }, [target, id, keep]);

  return {
    tier,
    reducedMotion,
    palette,
    // `webgl` is false on the server and on the first client paint, so the
    // static fallback is always what paints first.
    canRender3D: modelPath !== null && webgl && palette !== null && granted && idle,
    noWebGL: hydrated && !webgl,
  };
}
