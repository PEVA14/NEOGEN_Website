"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useState } from "react";

import { setHostMounted, useActiveRequest, useDrawnStage } from "./stageHostStore";

/* three.js arrives only with the canvas, never in the page's initial payload. */
const SharedCanvas = dynamic(() => import("./SharedCanvas"), { ssr: false });

/**
 * ONE CANVAS FOR THE WHOLE HOMEPAGE (owner, 2026-09-30).
 *
 * The homepage shows the vial in four stages — the hero, the RETA scene, the
 * GLOW and GHK-Cu moments — and only one at a time (`useVialStage`). Each used
 * to mount its own `<Canvas>`, so every handover built a new WebGL context
 * from nothing while the visitor was scrolling: shaders linked again, the
 * label uploaded again, the lighting prefiltered again. On a phone that froze
 * the page for 180–250 ms at every section, and still 67 ms once the shader
 * compile moved to the background (PROJECT_STATE §8af).
 *
 * Now ONE renderer lives for the page and travels. This renders its canvas
 * into a container it owns and moves that container into whichever stage
 * holds the grant. React never sees the move — the portal's container is the
 * same element wherever it sits — so the context, the compiled programs, the
 * uploaded textures and the reflection maps all survive; a handover remounts
 * only the scene (`StageScene`), whose programs the renderer has usually
 * compiled already.
 *
 * The canvas stays hidden in a new box until it has drawn that stage's scene,
 * and the stage keeps its poster until then, so a handover never shows the
 * previous section's vial nor an empty box. Mount once, on the page whose
 * stages share it; it renders nothing into the page itself.
 */
export function StageHost() {
  const container = typeof document === "undefined" ? null : hostContainer();
  const active = useActiveRequest();
  const drawn = useDrawnStage();
  /* The WebGL context is made when a stage first asks, then kept for the page. */
  const [started, setStarted] = useState(false);
  if (active && !started) setStarted(true);

  useEffect(() => {
    setHostMounted(true);
    return () => setHostMounted(false);
  }, []);

  /*
   * Carry the canvas to the active stage, hidden at once (the previous stage's
   * vial must never show in the new box), and FADE IT IN once it has drawn
   * there. The spot is empty until then — no stand-in (owner, 2026-09-30) —
   * so the vial arrives rather than appears; at once for reduced motion.
   */
  useLayoutEffect(() => {
    if (!active) return;
    const element = hostContainer();
    if (element.parentElement !== active.slot) {
      element.style.transition = "none";
      element.style.opacity = "0";
      active.slot.appendChild(element);
    }
    if (drawn !== active.id) {
      element.style.transition = "none";
      element.style.opacity = "0";
      return;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.style.transition = still ? "none" : "opacity 450ms cubic-bezier(0.2, 0, 0, 1)";
    element.style.opacity = "1";
  }, [active, drawn]);

  if (!container || !started) return null;
  return <SharedCanvas container={container} active={active} />;
}

/*
 * The element the canvas is portalled into — the page's, never React's to
 * move, so carrying it between stages is invisible to React. One per page,
 * like the host itself.
 */
let hostElement: HTMLDivElement | null = null;

function hostContainer(): HTMLDivElement {
  if (!hostElement) {
    hostElement = document.createElement("div");
    hostElement.style.cssText = "position:absolute;inset:0;opacity:0;";
  }
  return hostElement;
}
