"use client";

import { useEffect, useId, useState, type RefObject } from "react";

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
}

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
  { modelPath }: { modelPath: string | null },
): VialStage {
  const tier = useStageTier();
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();

  const id = useId();
  const [palette, setPalette] = useState<WorldPalette | null>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const sync = () => setGranted(holdsContext(id));
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
  }, [target, id]);

  return {
    tier,
    reducedMotion,
    palette,
    // `webgl` is false on the server and on the first client paint, so the
    // static fallback is always what paints first.
    canRender3D: modelPath !== null && webgl && palette !== null && granted,
  };
}
