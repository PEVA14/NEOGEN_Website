"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, type ReactNode } from "react";

import { CanvasErrorBoundary } from "@/components/experience/CanvasErrorBoundary";
import { useVialStage } from "@/components/experience/useVialStage";
import { VialFallback } from "@/components/experience/VialFallback";
import type { PointerState, StageAnchor } from "@/components/experience/VialModel";
import { Mono } from "@/components/typography";
import type { ProductImage } from "@/content/media";
import type { WorldEnvironment, WorldId } from "@/config/worlds";
import { useFinePointer } from "@/hooks/useFinePointer";

import styles from "./ProductStage.module.css";

const RetaCanvas = dynamic(() => import("@/components/experience/RetaCanvas"), { ssr: false });

/**
 * The presenter's pose track has a single stop, so the rig has no progress to
 * read. A shared frozen ref keeps the canvas API unchanged without pretending
 * there is a scroll sequence here.
 */
const restingProgress = { current: 0 };

interface ProductStageProps {
  world: WorldId;
  modelPath: string | null;
  environment: WorldEnvironment;
  /** The rendered still, from `content/media`. */
  poster: ProductImage | null;
  /** Accessible name for the object, used by the frame and by the diagram. */
  posterAlt: string;
  loadingLabel: string;
  staticLabel: string;
  /** Caption for the media area. Describes the frame, never the contents. */
  mediaLabel: string;
  /** Notes that the media responds to the cursor. Desktop pointers only. */
  viewerHint: string;
  /**
   * The world's environment study, drawn behind the static still — see
   * `WorldMaterial`. Server-rendered and passed in, so this client component
   * does not decide what a world looks like.
   */
  material?: ReactNode;
  /** Edge instrumentation that stays visible over a live model. */
  frameMarks?: ReactNode;
  /** The commerce panel, server-rendered. */
  children: ReactNode;
}

/**
 * THE PRODUCT PAGE'S OPENING COMPOSITION.
 *
 * Product media, product identity and commerce, held together by grid,
 * proportion and typography rather than by a sequence. It is deliberately
 * STATIC: nothing here is scroll-driven, nothing plays on arrival, and the page
 * is complete the instant it paints.
 *
 * The only motion is the object's own — a slow passive turn with a restrained
 * pointer response, the way a museum vitrine rotates. That is product media
 * behaving like product media.
 *
 * WHY IT IS NOT A CINEMATIC SEQUENCE
 * ----------------------------------
 * It was, briefly. A shared-element transition carried the product card's media
 * rectangle into this environment, and the ideas behind it are good enough to
 * keep — see docs/V2_LIVING_LABORATORY.md, which also records the measurements
 * and the traps. What it is not is affordable in V1: mounting the WebGL layer
 * costs one ~240ms burst of main-thread work, and any animation sharing a frame
 * budget with it visibly breaks.
 *
 * So the sophistication is spent where it holds up at any frame rate:
 * composition, type scale, the instrument marks on the media frame, the column
 * rule, and the seam into Quiet Mode below.
 */
export function ProductStage({
  world,
  modelPath,
  environment,
  poster,
  posterAlt,
  loadingLabel,
  staticLabel,
  mediaLabel,
  viewerHint,
  material,
  frameMarks,
  children,
}: ProductStageProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvasLayer = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const { tier, reducedMotion, palette, canRender3D } = useVialStage(stage, { modelPath });
  const finePointer = useFinePointer();

  /*
   * Whether a live viewer will actually mount.
   *
   * Only RETA has a GLB; GLOW and GHK-Cu fall back to the static plate. The
   * cursor hint used to be gated on the POINTER alone, so both of those pages
   * told a mouse user the view responds to the cursor while showing a flat
   * silhouette that does not. A hint for an interaction that is not there is
   * worse than no hint.
   */
  const viewer = canRender3D && modelPath && palette ? { modelPath, palette } : null;

  /**
   * Where the object sits, measured rather than assumed — and expressed
   * relative to the CANVAS, not the window, so it survives the page scrolling
   * past. The media frame is capped in both axes, so a fixed viewport fraction
   * drifts out of it on wide screens.
   */
  const anchor = useRef<StageAnchor | null>(null);
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false });

  /** The media frame, as fractions of the canvas box. */
  const measure = useCallback((): StageAnchor | null => {
    const canvas = canvasLayer.current;
    const frame = panel.current;
    if (!canvas || !frame) return null;

    const box = canvas.getBoundingClientRect();
    const target = frame.getBoundingClientRect();
    if (box.width === 0 || box.height === 0 || target.height === 0) return null;

    return {
      x: (target.x + target.width / 2 - box.x) / box.width,
      y: (target.y + target.height / 2 - box.y) / box.height,
      height: target.height / box.height,
      weight: 1,
    };
  }, []);

  // Keeps the object in its frame across resizes and orientation changes.
  useEffect(() => {
    const node = stage.current;
    if (!node) return;

    const sync = () => {
      const measured = measure();
      if (measured) anchor.current = measured;
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  /*
   * Pointer response. A cached rect rather than a measurement per move: the
   * stage does not resize while a cursor is travelling across it.
   */
  useEffect(() => {
    const node = stage.current;
    if (!node || !finePointer || reducedMotion) return;

    let box = node.getBoundingClientRect();

    const enter = () => {
      box = node.getBoundingClientRect();
    };

    const move = (event: PointerEvent) => {
      if (box.width === 0 || box.height === 0) return;
      pointer.current = {
        x: ((event.clientX - box.left) / box.width) * 2 - 1,
        y: ((event.clientY - box.top) / box.height) * 2 - 1,
        active: true,
      };
    };

    const leave = () => {
      pointer.current = { ...pointer.current, active: false };
    };

    node.addEventListener("pointerenter", enter);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);

    return () => {
      node.removeEventListener("pointerenter", enter);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      pointer.current = { x: 0, y: 0, active: false };
    };
  }, [finePointer, reducedMotion]);

  const fallback = (
    <div className={styles.mediaWell}>
      {material}
      <VialFallback poster={poster} diagramLabel={posterAlt} label={staticLabel} />
    </div>
  );

  return (
    <div ref={stage} className={styles.stage} data-world={world}>
      {/* The environment. Full-bleed, with the world's atmospheric wash. */}
      <div className={styles.field} aria-hidden="true" />

      {/*
       * Laid out on the SAME grid as the composition, so the static fallback
       * lands inside the media frame. The live canvas breaks out of it — the
       * object is positioned in world space and needs the whole frame to
       * respond to the cursor across.
       */}
      <div ref={canvasLayer} className={styles.canvasLayer} role="img" aria-label={posterAlt}>
        {viewer ? (
          <CanvasErrorBoundary fallback={fallback}>
            <Suspense
              fallback={
                <div className={styles.mediaWell}>
                  {material}
                  <VialFallback
                    poster={poster}
                    diagramLabel={posterAlt}
                    label={loadingLabel}
                    loading
                  />
                </div>
              }
            >
              <RetaCanvas
                fill
                modelPath={viewer.modelPath}
                environment={environment}
                palette={viewer.palette}
                progress={restingProgress}
                reducedMotion={reducedMotion}
                tier={tier}
                variant="presenter"
                anchor={anchor}
                pointer={finePointer ? pointer : undefined}
              />
            </Suspense>
          </CanvasErrorBoundary>
        ) : (
          fallback
        )}
      </div>

      <div className={styles.composition}>
        {/*
         * The media plate. Its box is EXACTLY the frame's box — the caption is
         * an absolutely positioned satellite — so the plate and the canvas
         * layer's static fallback, centred in the same column at the same size,
         * cannot drift apart.
         *
         * Registration marks at opposing corners are pseudo-elements: an
         * instrument plate, not a picture frame, and no extra DOM.
         */}
        <div ref={panel} className={styles.media}>
          {frameMarks}
          <div className={styles.caption}>
            <Mono size="2xs" className={styles.captionLabel}>
              {mediaLabel}
            </Mono>
            {/* Two gates: a live viewer to respond, and (in CSS) a cursor to
                respond to. */}
            {viewer ? (
              <Mono size="2xs" className={styles.viewerHint}>
                {viewerHint}
              </Mono>
            ) : null}
          </div>
        </div>

        <div className={styles.commerce}>{children}</div>
      </div>
    </div>
  );
}
