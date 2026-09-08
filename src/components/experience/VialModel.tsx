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
}

export function VialModel({
  modelPath,
  progress,
  reducedMotion,
  tier,
  envIntensity,
  variant,
}: VialModelProps) {
  const gltf = useLoader(GLTFLoader, modelPath);
  const group = useRef<Group>(null);

  // World-space size of the frame at z=0. Offsets are expressed as fractions of
  // this, so the vial holds its place in the composition at any aspect ratio.
  const viewport = useThree((state) => state.viewport);

  const track = useMemo(() => poseTrack(tier, variant), [tier, variant]);

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

  /** Resolves the full pose at a given progress. */
  const applyPose = (at: number, time: number | null) => {
    const idleSpin = time === null ? 0 : Math.sin(time * 0.35) * IDLE_ROTATION;
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

    return {
      x: sampleTrack(at, track.offsetX) * viewport.width * depth,
      y: sampleTrack(at, track.offsetY) * viewport.height * depth + idleLift,
      z,
      scale: sampleTrack(at, track.scale),
      rotY: sampleTrack(at, track.rotationY) + idleSpin,
      rotZ: sampleTrack(at, track.rotationZ),
      rotX: sampleTrack(at, track.rotationX),
    };
  };

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;

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
