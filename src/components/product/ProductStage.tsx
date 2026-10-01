"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, ViewTransition, type ReactNode } from "react";

import { CanvasErrorBoundary } from "@/components/experience/CanvasErrorBoundary";
import { useVialStage } from "@/components/experience/useVialStage";
import { VialFallback } from "@/components/experience/VialFallback";
import type { PointerState, StageAnchor } from "@/components/experience/VialModel";
import { Mono } from "@/components/typography";
import type { ProductImage } from "@/content/media";
import type { WorldEnvironment, WorldId } from "@/config/worlds";
import { useFinePointer } from "@/hooks/useFinePointer";
import { StageSpecimen } from "@/components/vial-transition/SpecimenLayers";
import { names, specimenFor } from "@/components/vial-transition/specimens";
import { useStageHandoff, useWorldOrigin } from "@/components/vial-transition/useStageHandoff";

import { LIVE_FRAME_MARGIN } from "./liveFrame";
import styles from "./ProductStage.module.css";

const RetaCanvas = dynamic(() => import("@/components/experience/RetaCanvas"), { ssr: false });

/**
 * The presenter's pose track has a single stop, so the rig has no progress to
 * read. A shared frozen ref keeps the canvas API unchanged without pretending
 * there is a scroll sequence here.
 */
const restingProgress = { current: 0 };

/** The vial's place in its canvas — see `anchor` below. */
const LIVE_ANCHOR: StageAnchor = {
  x: 0.5,
  y: 0.5,
  height: 1 / (1 + 2 * LIVE_FRAME_MARGIN),
  weight: 1,
};

/** The live box's offsets from the media frame, as an `inset`. */
const LIVE_FRAME_INSET = `${-LIVE_FRAME_MARGIN * 100}%`;

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
  /**
   * The compound's name, set across the field behind everything.
   *
   * Decorative and `aria-hidden`: the commerce panel renders the name as the
   * page's real heading a few hundred pixels to the right, and announcing it
   * twice helps nobody. It is the same device as the Hero's ghosted wordmark
   * and the specimen plate's ghosted name — the one composition NEOGEN repeats
   * at every scale, which is what makes a flagship page read as the same
   * system as the card that led to it.
   */
  wordmark?: string;
  /** The commerce panel, server-rendered. */
  children: ReactNode;
  /**
   * The product, so its split studio still can stand in for the object and
   * receive the card's specimen (the vial transition). Absent → the drawn
   * stand-in.
   */
  slug?: string;
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
 * Mounting the WebGL layer costs one ~240ms burst of main-thread work, and any
 * animation sharing a frame budget with it visibly breaks (CONVENTIONS §11). So
 * the sophistication is spent where it holds up at any frame rate:
 * composition, type scale, the instrument marks on the media frame, the column
 * rule, and the seam into Quiet Mode below.
 *
 * The one arrival is the VIAL TRANSITION (`components/vial-transition`): from a
 * catalogue card, the card's vial flies into the media frame and this world
 * opens around it. It keeps the rule above by holding the canvas back until
 * the flight has landed — the still stands in, and dissolves once the canvas
 * has drawn.
 */
export function ProductStage({
  world,
  modelPath,
  environment,
  poster,
  posterAlt,
  loadingLabel,
  staticLabel,
  viewerHint,
  material,
  frameMarks,
  wordmark,
  children,
  slug,
}: ProductStageProps) {
  const stage = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const { tier, reducedMotion, palette, canRender3D } = useVialStage(stage, {
    modelPath,
    keep: true,
  });
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
  /*
   * THE VIAL TRANSITION. While a specimen is in flight from a card, the
   * canvas is not mounted at all: its boot is ~240ms of main thread and would
   * land inside the animation. It mounts once the flight has landed, behind
   * the specimen, which stands in until the canvas has drawn.
   */
  const standIn = slug ? (specimenFor(slug)?.stage ?? null) : null;
  const handoff = useStageHandoff(slug ?? "");
  const held = standIn !== null && handoff.holding;
  useWorldOrigin(slug ?? "", standIn !== null && handoff.holding, stage, panel);

  const viewer = canRender3D && modelPath && palette && !held ? { modelPath, palette } : null;

  /*
   * Where the object sits: the centre of its canvas, at the media frame's
   * share of the canvas height. The canvas is the frame grown by
   * `LIVE_FRAME_MARGIN` on every side, so this holds on every screen and
   * through every resize without measuring anything — and the camera always
   * looks straight at the vial. (The canvas used to cover the whole stage, so
   * the vial sat off its axis: seen a little from the side on a laptop and from
   * below on a phone, where the stage runs on under the purchase panel.)
   */
  const anchor = useRef<StageAnchor>(LIVE_ANCHOR);
  // `turn` is the homepage turntable's accumulated cursor drive; the presenter
  // ignores it and keeps its restrained yaw response.
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false, turn: 0 });

  /*
   * Pointer response. A cached rect rather than a measurement per move: the
   * stage does not resize while a cursor is travelling across it.
   */
  useEffect(() => {
    const node = stage.current;
    if (!node || !finePointer || reducedMotion) return;

    // Captured once: the cleanup must not reach through `.current`, which the
    // lint rule rightly treats as possibly a different object by then.
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

      // One traverse of the stage is one revolution — the homepage's drive,
      // accumulated rather than mapped from position, so the object keeps the
      // angle it reached instead of unwinding when the cursor leaves.
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
      // `turn` survives deliberately: it is where the object currently is, and
      // zeroing it would spin the vial back on any re-subscribe.
      last = null;
      drive.active = false;
    };
  }, [finePointer, reducedMotion]);

  /* The name printed on the fallback object's label. */
  const objectName = wordmark;

  const fallback = standIn ? (
    // The specimen in the media frame is the stand-in; only the world's
    // material study is drawn behind it.
    <div className={styles.mediaWell}>{material}</div>
  ) : (
    <div className={styles.mediaWell}>
      {material}
      <VialFallback
        poster={poster}
        diagramLabel={posterAlt}
        label={staticLabel}
        world={world}
        name={objectName}
        upright={!modelPath}
      />
    </div>
  );

  return (
    <div ref={stage} className={styles.stage} data-world={world}>
      {/* The environment. Full-bleed, with the world's atmospheric wash. */}
      {standIn ? (
        /* Paired with the card's stage, so the world can open out of the
           card the specimen left and drift to where it lands (see the CSS). */
        <ViewTransition name={names.world(slug ?? "")} share="vt-world" default="none">
          <div className={styles.field} aria-hidden="true" />
        </ViewTransition>
      ) : (
        <div className={styles.field} aria-hidden="true" />
      )}

      {/* The name across the field, cropped by both edges. */}
      {wordmark ? (
        <div className={styles.wordmarkLayer} aria-hidden="true">
          <span className={styles.wordmark}>{wordmark}</span>
        </div>
      ) : null}

      {/*
       * Laid out on the SAME grid as the composition, so the static fallback
       * and the live box both land on the media frame.
       */}
      <div className={styles.canvasLayer} role="img" aria-label={posterAlt}>
        {viewer ? (
          <CanvasErrorBoundary fallback={fallback}>
            <Suspense
              fallback={
                standIn ? (
                  <div className={styles.mediaWell}>{material}</div>
                ) : (
                  <div className={styles.mediaWell}>
                    {material}
                    <VialFallback
                      poster={poster}
                      diagramLabel={posterAlt}
                      label={loadingLabel}
                      loading
                      world={world}
                      name={objectName}
                    />
                  </div>
                )
              }
            >
              {/* The live box: the media frame, grown on every side. */}
              <div className={styles.mediaWell}>
                <div className={styles.liveFrame} style={{ inset: LIVE_FRAME_INSET }}>
                  <RetaCanvas
                    fill
                    modelPath={viewer.modelPath}
                    world={world}
                    environment={environment}
                    palette={viewer.palette}
                    progress={restingProgress}
                    reducedMotion={reducedMotion}
                    tier={tier}
                    variant="presenter"
                    anchor={anchor}
                    pointer={finePointer ? pointer : undefined}
                    onFirstFrame={standIn ? handoff.onFirstFrame : undefined}
                  />
                </div>
              </div>
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
          {standIn && slug ? (
            <StageSpecimen
              slug={slug}
              stage={standIn}
              live={handoff.live}
              onShare={handoff.onShare}
            />
          ) : null}
          {frameMarks}
          <div className={styles.caption}>
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
