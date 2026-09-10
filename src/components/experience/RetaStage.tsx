"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useRef, useState, type ReactNode } from "react";

import type { WorldEnvironment } from "@/config/worlds";
import type { ProductImage } from "@/content/media";
import { useSectionProgress } from "@/hooks/useSectionProgress";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { useVialStage } from "./useVialStage";
import { VialFallback } from "./VialFallback";
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
  /** How many copy beats the overlay contains. */
  beatCount: number;
  /** Server-rendered copy, composed around the product. */
  children: ReactNode;
}

/**
 * The pinned RETA composition.
 *
 * A tall track with a sticky, full-viewport child. The canvas fills that
 * viewport edge to edge and the copy overlays it, so the product is not parked
 * in a layout column — typography composes around it, and the environment runs
 * continuously across the screen.
 *
 * The active beat is COARSE React state: it changes about three times per pass,
 * not per frame, and is derived from the SAME scroll listener that feeds the 3D
 * progress ref. Copy stays server-rendered; only a `data-beat` attribute
 * changes, and CSS does the rest.
 */
export function RetaStage({
  modelPath,
  environment,
  poster,
  posterAlt,
  loadingLabel,
  staticLabel,
  beatCount,
  children,
}: RetaStageProps) {
  const track = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, palette, canRender3D } = useVialStage(track, { modelPath });

  const [beat, setBeat] = useState(0);

  // Derives the active beat without a second scroll listener. Called from the
  // progress hook's rAF, and only commits when the index actually changes.
  const onSample = useCallback(
    (value: number) => {
      const next = Math.min(beatCount - 1, Math.floor(value * beatCount));
      setBeat((current) => (current === next ? current : next));
    },
    [beatCount],
  );

  const progress = useSectionProgress(track, { mode: "pinned", onSample });

  const fallback = <VialFallback poster={poster} diagramLabel={posterAlt} label={staticLabel} />;

  return (
    <div ref={track} className={styles.track} data-tier={tier}>
      <div
        className={styles.viewport}
        // Drives which copy beat is lit. Under reduced motion the stylesheet
        // ignores this and shows every beat at once.
        data-beat={beat}
      >
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
                />
              </Suspense>
            </CanvasErrorBoundary>
          ) : (
            fallback
          )}
        </div>

        <div className={styles.overlay}>{children}</div>
      </div>
    </div>
  );
}
