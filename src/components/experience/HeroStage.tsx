"use client";

import dynamic from "next/dynamic";
import { Suspense, useRef } from "react";

import type { WorldEnvironment } from "@/config/worlds";
import { useSectionProgress } from "@/hooks/useSectionProgress";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { useVialStage } from "./useVialStage";
import { VialFallback } from "./VialFallback";
import styles from "./Hero.module.css";

const RetaCanvas = dynamic(() => import("./RetaCanvas"), { ssr: false });

interface HeroStageProps {
  modelPath: string | null;
  environment: WorldEnvironment;
  posterPath: string | null;
  posterAlt: string;
  loadingLabel: string;
  staticLabel: string;
}

/**
 * The hero's 3D layer.
 *
 * Simpler than `RetaStage` by design: no pin, no beats, no coarse state — one
 * gentle arc driven by the hero's own exit progress. The homepage should not
 * open on its climax; the deep sequence belongs to RETA further down.
 *
 * `data-world-tint="reta"` rather than `data-world`: the vial brings its own
 * light, but the hero's surface stays brand-neutral dark. This loads the RETA
 * palette for the lighting rig WITHOUT inverting the section into the RETA
 * world — the hero introduces NEOGEN, not a product.
 */
export function HeroStage({
  modelPath,
  environment,
  posterPath,
  posterAlt,
  loadingLabel,
  staticLabel,
}: HeroStageProps) {
  const stage = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, palette, canRender3D } = useVialStage(stage, { modelPath });

  // `exit`, not `through`: the hero is on screen at page load, so `through`
  // would start it half-way along its own track before the user has scrolled.
  const progress = useSectionProgress(stage, { mode: "exit" });

  const fallback = (
    <VialFallback posterPath={posterPath} posterAlt={posterAlt} label={staticLabel} />
  );

  return (
    <div
      ref={stage}
      data-world-tint="reta"
      className={styles.stage}
      data-motion="cinematic"
      role="img"
      aria-label={posterAlt}
    >
      {canRender3D && modelPath && palette ? (
        <CanvasErrorBoundary fallback={fallback}>
          <Suspense
            fallback={
              <VialFallback
                posterPath={posterPath}
                posterAlt={posterAlt}
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
              variant="hero"
            />
          </Suspense>
        </CanvasErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
