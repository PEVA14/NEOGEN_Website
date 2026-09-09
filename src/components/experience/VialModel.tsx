"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Box3, Group, MathUtils, Mesh, MeshPhysicalMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { StageTier } from "@/hooks/useStageTier";

import {
  CAMERA_Z,
  IDLE_FLOAT,
  IDLE_ROTATION,
  poseTrack,
  RESTING_PROGRESS,
  sampleTrack,
  type StageVariant,
} from "./choreography";

/**
 * The GLB is authored in Blender metres and sits ~0.6 units off the X origin.
 * Web code owns positioning (CLAUDE.md), so rather than trusting the asset's
 * transform we normalise it: centre the bounding box on the origin and scale it
 * to a fixed height. An improved GLB then drops in without re-tuning anything.
 */
const NORMALISED_HEIGHT = 1;

/** How much of the media well's height the resolved object occupies. */
const FIT_IN_PANEL = 0.62;

/*
 * PRESENTER MOTION — a museum display, not a 3D toy.
 *
 * One continuous turn, slow enough that the object is never mid-blur while
 * being read: a full revolution takes over a minute. On top of it, an optional
 * pointer response with real inertia — small enough that a user who moves the
 * cursor deliberately notices it and a user who is reading never does.
 *
 * Interaction is never required to understand the product. Everything below is
 * additive to a pose that is already correct without it.
 */
const SPIN_RATE = 0.085;
/** Peak yaw the pointer can add, in radians. ~8°. */
const POINTER_YAW = 0.14;
/** Peak pitch. Deliberately a third of the yaw: vertical tilt reads as wobble. */
const POINTER_PITCH = 0.05;
/** Peak parallax shift, as a fraction of the frame. */
const POINTER_SHIFT = 0.012;
/** Damping rate. Low, so the object eases rather than tracks. */
const POINTER_SETTLE = 2.4;

/** Cursor position over the stage, in -1..1, plus whether it is over it at all. */
export interface PointerState {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Screen-space box the object resolves into, as fractions of the CANVAS — not
 * of the window. Measuring against the canvas is what makes the anchor
 * scroll-invariant: the product page is an ordinary block that scrolls away,
 * and a window-relative box would drag the object out of its own media well on
 * the way past.
 */
export interface StageAnchor {
  x: number;
  y: number;
  height: number;
  weight: number;
}

interface VialModelProps {
  modelPath: string;
  /** 0→1 pinned scroll progress. A ref: never re-renders. */
  progress: RefObject<number>;
  /** Holds a single resolved pose and stops animating. */
  reducedMotion: boolean;
  tier: StageTier;
  /** How strongly materials respond to the image-based environment. */
  envIntensity: number;
  /** Which choreography to play. */
  variant: StageVariant;
  /**
   * Box the object must resolve into. Supplied by the product page so the
   * object locks into its media well at any viewport size — and, during the
   * opening expansion, so it can be handed from the card's media box to that
   * well without changing apparent size.
   */
  anchor?: RefObject<StageAnchor | null>;
  /** Cursor over the stage. Presenter variant only; absent on touch. */
  pointer?: RefObject<PointerState>;
}

export function VialModel({
  modelPath,
  progress,
  reducedMotion,
  tier,
  envIntensity,
  variant,
  anchor,
  pointer,
}: VialModelProps) {
  const gltf = useLoader(GLTFLoader, modelPath);
  const group = useRef<Group>(null);

  // World-space size of the frame at z=0. Offsets are expressed as fractions of
  // this, so the vial holds its place in the composition at any aspect ratio.
  const viewport = useThree((state) => state.viewport);

  const track = useMemo(() => poseTrack(tier, variant), [tier, variant]);

  /*
   * Presenter state. Refs, not React state: these change every frame and
   * nothing outside the render loop has any use for them.
   *
   * `spin` accumulates rather than deriving from the clock so that the rotation
   * survives a tab going to the background — `requestAnimationFrame` stops
   * there, and a clock-derived angle would jump on return.
   */
  const spin = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const shiftX = useRef(0);
  const shiftY = useRef(0);

  const model = useMemo(() => {
    const root = gltf.scene.clone(true);

    // Cloned materials are ours to dispose; the cached originals are not.
    const clones: MeshPhysicalMaterial[] = [];

    const box = new Box3().setFromObject(root);
    const size = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    const scale = NORMALISED_HEIGHT / (size.y || 1);

    root.scale.setScalar(scale);
    root.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);

    root.traverse((child) => {
      if (!(child instanceof Mesh)) return;

      // Lit, not a shadow-caster: there is no ground plane in this composition,
      // so shadow maps would cost frames for nothing.
      child.castShadow = false;
      child.receiveShadow = false;

      const source = child.material;
      if (!(source instanceof MeshPhysicalMaterial)) return;

      /*
       * CLONE BEFORE TUNING.
       *
       * `Object3D.clone()` copies the material REFERENCE, not the material, and
       * `useLoader` caches the parsed GLTF for the lifetime of the page. Tuning
       * `source` directly would permanently mutate the loaded asset — and the
       * compact branch below would strip transmission from the cached material,
       * so resizing a phone-width window back to desktop would never restore
       * the glass. Cloning keeps the source GLB pristine and makes every value
       * here reversible.
       */
      const material = source.clone();
      child.material = material;
      clones.push(material);

      // Set per-material rather than on `scene.environmentIntensity`: R3F owns
      // the scene object and it must not be mutated from a component.
      material.envMapIntensity = envIntensity;

      if (material.transmission > 0) {
        /*
         * CLEAR LABORATORY GLASS — not chrome, not cobalt, not invisible.
         *
         * The GLB ships roughness 0, which is a PERFECT MIRROR. Combined with a
         * high environment intensity it turned the large softboxes into broad
         * white plates across the body, so the vial read as chrome. A little
         * micro-roughness is both physically honest for real glassware and the
         * single most effective fix: it scatters those plates into soft falloff
         * while leaving edges and refraction crisp.
         */
        material.roughness = 0.055;

        // Glass volume. `thickness` is required because the asset carries no
        // volume extension — without it transmission bends nothing. Slightly
        // thinner than before so more of the backdrop reads THROUGH the vial.
        material.thickness = 0.42;

        // Anti-reflective coating, in effect. Real lab glass is often coated;
        // dropping specular below 1 removes the broad white sheen sitting on
        // top of the body while leaving the edge highlights that define shape.
        material.specularIntensity = 0.72;

        // Roughly half the previous value. Reflections should describe the
        // glass, not replace it.
        material.envMapIntensity = envIntensity * 0.9;

        if (tier === "compact") {
          // Transmission forces an extra full-scene render pass per frame. On
          // phones we trade refraction for plain alpha — with the backdrop
          // behind it the vial still reads as glass, at far lower cost.
          material.transmission = 0;
          material.transparent = true;
          material.opacity = 0.4;
        }
      }
    });

    return { root, clones };
  }, [gltf, tier, envIntensity]);

  // Release the cloned materials when the tier changes or the scene unmounts.
  useEffect(() => () => model.clones.forEach((material) => material.dispose()), [model]);

  /*
   * Reduced motion runs `frameloop="demand"` — exactly one frame, then nothing.
   * That is correct for movement, but it also means a RESIZE would leave the
   * object at a position measured against the old layout, because the anchor it
   * reads is a ref that no render observes.
   *
   * A changed viewport is precisely the signal that the measurement has moved,
   * so ask for one more frame when it does. Requesting it from an effect also
   * puts it after the measuring ResizeObserver has run.
   */
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, viewport.width, viewport.height]);

  /** Resolves the full pose at a given progress. */
  const applyPose = (at: number, time: number | null) => {
    // The presenter has a real, continuous rotation; the decorative sway that
    // gives the campaign sequences presence would only fight it.
    const idleSpin =
      time === null || variant === "presenter" ? 0 : Math.sin(time * 0.35) * IDLE_ROTATION;
    const idleLift = time === null ? 0 : Math.sin(time * 0.45) * IDLE_FLOAT;

    const z = sampleTrack(at, track.offsetZ);

    /*
     * `viewport` describes the frame at z = 0. As the vial travels toward the
     * camera the same world offset covers MORE of the screen, so a fixed
     * fraction would drift outward exactly when the crop states need it to hold
     * position. Scaling by the depth ratio keeps the composition anchored in
     * screen space across the whole sequence.
     */
    const depth = (CAMERA_Z - z) / CAMERA_Z;

    let x = sampleTrack(at, track.offsetX) * viewport.width * depth;
    let y = sampleTrack(at, track.offsetY) * viewport.height * depth + idleLift;
    let scale = sampleTrack(at, track.scale);

    /*
     * ANCHOR TO THE REAL BOX.
     *
     * A fixed viewport fraction is fine while the target grows with the
     * viewport — but the product page's media well is capped, so past that
     * width the panel stops moving and the object keeps going. At ~2000px they
     * diverged by 170px and the vial spilled out of its own well.
     *
     * So position is derived from MEASURED geometry instead: the box's centre
     * becomes the object's world position, and its height sets the scale.
     *
     * During the opening expansion the product page feeds this the CARD's media
     * box, easing to the media well's — which is what lets the environment do
     * all the travelling while the object appears to stay where it was.
     */
    const box = anchor?.current;
    if (box && box.weight > 0) {
      const worldWidth = viewport.width * depth;
      const worldHeight = viewport.height * depth;

      const targetX = (box.x - 0.5) * worldWidth;
      const targetY = -(box.y - 0.5) * worldHeight;
      // NORMALISED_HEIGHT is 1 world unit, so this is the scale that makes the
      // object occupy `FIT` of the panel's height.
      const targetScale = FIT_IN_PANEL * box.height * worldHeight;

      x = x + (targetX - x) * box.weight;
      y = y + (targetY + idleLift - y) * box.weight;
      scale = scale + (targetScale - scale) * box.weight;
    }

    return {
      x,
      y,
      z,
      scale,
      rotY: sampleTrack(at, track.rotationY) + idleSpin,
      rotZ: sampleTrack(at, track.rotationZ),
      rotX: sampleTrack(at, track.rotationX),
    };
  };

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

    /*
     * PRESENTER — the product page.
     *
     * Position, size and depth come from the anchor, so they are assigned
     * directly rather than damped: the anchor is already an eased interpolation
     * during the opening, and damping a damped value only makes the object lag
     * behind its own media well. What IS damped is the pointer response, which
     * is where inertia is the point.
     */
    if (variant === "presenter") {
      const pose = applyPose(0, reducedMotion ? null : state.clock.elapsedTime);

      if (!reducedMotion) {
        spin.current += delta * SPIN_RATE;

        const cursor = pointer?.current;
        const engaged = cursor?.active === true;

        // Targets fall to zero the moment the cursor leaves, so the object
        // eases back to its passive rotation instead of holding an offset.
        const targetYaw = engaged ? cursor.x * POINTER_YAW : 0;
        const targetPitch = engaged ? -cursor.y * POINTER_PITCH : 0;
        const targetShiftX = engaged ? cursor.x * POINTER_SHIFT : 0;
        const targetShiftY = engaged ? -cursor.y * POINTER_SHIFT : 0;

        yaw.current = MathUtils.damp(yaw.current, targetYaw, POINTER_SETTLE, delta);
        pitch.current = MathUtils.damp(pitch.current, targetPitch, POINTER_SETTLE, delta);
        shiftX.current = MathUtils.damp(shiftX.current, targetShiftX, POINTER_SETTLE, delta);
        shiftY.current = MathUtils.damp(shiftY.current, targetShiftY, POINTER_SETTLE, delta);
      }

      node.position.set(
        pose.x + shiftX.current * viewport.width,
        pose.y + shiftY.current * viewport.height,
        pose.z,
      );
      node.rotation.set(
        pose.rotX + pitch.current,
        pose.rotY + spin.current + yaw.current,
        pose.rotZ,
      );
      node.scale.setScalar(pose.scale);
      return;
    }

    if (reducedMotion) {
      // The resolved frame — the composition at its strongest, held still.
      // Assigned directly rather than damped so it is correct on frame one,
      // which matters because `frameloop="demand"` renders exactly one.
      const pose = applyPose(RESTING_PROGRESS, null);
      node.position.set(pose.x, pose.y, pose.z);
      node.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
      node.scale.setScalar(pose.scale);
      return;
    }

    const pose = applyPose(progress.current, state.clock.elapsedTime);

    // Damped toward the target rather than assigned. Scroll events arrive
    // unevenly, and easing toward the target keeps motion continuous on a
    // stuttering main thread. `delta` comes from useFrame — calling
    // clock.getDelta() here would consume the delta R3F's own loop needs.
    const settle = 3.2;
    node.position.x = MathUtils.damp(node.position.x, pose.x, settle, delta);
    node.position.y = MathUtils.damp(node.position.y, pose.y, settle, delta);
    node.position.z = MathUtils.damp(node.position.z, pose.z, settle, delta);
    node.rotation.x = MathUtils.damp(node.rotation.x, pose.rotX, settle, delta);
    node.rotation.y = MathUtils.damp(node.rotation.y, pose.rotY, settle, delta);
    node.rotation.z = MathUtils.damp(node.rotation.z, pose.rotZ, settle, delta);

    const scale = MathUtils.damp(node.scale.x, pose.scale, settle, delta);
    node.scale.setScalar(scale);
  });

  return (
    <group ref={group}>
      <primitive object={model.root} />
    </group>
  );
}
