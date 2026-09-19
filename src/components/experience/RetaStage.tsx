"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, type ReactNode } from "react";

import type { WorldEnvironment } from "@/config/worlds";
import type { ProductImage } from "@/content/media";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useSectionProgress } from "@/hooks/useSectionProgress";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { useVialStage } from "./useVialStage";
import { VialFallback } from "./VialFallback";
import type { PointerState } from "./VialModel";
import styles from "./RetaExperience.module.css";

/**
 * three + the R3F reconciler are the heaviest thing on this page by a wide
 * margin. `ssr: false` keeps them out of the server bundle, and the dynamic
 * import keeps them out of the initial JS payload — the page is interactive
 * before any of it arrives.
 */
const RetaCanvas = dynamic(() => import("./RetaCanvas"), { ssr: false });

interface RetaStageProps {
  modelPath: string | null;
  environment: WorldEnvironment;
  /** The rendered still, from `content/media`. */
  poster: ProductImage | null;
  /** Accessible name for the object, used by the frame and by the diagram. */
  posterAlt: string;
  loadingLabel: string;
  staticLabel: string;
  /** Server-rendered copy, laid out around the product by the stylesheet. */
  children: ReactNode;
}

/**
 * The RETA scene — scrolled INTO, never pinned.
 *
 * An ordinary block in the page flow. The canvas fills the whole scene behind
 * the copy, so the world's environment runs edge to edge and the vial stands
 * in the middle; the server-rendered copy is laid out around it by the
 * stylesheet's grid.
 *
 * The drive is "through" progress — 0 as the scene's top enters the bottom of
 * the viewport, 1 as its bottom leaves the top — so the vial's arrival
 * (`choreography.ts`) plays as the reader scrolls in and settles while the
 * scene is centred. There is no coarse beat state any more: nothing on the
 * page is hidden behind a scroll position.
 */
export function RetaStage({
  modelPath,
  environment,
  poster,
  posterAlt,
  loadingLabel,
  staticLabel,
  children,
}: RetaStageProps) {
  const track = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, palette, canRender3D } = useVialStage(track, { modelPath });

  /*
   * THE TURNTABLE'S DRIVE.
   *
   * Listeners sit on the whole scene: the vial stands in its middle, and a
   * cursor anywhere over the environment turns it. A cached rect, re-read on
   * entry, rather than a measurement per move.
   *
   * Refs, never state: this updates on every pointer move and the Canvas
   * subtree must not re-render for it.
   */
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false, turn: 0 });
  const finePointer = useFinePointer();

  useEffect(() => {
    const node = track.current;
    // No cursor to answer on touch, and nothing should turn for a reader who
    // asked for stillness.
    if (!node || !finePointer || reducedMotion) return;

    // Captured once: `pointer` is a ref this component owns and never
    // reassigns, so the cleanup must not reach through `.current` (the lint
    // rule is right in general — a ref read at cleanup time can be a different
    // object than the one the effect set up with).
    const drive = pointer.current;

    let box = node.getBoundingClientRect();
    let last: number | null = null;

    const enter = (event: PointerEvent) => {
      box = node.getBoundingClientRect();
      last = box.width > 0 ? (event.clientX - box.left) / box.width : null;
    };

    const move = (event: PointerEvent) => {
      if (box.width === 0 || box.height === 0) return;

      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;

      // One traverse of the stage is one full revolution. Accumulating the
      // travel — rather than mapping x to an angle — is what lets the object
      // KEEP the angle it reached when the cursor leaves, instead of unwinding
      // backwards to a resting offset.
      if (last !== null) drive.turn += (x - last) * Math.PI * 2;
      last = x;

      drive.x = x * 2 - 1;
      drive.y = y * 2 - 1;
      drive.active = true;
    };

    const leave = () => {
      last = null;
      drive.active = false;
    };

    node.addEventListener("pointerenter", enter);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);

    return () => {
      node.removeEventListener("pointerenter", enter);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      // `turn` deliberately survives: it is where the object currently is, and
      // zeroing it here would spin the vial back on any re-subscribe.
      last = null;
      drive.active = false;
    };
  }, [finePointer, reducedMotion]);

  const progress = useSectionProgress(track, { mode: "through" });

  const fallback = <VialFallback poster={poster} diagramLabel={posterAlt} label={staticLabel} />;

  return (
    <div ref={track} className={styles.scene} data-tier={tier}>
      <div
        className={styles.canvasLayer}
        // Cinematic tier: motion.css neutralises anything under this
        // attribute when the user prefers reduced motion (CONVENTIONS §4).
        data-motion="cinematic"
        role="img"
        aria-label={posterAlt}
      >
        {canRender3D && modelPath && palette ? (
          <CanvasErrorBoundary fallback={fallback}>
            <Suspense
              fallback={
                <VialFallback
                  poster={poster}
                  diagramLabel={posterAlt}
                  label={loadingLabel}
                  loading
                />
              }
            >
              <RetaCanvas
                modelPath={modelPath}
                environment={environment}
                palette={palette}
                progress={progress}
                reducedMotion={reducedMotion}
                tier={tier}
                variant="sequence"
                pointer={finePointer ? pointer : undefined}
              />
            </Suspense>
          </CanvasErrorBoundary>
        ) : (
          fallback
        )}
      </div>

      {children}
    </div>
  );
}
