"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import {
  CanvasTexture,
  Color,
  MeshBasicMaterial,
  SRGBColorSpace,
  type BufferGeometry,
  type Camera,
  type Material,
  type Scene,
  type WebGLRenderer,
} from "three";

import type { StageTier } from "@/hooks/useStageTier";

import { BACKDROP_Z, CAMERA_Z } from "./choreography";
import type { WorldPalette } from "./worldPalette";

/** Falloff radius, as a fraction of the plane's height. */
/*
 * Wide enough that the lit area still sits behind the vial in the MATERIAL
 * close-up. A tighter pool leaves the glass refracting near-black at exactly
 * the moment it fills the frame, which reads as dark glass rather than clear.
 */
const GLOW_RADIUS = 0.44;

/**
 * Where the pool of light sits, as fractions of the plane. Behind the vial —
 * which the sequence now holds in the CENTRE of the frame, so the pool is
 * centred with it. (It used to sit right of centre, tracking a subject that
 * travelled.) Only the `full` scope reads this, and only the homepage sequence
 * uses that scope, so the hero and the PDP are untouched.
 */
const GLOW_CENTRE: Record<StageTier, { x: number; y: number }> = {
  full: { x: 0.5, y: 0.5 },
  compact: { x: 0.5, y: 0.4 },
};

/**
 * A controlled laboratory backdrop.
 *
 * TWO JOBS, and the first is the important one:
 *
 * 1. TRANSMISSION NEEDS SOMETHING TO REFRACT. three renders the scene — minus
 *    transmissive meshes — into an offscreen buffer, and the glass samples that
 *    buffer. With a transparent canvas and nothing behind the vial, the glass
 *    refracts empty space, which is precisely why it read as flat grey with no
 *    depth. A backdrop gives refraction something to bend, so thickness and
 *    curvature become visible.
 *
 * 2. It separates the subject from the background with a soft light falloff
 *    rather than leaving the vial floating on a flat field.
 *
 * Its outer colour is exactly `--world-void`, which is also the section's CSS
 * background, so the canvas and the page dissolve into each other — no
 * rectangular panel, and the environment reads as continuous across the
 * viewport.
 *
 * Deliberately NOT: particles, grids, molecules, HUDs, bloom.
 */
export function Backdrop({
  palette,
  tier,
  scope = "full",
}: {
  palette: WorldPalette;
  tier: StageTier;
  /**
   * `full`  — fills the frame; the canvas is opaque and IS the environment.
   * `local` — a soft card behind the subject only, fading to fully transparent.
   *
   * The hero needs `local`: its giant wordmark sits in HTML *behind* the
   * canvas, so the vial can only overlap the typography if most of the canvas
   * is see-through. The glass still gets something to refract, just scoped to
   * the object rather than the whole viewport.
   */
  scope?: "full" | "local";
}) {
  const viewport = useThree((state) => state.viewport);

  // The plane sits behind the subject, so it must be larger than the frame by
  // the ratio of their distances from the camera — plus margin, so no edge can
  // enter the shot at any aspect ratio.
  const depthScale = ((CAMERA_Z - BACKDROP_Z) / CAMERA_Z) * 1.15;
  const width = scope === "full" ? viewport.width * depthScale : 3.6;
  const height = scope === "full" ? viewport.height * depthScale : 4.4;

  const texture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const base = new Color(palette.void);

    /*
     * NEUTRAL CORE, TINTED SURROUND.
     *
     * Transmission refracts whatever is directly behind the subject, so an
     * accent-tinted centre is seen THROUGH the glass and the vial reads as blue
     * glass — the exact failure this scene keeps drifting back into. The pool
     * immediately behind the vial is therefore near-neutral (the world's light
     * tone, barely lifted), and the accent lives in the falloff AROUND it where
     * it colours the environment without passing through the object.
     */
    /*
     * Lifted clear of the void (0.2 → 0.32, 2026-09-25). Clear glass
     * shows what is behind it; at 0.2 that was so near black that the body
     * read as black glass, not as glass in a dark room.
     */
    const centre = new Color(palette.void).lerp(refractionLight(palette), 0.32);
    const mid = new Color(palette.void).lerp(new Color(palette.accent), 0.16);

    const rgba = (colour: Color, alpha: number) =>
      `rgba(${Math.round(colour.r * 255)}, ${Math.round(colour.g * 255)}, ${Math.round(
        colour.b * 255,
      )}, ${alpha})`;

    if (scope === "full") {
      const { x, y } = GLOW_CENTRE[tier];
      const cx = size * x;
      const cy = size * y;

      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, size, size);

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * GLOW_RADIUS);
      gradient.addColorStop(0, `#${centre.getHexString()}`);
      gradient.addColorStop(0.55, `#${mid.getHexString()}`);
      gradient.addColorStop(1, `#${base.getHexString()}`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    } else {
      // LOCAL: a light card behind the subject that dissolves to full
      // transparency, so the hero's wordmark — which sits in HTML behind the
      // canvas — stays visible everywhere the vial is not.
      const cx = size / 2;
      const cy = size / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
      gradient.addColorStop(0, rgba(new Color(palette.light), 0.13));
      gradient.addColorStop(0.42, rgba(mid, 0.07));
      gradient.addColorStop(1, rgba(base, 0));

      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }

    const created = new CanvasTexture(canvas);
    // Authored in sRGB; say so or three double-converts it.
    created.colorSpace = SRGBColorSpace;
    return created;
  }, [palette, tier, scope]);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    <mesh position={[0, 0, BACKDROP_Z]}>
      <planeGeometry args={[width, height]} />
      {/* Basic, not physical: the backdrop IS the lighting design and must not
          pick up highlights from the rig that lights the product. */}
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        transparent={scope === "local"}
        depthWrite={scope === "full"}
      />
    </mesh>
  );
}

/**
 * The light a vial is seen against, as the glass should show it: the world's
 * light tone taken halfway to white. Neutral enough that the glass does not
 * read as tinted — an accent-coloured centre is how this scene has turned out
 * blue glass before — while still belonging to the world.
 */
function refractionLight(palette: WorldPalette): Color {
  return new Color(palette.light).lerp(new Color("#ffffff"), 0.5);
}

/**
 * WHAT THE GLASS SEES THROUGH ITSELF, ON A SEE-THROUGH CANVAS.
 *
 * The `local` backdrop is transparent on purpose — the product page and the
 * hero sit over HTML the canvas must not paint out. But transmission samples
 * an off-screen render of the OPAQUE scene only, and on a transparent canvas
 * three.js clears that render to half-white (`setClearColor(0xffffff, 0.5)`
 * in WebGLRenderer's transmission pass). With nothing opaque behind the vial,
 * that white is what the glass refracted: the body read as frosted plastic.
 * The jar mostly hid it behind a label that went all the way round; V4's clear
 * sides showed it plainly.
 *
 * This plane fixes it without touching the page: it is opaque and it draws
 * ONLY while the transmission target is bound. In the main pass it writes
 * neither colour nor depth, so the canvas stays as transparent as before and
 * the page's grid and watermark still show.
 *
 * WHAT IT SHOWS IS A POOL OF LIGHT, NOT THE FLAT VOID. It used to be exactly
 * `--world-void`, and the glass read as black (owner, 2026-09-25: "the crystal
 * always looks black"): every page that shows a vial lights the space behind
 * it — the GLOW bloom and halo, the copper bands, the hero's card — so the
 * glass refracting flat void disagreed with everything around it. Glass reads
 * as CLEAR when what is seen through it continues what is seen around it.
 * The pool is centred behind the vial (every see-through canvas centres its
 * subject) and falls to the void at its edge, so the glass is brightest
 * through its middle and darkens toward its walls, which is also what gives
 * the body its depth.
 */
export function RefractionGround({ palette }: { palette: WorldPalette }) {
  const viewport = useThree((state) => state.viewport);
  const z = BACKDROP_Z - 0.2;
  // Larger than the frame by the ratio of distances, with generous margin:
  // refraction can look well past the silhouette.
  const scale = ((CAMERA_Z - z) / CAMERA_Z) * 1.6;

  const material = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const base = new Color(palette.void);
    if (!ctx) return new MeshBasicMaterial({ color: base, toneMapped: false });

    /* About as bright as the page's own glow behind the vial, a little over:
       brighter than its surroundings, the body read as frosted, not clear. */
    const centre = base.clone().lerp(refractionLight(palette), 0.32);
    const mid = base.clone().lerp(refractionLight(palette), 0.13);
    const c = size / 2;
    /* The plane is 1.6× the frame; a radius of a third of it reaches just
       past the frame's edge, so the whole vial stands in the pool. */
    const gradient = ctx.createRadialGradient(c, c, 0, c, c, size / 3);
    gradient.addColorStop(0, `#${centre.getHexString()}`);
    gradient.addColorStop(0.5, `#${mid.getHexString()}`);
    gradient.addColorStop(1, `#${base.getHexString()}`);
    ctx.fillStyle = `#${base.getHexString()}`;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return new MeshBasicMaterial({ map, toneMapped: false });
  }, [palette]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  /*
   * Toggles the material three is about to draw with — the one it hands to
   * the callback — rather than the memoised instance, which React treats as
   * immutable once a hook has returned it. They are the same object.
   */
  const onBeforeRender = useCallback(
    (
      renderer: WebGLRenderer,
      _scene: Scene,
      _camera: Camera,
      _geometry: BufferGeometry,
      drawn: Material,
    ) => {
      /* The transmission pass renders into its own target; the main pass
         renders to the canvas, where the target is null. */
      const refractionPass = renderer.getRenderTarget() !== null;
      drawn.colorWrite = refractionPass;
      drawn.depthWrite = refractionPass;
    },
    [],
  );

  return (
    <mesh position={[0, 0, z]} material={material} onBeforeRender={onBeforeRender}>
      <planeGeometry args={[viewport.width * scale, viewport.height * scale]} />
    </mesh>
  );
}
