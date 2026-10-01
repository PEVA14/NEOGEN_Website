"use client";

import dynamic from "next/dynamic";
import { Suspense, useId, useMemo, useRef } from "react";

import type { WorldEnvironment } from "@/config/worlds";
import type { ProductImage } from "@/content/media";
import { useSectionProgress } from "@/hooks/useSectionProgress";

import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { HOST_SLOT_STYLE, useHostedScene, useStageHost, type HostedScene } from "./stageHostStore";
import { useVialStage } from "./useVialStage";
import { VialFallback } from "./VialFallback";
import styles from "./Hero.module.css";

const RetaCanvas = dynamic(() => import("./RetaCanvas"), { ssr: false });

interface HeroStageProps {
  modelPath: string | null;
  environment: WorldEnvironment;
  /** The rendered still, from `content/media`. */
  poster: ProductImage | null;
  /** Accessible name for the object, used by the frame and by the diagram. */
  posterAlt: string;
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
  poster,
  posterAlt,
  staticLabel,
}: HeroStageProps) {
  const stage = useRef<HTMLDivElement>(null);
  const { tier, reducedMotion, palette, canRender3D, noWebGL } = useVialStage(stage, {
    modelPath,
  });

  // `exit`, not `through`: the hero is on screen at page load, so `through`
  // would start it half-way along its own track before the user has scrolled.
  const progress = useSectionProgress(stage, { mode: "exit" });

  const fallback = <VialFallback poster={poster} diagramLabel={posterAlt} label={staticLabel} />;

  /* The homepage's shared canvas (`StageHost`), when the page has one. */
  const hosted = useStageHost();
  const slot = useRef<HTMLDivElement>(null);
  const hostId = useId();
  const scene = useMemo<HostedScene | null>(
    () =>
      modelPath && palette
        ? {
            modelPath,
            // The RETA rig, as the RETA palette above: the hero's vial is RETA's.
            world: "reta",
            environment,
            palette,
            progress,
            reducedMotion,
            tier,
            variant: "hero",
          }
        : null,
    [modelPath, palette, environment, progress, reducedMotion, tier],
  );
  useHostedScene(hostId, slot, hosted ? scene : null, canRender3D);

  return (
    <div
      ref={stage}
      data-world-tint="reta"
      className={styles.stage}
      data-motion="cinematic"
      role="img"
      aria-label={posterAlt}
    >
      {/*
       * NO STAND-IN WHILE THE VIAL LOADS (owner, 2026-09-30: "I don't like the
       * placeholders that take the spot before the render finishes loading").
       * The spot stays empty and the vial fades in once drawn. The drawing is
       * only for a device that cannot run 3D at all.
       */}
      {noWebGL ? (
        fallback
      ) : hosted ? (
        <div ref={slot} style={HOST_SLOT_STYLE} />
      ) : canRender3D && modelPath && palette ? (
        <CanvasErrorBoundary fallback={fallback}>
          <Suspense fallback={null}>
            <RetaCanvas
              modelPath={modelPath}
              // The RETA rig, as the RETA palette above: the hero's vial is RETA's.
              world="reta"
              environment={environment}
              palette={palette}
              progress={progress}
              reducedMotion={reducedMotion}
              tier={tier}
              variant="hero"
            />
          </Suspense>
        </CanvasErrorBoundary>
      ) : null}
    </div>
  );
}
