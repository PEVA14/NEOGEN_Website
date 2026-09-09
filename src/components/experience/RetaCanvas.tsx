"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { ACESFilmicToneMapping, MathUtils, type RectAreaLight } from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import type { WorldEnvironment } from "@/config/worlds";
import type { StageTier } from "@/hooks/useStageTier";

import { Backdrop } from "./Backdrop";
import {
  CAMERA_Z,
  poseTrack,
  RESTING_PROGRESS,
  sampleTrack,
  type StageVariant,
} from "./choreography";
import { VialModel, type PointerState, type StageAnchor } from "./VialModel";
import { createWorldEnvironment } from "./worldEnvironment";
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

/** Glass and metal are defined almost entirely by what they reflect. */
const ENV_INTENSITY: Record<WorldEnvironment["materialFocus"], number> = {
  // Lowered from 1.5. Combined with the glass multiplier this was pushing the
  // effective environment response to ~1.95 on a mirror-smooth surface, which
  // is what turned the softboxes into broad white plates.
  glass: 0.95,
  metal: 1.0,
  light: 0.85,
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

/** Image-based lighting from the world's own palette. */
function SceneEnvironment({
  palette,
  environment,
}: {
  palette: WorldPalette;
  environment: WorldEnvironment;
}) {
  const gl = useThree((state) => state.gl);

  const texture = useMemo(
    () => createWorldEnvironment(gl, palette, environment),
    [gl, palette, environment],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  // Attached declaratively: R3F owns the scene object and it must not be
  // mutated from inside a component.
  return <primitive object={texture} attach="environment" />;
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
} as const;

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

  // Aimed once on mount. `lookAt` has no declarative equivalent, and a ref is
  // the one thing React does intend to be mutated outside render.
  useEffect(() => {
    [keyLight, rimLight, fillLight, topLight].forEach((light) => light.current?.lookAt(0, 0, 0));
  }, []);

  // The environment responds to the sequence, restrained: only the accent rim
  // breathes, and only within a narrow band. Enough that the light feels alive
  // as the vial turns; not enough to read as an effect.
  useFrame((_, delta) => {
    const light = rimLight.current;
    if (!light) return;

    const at = reducedMotion ? RESTING_PROGRESS : progress.current;
    const target = sampleTrack(at, track.rimIntensity);

    light.intensity = reducedMotion ? target : MathUtils.damp(light.intensity, target, 3, delta);
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
        intensity={sampleTrack(RESTING_PROGRESS, track.rimIntensity)}
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
    </>
  );
}

interface RetaCanvasProps {
  modelPath: string;
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
  /**
   * Break out of the layer's own layout and cover it.
   *
   * The product page lays its canvas layer out on the SAME grid as the visible
   * composition, so the static fallback lands inside the media well. The live
   * canvas must not be constrained by that grid — the object is positioned in
   * world space and needs the whole frame to move through.
   */
  fill?: boolean;
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
export default function RetaCanvas({
  modelPath,
  environment,
  palette,
  progress,
  reducedMotion,
  tier,
  variant,
  anchor,
  pointer,
  fill = false,
}: RetaCanvasProps) {
  return (
    <Canvas
      // R3F spreads `style` after its own defaults, so this wins.
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined}
      // Transparent: the backdrop resolves to the section's own `--world-void`,
      // so the canvas and the page dissolve into each other with no edge and no
      // rectangular panel.
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // Cap at 2. Retina phones report 3+, tripling fragment cost for a
      // difference nobody can see on a 6-inch screen.
      dpr={[1, 2]}
      camera={{ fov: 28, position: [0, 0, CAMERA_Z], near: 0.1, far: 40 }}
      // Reduced motion renders a single frame then stops entirely — no rAF
      // loop, no battery drain, for a user who asked for no movement.
      frameloop={reducedMotion ? "demand" : "always"}
      onCreated={({ gl }) => {
        // Filmic roll-off. The rig is genuinely HDR, and without tone mapping
        // the specular streaks clip to flat white instead of holding falloff.
        gl.toneMapping = ACESFilmicToneMapping;
        // Pulled down from 1.05. ACES rolls off gracefully, but only if the
        // signal reaching it is not already clipping — the neck, base glass and
        // cap were all hitting pure white and losing material detail. White now
        // belongs to the paper label and the cap, not to the glass.
        gl.toneMappingExposure = variant === "hero" ? 0.62 : 0.72;

        // The transmission pass re-renders the scene into an offscreen buffer.
        // Halving its resolution on phones is invisible through refraction and
        // is the single biggest win available here.
        gl.transmissionResolutionScale = tier === "compact" ? 0.5 : 1;
      }}
    >
      <SceneEnvironment palette={palette} environment={environment} />

      {/* Behind the vial, and therefore inside the transmission buffer: this is
          what the glass actually refracts. */}
      <Backdrop
        palette={palette}
        tier={tier} // Only the homepage sequence owns its whole frame. The hero and the
        // PDP specimen both sit over DOM the canvas must not paint out.
        scope={variant === "sequence" ? "full" : "local"}
      />

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
        // The hero canvas is transparent, so the glass has no dark environment
        // behind it to contrast against and the same reflections read as milky
        // white. Damping the environment there keeps it reading as glass.
        envIntensity={ENV_INTENSITY[environment.materialFocus] * (variant === "hero" ? 0.7 : 1)}
        variant={variant}
        anchor={anchor}
        pointer={pointer}
      />
    </Canvas>
  );
}
