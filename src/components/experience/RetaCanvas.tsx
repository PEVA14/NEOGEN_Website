"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  MathUtils,
  NeutralToneMapping,
  WebGLRenderTarget,
  type PointLight,
  type RectAreaLight,
  type Camera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import type { WorldEnvironment, WorldId } from "@/config/worlds";
import type { StageTier } from "@/hooks/useStageTier";

import { Backdrop, RefractionGround } from "./Backdrop";
import {
  CAMERA_Z,
  poseTrack,
  restingProgress,
  sampleTrack,
  type StageVariant,
} from "./choreography";
import { studioEnvironment } from "./studio/optics";
import { WORLD_RIGS, type StudioRig } from "./studio/rig";
import type { SpecimenProbe } from "./specimenProbe";
import { VialModel, type PointerState, type StageAnchor } from "./VialModel";
import type { WorldPalette } from "./worldPalette";

/**
 * Key-light tint per world temperature. Deliberately close to neutral: the
 * world's coldness is carried by the ENVIRONMENT and the rims, never by the
 * key, so the white label stays colour-accurate.
 */
const KEY_TINT: Record<WorldEnvironment["lightTemperature"], string> = {
  cold: "#eef4ff",
  warm: "#fff1de",
  neutral: "#ffffff",
};

/**
 * Ambient fill. Very low by design — uniform light is what makes a subject read
 * flat. Contrast comes from the rig and the environment.
 */
const AMBIENT_INTENSITY: Record<WorldEnvironment["atmosphere"], number> = {
  restrained: 0.09,
  luminous: 0.35,
  tactile: 0.16,
};

/**
 * Image-based lighting: THE STILLS' OWN reflection map, from the world's studio
 * rig (see `studio/optics`). Glass is defined almost entirely by what it
 * reflects, and the stills' tall white strips are what draw the bright edge
 * lines down the glass; the live stage's own palette-built room had nothing
 * that bright, and the glass read as grey beside its photograph.
 */
function SceneEnvironment({ rig }: { rig: StudioRig }) {
  const gl = useThree((state) => state.gl);

  const texture = useMemo(() => environmentFor(gl, rig), [gl, rig]);

  // Attached declaratively: R3F owns the scene object and it must not be
  // mutated from inside a component.
  return <primitive object={texture} attach="environment" />;
}

/*
 * One reflection map per renderer and rig, kept for the renderer's life. A
 * shared canvas shows each world many times; prefiltering the map again at
 * every visit cost ~30 ms of main thread. Released with the renderer.
 */
const environments = new WeakMap<WebGLRenderer, Map<StudioRig, Texture>>();

function environmentFor(gl: WebGLRenderer, rig: StudioRig): Texture {
  let byRig = environments.get(gl);
  if (!byRig) environments.set(gl, (byRig = new Map()));
  let texture = byRig.get(rig);
  if (!texture) byRig.set(rig, (texture = studioEnvironment(gl, rig)));
  return texture;
}

/**
 * Rect-area lights need the LTC lookup tables loaded once before use. This
 * module is client-only (reached solely through `next/dynamic` with
 * `ssr: false`), so module scope is a safe place for it.
 */
RectAreaLightUniformsLib.init();

/** Where each light sits, and where it aims. Aimed at the subject on mount. */
const RIG = {
  // KEY — neutral, tall and narrow, front-upper-left. Keeps the label true and
  // draws the primary vertical highlight down the glass.
  key: { position: [-2.3, 1.6, 2.4], width: 1.6, height: 3.8 },
  // ACCENT RIM — the world's colour, behind-right. The cold edge on the glass,
  // and the main carrier of RETA identity.
  rim: { position: [2.5, 0.7, -1.8], width: 1.2, height: 4.2 },
  // NEUTRAL front-right fill. Colourless on purpose: clear glass needs a white
  // source to reflect, or every highlight it owns is the accent colour.
  fill: { position: [2.6, -0.2, 2.2], width: 1.4, height: 3.2 },
  // Separates cap and shoulder from the backdrop.
  top: { position: [0, 2.8, 0.3], width: 2.4, height: 1.0 },
  // CORE — just behind the object, for a luminous world. Close enough that the
  // glass carries it, with a short falloff so it lights the vial and not the
  // whole scene.
  core: { position: [0, -0.05, -0.7], distance: 3.2 },
} as const;

/** Base intensity of a luminous world's core light. */
const CORE_GLOW = 5.5;

/**
 * The studio rig.
 *
 * Rect-area lights rather than directional ones, because a rect-area light
 * produces a long specular STREAK down curved glass. That streak is what makes
 * thickness, curvature and edges readable — a point or directional light gives
 * one small hotspot and leaves the body of the glass undefined.
 */
function StudioLights({
  palette,
  environment,
  progress,
  reducedMotion,
  tier,
  variant,
}: {
  palette: WorldPalette;
  environment: WorldEnvironment;
  progress: RefObject<number>;
  reducedMotion: boolean;
  tier: StageTier;
  variant: StageVariant;
}) {
  const track = useMemo(() => poseTrack(tier, variant), [tier, variant]);

  const keyLight = useRef<RectAreaLight>(null);
  const rimLight = useRef<RectAreaLight>(null);
  const fillLight = useRef<RectAreaLight>(null);
  const topLight = useRef<RectAreaLight>(null);
  const coreLight = useRef<PointLight>(null);

  /*
   * A LUMINOUS WORLD EMITS — it does not merely get tinted.
   *
   * GLOW's atmosphere is `luminous` (config/worlds), and that should mean
   * light coming OUT of the object, not a warmer version of the same rig. A
   * point light sits just behind the vial: the glass transmits it, so the body
   * lights from within and the label is rimmed from behind.
   *
   * Driven by the world's own data rather than by a product name, so any world
   * declared luminous gets it and RETA and GHK-Cu are untouched.
   */

  // Aimed once on mount. `lookAt` has no declarative equivalent, and a ref is
  // the one thing React does intend to be mutated outside render.
  useEffect(() => {
    [keyLight, rimLight, fillLight, topLight].forEach((light) => light.current?.lookAt(0, 0, 0));
  }, []);

  // The environment responds to the sequence, restrained: only the accent rim
  // breathes, and only within a narrow band. Enough that the light feels alive
  // as the vial turns; not enough to read as an effect.
  useFrame((state, delta) => {
    const light = rimLight.current;
    if (light) {
      const at = reducedMotion ? restingProgress(variant) : progress.current;
      const target = sampleTrack(at, track.rimIntensity);
      light.intensity = reducedMotion ? target : MathUtils.damp(light.intensity, target, 3, delta);
    }

    /*
     * The core breathes — slowly, and never below a steady floor, so it reads
     * as something lit rather than something blinking. Held at the floor for a
     * reader who asked for no movement.
     */
    const core = coreLight.current;
    if (core) {
      core.intensity = reducedMotion
        ? CORE_GLOW
        : CORE_GLOW * (1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.22);
    }
  });

  return (
    <>
      <rectAreaLight
        ref={keyLight}
        position={RIG.key.position}
        width={RIG.key.width}
        height={RIG.key.height}
        intensity={8 * environment.keyLightIntensity}
        color={KEY_TINT[environment.lightTemperature]}
      />
      <rectAreaLight
        ref={rimLight}
        position={RIG.rim.position}
        width={RIG.rim.width}
        height={RIG.rim.height}
        intensity={sampleTrack(restingProgress(variant), track.rimIntensity)}
        color={palette.accent}
      />
      {/* Neutral front-right fill. Colourless, so the body of the glass has a
          white source to reflect and reads clear rather than tinted. */}
      <rectAreaLight
        ref={fillLight}
        position={RIG.fill.position}
        width={RIG.fill.width}
        height={RIG.fill.height}
        intensity={3}
        color="#ffffff"
      />
      <rectAreaLight
        ref={topLight}
        position={RIG.top.position}
        width={RIG.top.width}
        height={RIG.top.height}
        intensity={1.5}
        color={palette.light}
      />
      {environment.atmosphere === "luminous" ? (
        <pointLight
          ref={coreLight}
          position={RIG.core.position}
          intensity={CORE_GLOW}
          distance={RIG.core.distance}
          decay={2}
          color={palette.light}
        />
      ) : null}
    </>
  );
}

export interface RetaCanvasProps {
  modelPath: string;
  /** Whose studio rig lights the object — the same rig as its stills. */
  world: WorldId;
  environment: WorldEnvironment;
  palette: WorldPalette;
  progress: RefObject<number>;
  reducedMotion: boolean;
  tier: StageTier;
  /** Which choreography to play: the quiet hero arc, or the deep sequence. */
  variant: StageVariant;
  /** Box the object resolves into, relative to this canvas. Product page only. */
  anchor?: RefObject<StageAnchor | null>;
  /** Cursor over the stage. Product page only; absent on touch. */
  pointer?: RefObject<PointerState>;
  /** Product page: where the specimen stands, for its inspection. */
  probe?: RefObject<SpecimenProbe | null>;
  /**
   * Cover the positioned box the canvas is mounted in, rather than taking the
   * layout's own size. The product page mounts it in the media frame's live
   * box (`ProductStage`, `LIVE_FRAME_MARGIN`).
   */
  fill?: boolean;
  /**
   * The vial transition: called once, just after the first frame that
   * contains the model has been presented — the moment a still standing in for
   * the object can dissolve into it.
   */
  onFirstFrame?: () => void;
}

/**
 * The RETA scene.
 *
 * Driven by `WorldEnvironment` + `WorldPalette` + a pose track rather than
 * hard-coded for RETA, so GLOW and GHK-Cu reuse this rig by passing their own
 * config — the reusable pattern MVP_SCOPE asks RETA to prove first.
 *
 * Default-exported because it is loaded through `next/dynamic`.
 */
export default function RetaCanvas({ fill = false, ...scene }: RetaCanvasProps) {
  /* Nothing is drawn until the shaders are compiled — see `Prewarm`. */
  const [compiled, setCompiled] = useState(false);
  return (
    <Canvas
      // R3F spreads `style` after its own defaults, so this wins.
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined}
      // Transparent: the backdrop resolves to the section's own `--world-void`,
      // so the canvas and the page dissolve into each other with no edge and no
      // rectangular panel.
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={stageDpr(scene.variant, scene.tier)}
      camera={STAGE_CAMERA}
      frameloop={stageFrameloop(compiled, scene.reducedMotion)}
    >
      <StageScene {...scene} compiled={compiled} onCompiled={() => setCompiled(true)} />
    </Canvas>
  );
}

/** The one lens every stage uses. */
export const STAGE_CAMERA = { fov: 28, position: [0, 0, CAMERA_Z] as const, near: 0.1, far: 40 };

/*
 * Cap at 2 for the product page's framed presenter, and at 1.5 for the
 * full-bleed homepage canvases (hero, RETA scene): at 2 a Retina laptop
 * renders ~2880px of transmission glass every frame, and the difference from
 * 1.5 is invisible at that size (performance audit, 2026-09-19). Phones cap at
 * 1.5 everywhere: a 3× screen at 2 drew ~1.8× the pixels of 1.5 through real
 * glass, and it stuttered (owner, 2026-09-29).
 */
export function stageDpr(
  variant: StageVariant,
  tier: StageTier,
  /** The canvas's CSS size, when known: phones then get a pixel budget. */
  box?: { width: number; height: number } | null,
): number | [number, number] {
  if (tier === "compact" && box && box.width > 0 && box.height > 0) return phoneDpr(box);
  return variant === "presenter" && tier !== "compact" ? [1, 2] : [1, 1.5];
}

/** Device pixels a phone canvas may draw, glass pass aside. */
const PHONE_PIXEL_BUDGET = 550_000;

/*
 * A PHONE'S RESOLUTION BY BUDGET, NOT BY RATIO (owner, 2026-09-30: GLOW and
 * GHK-Cu have "some angles that look very pixely").
 *
 * A fixed 1.5× suited the full-width hero and starved the small moment boxes:
 * GLOW's canvas was 310 × 528 pixels, stretched 2× onto a 3× screen, and its
 * glass's refraction image — half of that — 4×; the thin highlights stepped.
 * Pixels cost the same wherever they are, so each canvas gets up to a fixed
 * number of them: a small box draws at up to the screen's own density, a
 * large one no lower than the 1.5× it had.
 */
function phoneDpr({ width, height }: { width: number; height: number }): number {
  const device = Math.min(typeof window === "undefined" ? 2 : window.devicePixelRatio || 1, 3);
  return Math.min(device, Math.max(1.5, Math.sqrt(PHONE_PIXEL_BUDGET / (width * height))));
}

/*
 * Nothing until the shaders are compiled (`Prewarm`). Then: reduced motion
 * renders a single frame and stops entirely — no rAF loop, no battery drain,
 * for a user who asked for no movement; everything else is stepped by
 * `FrameBudget` instead of R3F's own loop — nothing drawn off screen.
 */
export function stageFrameloop(compiled: boolean, reducedMotion: boolean): "never" | "demand" {
  if (!compiled) return "never";
  return reducedMotion ? "demand" : "never";
}

/**
 * How `FrameBudget` steps a stage: a phone at most PHONE_FPS, anything else
 * every frame (null) — and every stage nothing while it is off screen. The
 * presenter keeps its canvas while the page is read below it (`useVialStage`'s
 * `keep`); the homepage's shared canvas stays in a stage until the next one
 * wins it, and drew ~60 glass frames a second through the sections between
 * (owner, 2026-10-01: the homepage "feels kinda stuttery").
 */
function budgeted(tier: StageTier): { fps: number | null } {
  return tier === "compact" ? { fps: PHONE_FPS } : { fps: null };
}

/**
 * THE SCENE, without its canvas — so one renderer can show it for any stage.
 *
 * The product page wraps it in its own `<Canvas>` (`RetaCanvas`, above); the
 * homepage's stages share ONE canvas that moves between them (`StageHost`),
 * which remounts this for each stage it shows. Everything that belongs to the
 * scene rather than the renderer is here, including the grade, which the
 * shared renderer has to take from whichever world it is showing.
 */
export function StageScene({
  onFirstFrame,
  compiled,
  onCompiled,
  pauseOffscreen = true,
  ...contents
}: Omit<RetaCanvasProps, "fill"> & {
  /** Whether `Prewarm` has finished — the loop is held until it has. */
  compiled: boolean;
  onCompiled: () => void;
  /** Draw nothing while the canvas is off screen (default). */
  pauseOffscreen?: boolean;
}) {
  const budget = budgeted(contents.tier);
  return (
    <>
      <Grade rig={WORLD_RIGS[contents.world]} tier={contents.tier} />
      <SceneContents {...contents} />
      {onFirstFrame ? <FirstFrame onFrame={onFirstFrame} /> : null}
      <Prewarm onReady={onCompiled} />
      {compiled && budget && !contents.reducedMotion ? (
        <FrameBudget fps={budget.fps} pauseOffscreen={pauseOffscreen} />
      ) : null}
    </>
  );
}

/**
 * What a stage's scene is made of — the reflection map, the backdrop, the
 * lights and the vial — without anything that acts on the renderer or the
 * loop. `StageScene` shows it; the homepage's canvas also builds it out of
 * sight, ahead of time, to prepare a stage before it is reached
 * (`SharedCanvas`).
 */
export function SceneContents({
  modelPath,
  world,
  environment,
  palette,
  progress,
  reducedMotion,
  tier,
  variant,
  anchor,
  pointer,
  probe,
  detached = false,
}: Omit<RetaCanvasProps, "fill" | "onFirstFrame"> & {
  /** A scene built only to be prepared: shows a copy of the vial. */
  detached?: boolean;
}) {
  const rig = WORLD_RIGS[world];
  /*
   * Only the RETA sequence paints its whole frame — and not on a phone
   * (owner, 2026-09-30: "the reta section staggers a lot"). There its canvas
   * is a band inside the section, and an opaque band had to be faded into the
   * page with a CSS mask, which makes the browser re-composite the masked WebGL
   * layer every frame. See-through, like the hero, the section's own light
   * shows around the vial and there is no edge to hide.
   */
  const fullFrame = variant === "sequence" && tier !== "compact";
  return (
    <>
      <SceneEnvironment rig={rig} />

      {/* Behind the vial, and therefore inside the transmission buffer: this is
          what the glass actually refracts. Not on the product page: its canvas
          is the media frame's own box (`ProductStage`), smaller than the local
          card, which would show its cut edges; the world's field already lights
          the space around the vial there. */}
      {variant === "presenter" ? null : (
        <Backdrop
          palette={palette}
          tier={tier} // Only the homepage sequence owns its whole frame. The hero
          // sits over DOM the canvas must not paint out.
          scope={fullFrame ? "full" : "local"}
        />
      )}

      {/* The see-through scopes leave the glass nothing opaque to refract, so
          it saw three.js's half-white fill. This draws only in the refraction
          pass — see `RefractionGround`. */}
      {fullFrame ? null : <RefractionGround palette={palette} />}

      {/* NEUTRAL, not the world's light tone. Ambient is uniform: colouring it
          tints every surface at once, which is one of the ways the glass came
          out blue. Cool comes from the rims and the environment. */}
      <ambientLight intensity={AMBIENT_INTENSITY[environment.atmosphere]} color="#ffffff" />

      <StudioLights
        palette={palette}
        environment={environment}
        progress={progress}
        reducedMotion={reducedMotion}
        tier={tier}
        variant={variant}
      />

      <VialModel
        modelPath={modelPath}
        progress={progress}
        reducedMotion={reducedMotion}
        tier={tier}
        rig={rig}
        variant={variant}
        anchor={anchor}
        pointer={pointer}
        probe={probe}
        detached={detached}
      />
    </>
  );
}

/**
 * THE STILLS' GRADE, set on the renderer for the world being shown.
 *
 * The rig is genuinely HDR and needs a roll-off, but ACES at the 0.62–0.72
 * exposure this stage used greyed every white — label, highlights, the glass's
 * edge lines — which is half of why the glass read as milky beside its
 * photograph. Neutral keeps whites white and colour true, at the rig's own
 * exposure. The transmission pass re-renders the scene into an offscreen
 * buffer; halving its resolution on phones is invisible through refraction.
 *
 * A LAYOUT effect, first in the scene: tone mapping is part of every shader
 * program, so it has to be in place before `Prewarm` compiles them.
 */
function Grade({ rig, tier }: { rig: StudioRig; tier: StageTier }) {
  // Read through `get()`: the renderer is R3F's to own, and this sets its
  // grade the way `onCreated` used to, not a value React rendered from.
  const get = useThree((state) => state.get);
  useLayoutEffect(() => {
    const { gl } = get();
    gl.toneMapping = NeutralToneMapping;
    gl.toneMappingExposure = rig.exposure;
    gl.transmissionResolutionScale = tier === "compact" ? 0.5 : 1;
  }, [get, rig, tier]);
  return null;
}

/**
 * COMPILE FIRST, DRAW SECOND (owner, 2026-09-29: the homepage "is still pretty
 * laggy" on a phone).
 *
 * Measured on a homepage handover, the largest single block of main thread was
 * the first draw waiting on its shaders — ~70 ms at desktop speed, before the
 * label upload, the lighting map and the first glass pass. three's first use
 * of a program reads its link status, which blocks until the GPU has compiled
 * the glass, label and cap programs.
 *
 * So the canvas starts with its loop off (`frameloop="never"`), and this asks
 * three to compile every program the scene will use IN THE BACKGROUND
 * (`compileAsync`, via KHR_parallel_shader_compile where the browser has it;
 * elsewhere it compiles as before, a frame later). Twice: once for the screen,
 * and once with a render target bound, because the glass renders the opaque
 * scene into its own target first, and a target changes the programs (linear
 * output, no tone mapping) though not with its size — a 1×1 stand-in yields
 * the same programs. Only then does the loop start.
 *
 * Nothing shows the gap: a stage is handed its canvas while it is still
 * ~40% of a screen away (`useVialStage`), so the compile is over before the
 * section arrives. Mounted after the scene's contents, so the model, lights
 * and environment it compiles for are all in place.
 */
/**
 * Compiles every program `scene` needs, for the screen and for the glass's
 * transmission pass, in the background. See `Prewarm`.
 */
export function compileScene(gl: WebGLRenderer, scene: Scene, camera: Camera): Promise<unknown> {
  const target = new WebGLRenderTarget(1, 1);
  const previous = gl.getRenderTarget();
  const screen = gl.compileAsync(scene, camera);
  gl.setRenderTarget(target);
  const glassPass = gl.compileAsync(scene, camera);
  gl.setRenderTarget(previous);
  return Promise.all([screen, glassPass])
    .catch(() => undefined)
    .finally(() => target.dispose());
}

function Prewarm({ onReady }: { onReady: () => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });

  useEffect(() => {
    let live = true;
    void compileScene(gl, scene, camera).then(() => {
      if (!live) return;
      ready.current();
      // A demand-driven (reduced-motion) canvas draws its one frame now.
      invalidate();
    });
    return () => {
      live = false;
    };
  }, [gl, scene, camera, invalidate]);

  return null;
}

/** A phone draws the vial at most this often. */
const PHONE_FPS = 30;

/**
 * THE PHONE'S FRAME BUDGET (owner, 2026-09-29: "it stutters just a tiny bit").
 *
 * Every frame of this scene renders the scene twice — once into the glass's
 * transmission image, once to the screen — and on a phone that was more than
 * the frame had. Nothing here moves fast: the presenter turns a full circle in
 * over a minute and the homepage arcs are scroll-paced, so 30 steady frames a
 * second read as the same motion as an uneven 60.
 *
 * Replaces R3F's own loop (`frameloop="never"`) with one that
 *   - draws at most PHONE_FPS times a second, whatever the display's rate
 *     (every other frame at 60 Hz, every fourth at 120 Hz) — on a phone; the
 *     desktop presenter draws every frame (`fps` null) — and
 *   - draws nothing while the canvas is off screen. A stage keeps its canvas
 *     mounted through a generous margin either side of the viewport (see
 *     `useVialStage`), and until now it rendered the whole time.
 *
 * Its clock runs only while it draws, and a single step is capped, so a vial
 * scrolled back into view resumes where it was instead of jumping by the
 * time it spent away. `advance` takes that clock in seconds.
 */
function FrameBudget({ fps, pauseOffscreen }: { fps: number | null; pauseOffscreen: boolean }) {
  const advance = useThree((state) => state.advance);
  const canvas = useThree((state) => state.gl.domElement);
  const get = useThree((state) => state.get);

  useEffect(() => {
    let visible = true;
    /* The product page's presenter keeps its canvas while the page is read
       below it, so it pauses off screen — from a little ahead, so it is drawn
       before it is seen. The homepage's shared canvas does not pause: a stage
       holds it only within its hand-over margin (`pauseOffscreen` false). */
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = !pauseOffscreen || (entry?.isIntersecting ?? true);
      },
      { rootMargin: "20% 0px" },
    );
    observer.observe(canvas);

    const interval = fps === null ? 0 : 1000 / fps;
    let raf = 0;
    let last = -Infinity;
    /*
     * FROM THE CANVAS'S OWN CLOCK, NEVER FROM ZERO (owner, 2026-10-01: in
     * Safari, the vial came back "glitchy", overexposed and "going from side to
     * side super quickly"). R3F times a stepped frame as `timestamp −
     * clock.elapsedTime`, and the homepage's canvas — with its clock — lives
     * for the whole page while a stage's loop is remounted at every hand-over.
     * Counting from 0 again made that first frame minus however long the page
     * had been open: every damped value (the lights, the turn) was extrapolated
     * to infinity or NaN. Chrome drew NaN light as none; Safari as white.
     */
    let clock = get().clock.elapsedTime;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // A couple of milliseconds of slack, or a 60 Hz display whose frames
      // land a hair early would skip two frames instead of one.
      if (!visible || now - last < interval - 2) {
        if (!visible) last = -Infinity;
        return;
      }
      clock += last === -Infinity ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.1));
      last = now;
      advance(clock);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [advance, canvas, fps, pauseOffscreen, get]);

  return null;
}

/**
 * The vial transition. The Canvas suspends its parent until the model has
 * loaded, so the first `useFrame` here is the first frame WITH the object; the
 * callback waits one more animation frame so that frame has been presented.
 */
function FirstFrame({ onFrame }: { onFrame: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onFrame());
  });
  return null;
}
