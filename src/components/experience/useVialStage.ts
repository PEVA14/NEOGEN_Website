"use client";

import { useEffect, useState, type RefObject } from "react";

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

/**
 * Shared runtime for every stage that hosts the vial.
 *
 * ONE WEBGL CONTEXT AT A TIME. The homepage has two 3D moments — the hero and
 * the RETA sequence — and mounting both would hold two GL contexts, two
 * transmission render targets and two render loops for a composition where only
 * one is ever on screen. Each stage mounts only while it is near the viewport;
 * the GLB is cached by `useLoader`, so the handoff between them re-parses
 * nothing.
 *
 * The margin is generous so the canvas is ready before it scrolls into view,
 * and the two stages are separated by a Quiet section, so in practice they
 * never overlap.
 */
export function useVialStage(
  target: RefObject<HTMLElement | null>,
  { modelPath }: { modelPath: string | null },
): VialStage {
  const tier = useStageTier();
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();

  const [palette, setPalette] = useState<WorldPalette | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);

        // Colour is read off the LIVE element so `worlds.css` stays the single
        // source of truth for the palette (CONVENTIONS §3). Read here, in the
        // observer callback, rather than in an effect body: computed styles are
        // only meaningful once the element is laid out, and setState from a
        // callback avoids the cascading render an effect-body call would cause.
        setPalette((current) => current ?? readWorldPalette(el));
      },
      { rootMargin: "40% 0px 40% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return {
    tier,
    reducedMotion,
    palette,
    // `webgl` is false on the server and on the first client paint, so the
    // static fallback is always what paints first.
    canRender3D: modelPath !== null && webgl && palette !== null && inView,
  };
}
