"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackSide,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  type RectAreaLight,
  type Texture,
  type WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import { drawLabel, labelSheet, type StudioLabel } from "./label";

import type { StudioRig } from "./rig";

RectAreaLightUniformsLib.init();

/**
 * THE STUDIO — a product photograph of the real GLB, rendered.
 *
 * Not a live commerce component. This scene exists to produce STILLS: it is
 * mounted on a development-only page, allowed to be expensive (full-resolution
 * transmission, a mirrored reflection pass, 2× supersampling), and its frame is
 * captured to an image that the catalogue then shows as a plain `<img>`. No
 * card ever runs WebGL.
 *
 * The model is used exactly as shipped — geometry, UVs and the RETA label
 * texture are the asset's own. What the studio controls is everything a
 * photographer would: lens, camera height, the turn of the object, the lights,
 * the sweep, the floor, the materials' response, and the grade.
 */

/* ---- textures drawn once, on a 2D canvas --------------------------------- */

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** The sweep: a cold pool of light behind the object, falling to near-black. */
function sweepTexture(rig: StudioRig): Texture {
  return canvasTexture(1024, (ctx, s) => {
    ctx.fillStyle = rig.sweep.edge;
    ctx.fillRect(0, 0, s, s);
    const c = new Color(rig.sweep.glow);
    const rgba = (a: number) =>
      `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
    // A wide, faint haze high in the frame: air, not a light.
    const haze = ctx.createRadialGradient(s / 2, s * 0.18, 0, s / 2, s * 0.18, s * 0.75);
    haze.addColorStop(0, rgba(rig.sweep.glowStrength * 0.28));
    haze.addColorStop(1, rgba(0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, s, s);
    // The pool: off-centre, behind the lit shoulder.
    const x = s * rig.sweep.glowX;
    const y = s * rig.sweep.glowY;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, s * 0.58);
    glow.addColorStop(0, rgba(rig.sweep.glowStrength));
    glow.addColorStop(0.3, rgba(rig.sweep.glowStrength * 0.5));
    glow.addColorStop(1, rgba(0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, s, s);
    // A faint horizon band where the floor meets the wall, so the object sits in
    // a space rather than floating in front of a gradient.
    const horizon = ctx.createLinearGradient(0, s * 0.6, 0, s);
    horizon.addColorStop(0, "rgba(0,0,0,0)");
    horizon.addColorStop(0.25, `rgba(0,0,0,${0.35 * rig.sweep.horizon})`);
    horizon.addColorStop(1, `rgba(0,0,0,${0.75 * rig.sweep.horizon})`);
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, s, s);
  });
}

/** A radial alpha falloff, white = opaque. Used for the floor and the shadow. */
function radialAlpha(stops: [number, number][]): Texture {
  const texture = canvasTexture(512, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (const [at, alpha] of stops) {
      const v = Math.round(alpha * 255);
      g.addColorStop(at, `rgb(${v},${v},${v})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  texture.colorSpace = "";
  return texture;
}

/* ---- the reflection map: what glass and metal see ------------------------ */

function studioEnvironment(renderer: WebGLRenderer, rig: StudioRig): Texture {
  const scene = new Scene();
  const room = new Mesh(new BoxGeometry(14, 14, 14), new MeshBasicMaterial({ side: BackSide }));
  (room.material as MeshBasicMaterial).color.set(rig.sweep.edge).multiplyScalar(rig.room);
  scene.add(room);

  // The cold wall behind the object, so the back of the glass reflects blue.
  const wall = new Mesh(new PlaneGeometry(10, 6), new MeshBasicMaterial());
  (wall.material as MeshBasicMaterial).color.set(rig.sweep.glow).multiplyScalar(0.22);
  wall.position.set(0, 0.4, -5);
  scene.add(wall);

  for (const box of Object.values(rig.softboxes)) {
    // Reflected panels are narrower than the diffuse lights they stand for: a
    // defined streak on the glass, where the light itself stays soft.
    const panel = new Mesh(
      new PlaneGeometry(box.width * 0.55, box.height),
      new MeshBasicMaterial(),
    );
    (panel.material as MeshBasicMaterial).color.set(box.color).multiplyScalar(box.reflection);
    // Pushed out along its own direction so it reads as a panel at a distance.
    const at = new Vector3(...box.position).multiplyScalar(1.8);
    panel.position.copy(at);
    panel.lookAt(0, 0, 0);
    scene.add(panel);
  }

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.015);
  pmrem.dispose();
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      (object.material as MeshBasicMaterial).dispose();
    }
  });
  return target.texture;
}

function Environment({ rig }: { rig: StudioRig }) {
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => studioEnvironment(gl, rig), [gl, rig]);
  const background = useMemo(() => sweepTexture(rig), [rig]);
  useEffect(
    () => () => {
      texture.dispose();
      background.dispose();
    },
    [texture, background],
  );
  return (
    <>
      <primitive object={texture} attach="environment" />
      {/* Screen-space sweep: no horizon edge, and the glass refracts it. */}
      <primitive object={background} attach="background" />
    </>
  );
}

/* ---- lights: what the object receives ------------------------------------ */

function Softboxes({ rig }: { rig: StudioRig }) {
  const refs = useRef<(RectAreaLight | null)[]>([]);
  useEffect(() => {
    refs.current.forEach((light) => light?.lookAt(0, 0, 0));
  }, []);
  return (
    <>
      {Object.values(rig.softboxes)
        .filter((box) => box.intensity > 0)
        .map((box, i) => (
          <rectAreaLight
            key={i}
            ref={(light) => {
              refs.current[i] = light;
            }}
            position={box.position}
            width={box.width}
            height={box.height}
            intensity={box.intensity}
            color={box.color}
          />
        ))}
    </>
  );
}

/* ---- the object ----------------------------------------------------------- */

function useStudioModel(modelPath: string, rig: StudioRig, label: StudioLabel | null) {
  const gltf = useLoader(GLTFLoader, modelPath);
  const gl = useThree((state) => state.gl);

  return useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const scale = 1 / (size.y || 1);
    root.scale.setScalar(scale);
    root.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);

    const materials: MeshStandardMaterial[] = [];
    /* The label sheet this render drew, if it drew one. */
    let sheet: HTMLCanvasElement | null = null;
    root.traverse((child) => {
      // glTF materials with no extension load as MeshStandardMaterial (the
      // label, the black top); only glass and aluminium are physical.
      if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
      const m = child.material.clone();
      child.material = m;
      materials.push(m);
      const name = m.name.toLowerCase();

      if (m instanceof MeshPhysicalMaterial && m.transmission > 0) {
        // Clear glass: near-smooth, real volume, a whisper of cool tint so its
        // thick base reads as glass rather than as nothing.
        m.roughness = rig.materials.glass.roughness;
        m.thickness = rig.materials.glass.thickness;
        m.ior = rig.materials.glass.ior;
        m.attenuationColor = new Color(rig.materials.glass.attenuation);
        m.attenuationDistance = 1.1;
        m.specularIntensity = 1;
        // Front-facing glass reflects ~4%: the softboxes must read through that.
        m.envMapIntensity = rig.materials.glass.reflect;
      } else if (m.metalness > 0.5) {
        /*
         * The cap: brushed aluminium, not grey plastic.
         *
         * Matched on METALNESS, not on the material's name. The name is what
         * an exporter or an asset tool renames without meaning to — one did,
         * and this branch fell through to the black-plastic one below, so the
         * catalogue card came back with a black cap on a silver vial.
         */
        m.metalness = 1;
        m.roughness = rig.materials.metal.roughness;
        m.color = new Color(rig.materials.metal.color);
        m.envMapIntensity = 1.4;
      } else if (name.includes("black plastic")) {
        // The flip-off top: a deep gloss black that holds a crisp highlight.
        m.roughness = 0.1;
        m.envMapIntensity = 1.3;
      } else if (name.includes("label")) {
        // Paper: matte, and the printed type kept sharp at an angle.
        m.roughness = rig.materials.label.roughness;
        m.envMapIntensity = 0.35;
        // A product without printed artwork of its own wears its registry data
        // in the real label's layout (see `./label`).
        if (label) {
          const family =
            getComputedStyle(document.documentElement).getPropertyValue("--font-instrument-sans") ||
            "sans-serif";
          /* The calibration belongs to the MODEL's label mesh, so it is
             looked up from the path rather than passed down the tree. */
          const texture = drawLabel(label, family, labelSheet(modelPath));
          m.map = texture;
          /* Kept so the sheet can be exported and baked into the model —
             see `scripts/export-label.mjs`. */
          if (texture.image instanceof HTMLCanvasElement) sheet = texture.image;
        }
        if (m.map) {
          m.map.anisotropy = gl.capabilities.getMaxAnisotropy();
          m.map.needsUpdate = true;
        }
      }
    });

    return { root, materials, sheet };
  }, [gltf, gl, rig, label, modelPath]);
}

function Subject({
  modelPath,
  rig,
  label,
  onSheet,
}: {
  modelPath: string;
  rig: StudioRig;
  label: StudioLabel | null;
  /** Hands the drawn label sheet up, so `window.__studio.label()` can export it. */
  onSheet?: (sheet: HTMLCanvasElement | null) => void;
}) {
  const { root, materials, sheet } = useStudioModel(modelPath, rig, label);
  useEffect(() => {
    onSheet?.(sheet);
  }, [onSheet, sheet]);
  // The reflection is the same object, mirrored through the floor plane (y = -0.5).
  const mirror = useMemo(() => root.clone(true), [root]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const floorAlpha = useMemo(
    () =>
      radialAlpha([
        [0, 1 - rig.floor.reflection],
        [0.22, 1 - rig.floor.reflection * 0.75],
        [0.38, 1 - rig.floor.reflection * 0.35],
        [0.55, 0.97],
        [0.75, 0.9],
        [1, 0],
      ]),
    [rig],
  );
  const shadowAlpha = useMemo(
    () =>
      radialAlpha([
        [0, rig.floor.shadow],
        [0.45, rig.floor.shadow * 0.75],
        [0.7, rig.floor.shadow * 0.25],
        [1, 0],
      ]),
    [rig],
  );

  return (
    <group rotation={[0, rig.yaw, 0]}>
      <primitive object={root} />
      <group position={[0, -1, 0]} scale={[1, -1, 1]}>
        <primitive object={mirror} />
      </group>
      {/* The floor: darkens the reflection with distance and dissolves into the sweep. */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 4.4]} />
        <meshBasicMaterial
          color={rig.floor.color}
          alphaMap={floorAlpha}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Contact shadow: where the base meets the floor. */}
      <mesh position={[0, -0.499, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.98, 0.98]} />
        <meshBasicMaterial
          color="#000000"
          alphaMap={shadowAlpha}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ---- capture -------------------------------------------------------------- */

declare global {
  interface Window {
    __studio?: {
      ready: boolean;
      capture: () => string;
      /**
       * The drawn LABEL SHEET, for baking into a model.
       *
       * Null when the model wears its own printed label. Exported by
       * `scripts/export-label.mjs`, which hands it to `prepare-model.mjs
       * --label` — that is how a mock-up strip the product record cannot
       * support gets replaced in the served file rather than at render time.
       */
      label: () => string | null;
    };
  }
}

/** Renders a settled frame and exposes it for capture. */
function Capture({ sheet }: { sheet: HTMLCanvasElement | null }) {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    // A few frames so the transmission buffer and PMREM have settled.
    const tick = () => {
      invalidate();
      frames += 1;
      if (frames < 6) raf = requestAnimationFrame(tick);
      else
        window.__studio = {
          ready: true,
          capture: () => {
            gl.render(scene, camera);
            return gl.domElement.toDataURL("image/png");
          },
          label: () => sheet?.toDataURL("image/png") ?? null,
        };
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.__studio = undefined;
    };
  }, [gl, scene, camera, invalidate, sheet]);
  return null;
}

function Aim({ target }: { target: [number, number, number] }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    camera.lookAt(...target);
  }, [camera, target]);
  return null;
}

export default function StudioScene({
  modelPath,
  rig,
  label = null,
  dpr = 2,
}: {
  modelPath: string;
  rig: StudioRig;
  /** Registry label data; null keeps the model's own printed label. */
  label?: StudioLabel | null;
  dpr?: number;
}) {
  const [sheet, setSheet] = useState<HTMLCanvasElement | null>(null);
  /* Stable, so Subject's effect fires on the SHEET changing and not on every
     render of the scene. */
  const onSheet = useCallback((next: HTMLCanvasElement | null) => setSheet(next), []);
  return (
    <Canvas
      dpr={dpr}
      frameloop="demand"
      camera={{ fov: rig.fov, position: rig.camera, near: 0.1, far: 40 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = rig.exposure;
        gl.transmissionResolutionScale = 1;
      }}
    >
      <Aim target={rig.target} />
      <Environment rig={rig} />
      <ambientLight intensity={0.04} />
      <Softboxes rig={rig} />
      <Subject modelPath={modelPath} rig={rig} label={label} onSheet={onSheet} />
      <Capture sheet={sheet} />
    </Canvas>
  );
}
