"use client";

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Box3, Group, MathUtils, Mesh, MeshStandardMaterial, Source, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  BACKLIGHT_DEPTH,
  backlightMaterial,
  finishMaterial,
  refractionOnly,
} from "./studio/optics";
import type { StudioRig } from "./studio/rig";
import type { StageTier } from "@/hooks/useStageTier";

import {
  measureSpecimen,
  readSpecimen,
  type SpecimenGeometry,
  type SpecimenProbe,
} from "./specimenProbe";
import {
  CAMERA_Z,
  IDLE_FLOAT,
  IDLE_ROTATION,
  poseTrack,
  restingProgress,
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
/** Peak pitch. Small on purpose: vertical tilt reads as wobble. */
const POINTER_PITCH = 0.05;
/** Peak parallax shift, as a fraction of the frame. */
const POINTER_SHIFT = 0.012;
/** Damping rate. Low, so the object eases rather than tracks. */
const POINTER_SETTLE = 2.4;

/**
 * Damping for the sequence's cursor drive. Much higher than the presenter's:
 * there the pointer is a hint and lag reads as weight, here the cursor IS the
 * turntable and lag reads as the object ignoring you.
 */
const TURN_SETTLE = 6;

/** Cursor position over the stage, in -1..1, plus whether it is over it at all. */
export interface PointerState {
  x: number;
  y: number;
  active: boolean;
  /**
   * Accumulated rotation the cursor has driven, in radians — the homepage
   * sequence's turntable.
   *
   * ACCUMULATED, NOT ABSOLUTE. Mapping cursor x straight to an angle means the
   * object unwinds the moment the cursor leaves the stage, and hands back a
   * reversed spin nobody asked for. Accumulating travel instead means one pass
   * across the stage is one full turn, and the object keeps the angle it
   * reached. The presenter ignores this field.
   */
  turn: number;
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

type LoadedGltf = { scene: Group };

/** A vial with the rig's finish applied, ready to be placed in any scene. */
interface PreparedVial {
  root: Group;
  /** The printed label's mesh, if the model has one: what inspection reads. */
  label: Mesh | null;
}

/* One backlight card per rig for the page, like the prepared vial: a shared
   canvas shows the same world many times, and the card is plain data. */
const backlights = new Map<StudioRig, ReturnType<typeof backlightMaterial>>();

function backlightFor(rig: StudioRig) {
  if (!backlights.has(rig)) backlights.set(rig, backlightMaterial(rig));
  return backlights.get(rig) ?? null;
}

/** The longest side a phone's label texture keeps — and the homepage's. */
const SMALL_LABEL_SIZE = 1024;

/*
 * THE HOMEPAGE'S LABEL AT 1024 TOO (owner, 2026-10-01: the homepage "feels
 * kinda stuttery"). Uploading the 2048² sheet was the largest single block of
 * the homepage's 3D start — 85 ms in one call on a laptop — and it lands
 * whenever a stage first draws. The homepage shows the vial at most ~60% of a
 * canvas drawn at ≤ 1.5×, so the label's visible half spans well under 1024
 * pixels: 1024 holds it. The product page, which shows it larger and at 2×,
 * keeps the full sheet on a wide screen.
 */
function labelSize(variant: StageVariant, tier: StageTier): number | null {
  return tier === "compact" || variant !== "presenter" ? SMALL_LABEL_SIZE : null;
}

/*
 * PREPARED ONCE, SHARED BETWEEN CANVASES (owner, 2026-09-29: the homepage
 * "is still pretty laggy" on a phone).
 *
 * The homepage runs one canvas at a time and hands it from section to
 * section; every handover used to rebuild the vial from the GLB — clone every
 * material, re-finish the cap's geometry — on the main thread, while the
 * visitor was scrolling. The prepared object is plain three.js data, so it
 * outlives the canvas that first showed it: GPU resources belong to each
 * renderer and are made again by it, but the CPU work is done once per model,
 * rig and tier. R3F never disposes a `<primitive>`, and only one canvas holds
 * the object at a time (adding it to a scene takes it out of the last).
 *
 * Keyed by the parsed GLTF, which `useLoader` caches for the page.
 */
const prepared = new WeakMap<object, Map<StudioRig, Record<string, PreparedVial>>>();

function preparedVial(
  gltf: LoadedGltf,
  rig: StudioRig,
  tier: StageTier,
  label: number | null,
): PreparedVial {
  let byRig = prepared.get(gltf);
  if (!byRig) prepared.set(gltf, (byRig = new Map()));
  let byTier = byRig.get(rig);
  if (!byTier) byRig.set(rig, (byTier = {}));
  const key = `${tier}:${label ?? "full"}`;
  const cached = byTier[key];
  if (cached) return cached;

  const root = gltf.scene.clone(true);
  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const scale = NORMALISED_HEIGHT / (size.y || 1);

  root.scale.setScalar(scale);
  root.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);

  let labelMesh: Mesh | null = null;
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;

    // Lit, not a shadow-caster: there is no ground plane in this composition,
    // so shadow maps would cost frames for nothing.
    child.castShadow = false;
    child.receiveShadow = false;

    /*
     * CLONE BEFORE TUNING.
     *
     * `Object3D.clone()` copies the material REFERENCE, not the material, and
     * `useLoader` caches the parsed GLTF for the lifetime of the page. Tuning
     * the source directly would permanently mutate the loaded asset, and
     * every tier and rig prepared from it would inherit whatever this one did
     * to it. Cloning keeps the source GLB pristine.
     */
    const material = child.material.clone();
    child.material = material;

    /*
     * THE STILLS' OWN FINISH (owner, 2026-09-29: the glass "ends up looking
     * really milky"). This pass used to tune the materials by hand, and the
     * glass drifted from the stills: a fixed `thickness` written for a model
     * ten times smaller left V4 with a twelfth of the stills' optical depth,
     * so it bent nothing and read as a flat grey sheet. The rig's values,
     * applied by the same function the studio uses, keep them identical.
     *
     * Phones keep REAL transmission too. They used to swap it for plain 40%
     * alpha — which is exactly frosted plastic. The cost is one extra scene
     * pass per frame, at half resolution (`transmissionResolutionScale` in
     * `RetaCanvas`).
     */
    const finish = finishMaterial(child, material, rig, size.y);
    if (finish === "label") labelMesh = child;

    /*
     * A PHONE'S LABEL AT 1024. The printed sheet ships at 2048², and uploading
     * it to each new canvas blocked the main thread for 33 ms at desktop speed
     * and ~57 ms at phone speed. On a phone the whole front of the label spans
     * a few hundred pixels at most — the canvas is capped at 1.5× — so 1024
     * holds the type while costing a quarter of the upload.
     */
    if (finish === "label" && label !== null) shrinkMap(material, label);
  });

  return (byTier[key] = { root, label: labelMesh });
}

/**
 * Replaces a material's colour map with a copy no longer than `size` on its
 * longest side. A new texture with its own source: the GLTF's texture is
 * shared with every other preparation of the model, so it is never touched.
 */
function shrinkMap(material: MeshStandardMaterial, size: number): void {
  const map = material.map;
  const image = map?.image as { width: number; height: number } | undefined;
  if (!map || !image?.width || !image.height) return;
  const longest = Math.max(image.width, image.height);
  if (longest <= size) return;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((image.width * size) / longest);
  canvas.height = Math.round((image.height * size) / longest);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  const small = map.clone();
  small.source = new Source(canvas);
  small.needsUpdate = true;
  material.map = small;
}

interface VialModelProps {
  modelPath: string;
  /**
   * Show a COPY of the prepared vial rather than the vial itself. The prepared
   * object can stand in one scene at a time, and a scene built only to prepare
   * a stage ahead (`SharedCanvas`'s `WarmUp`) must never take it from the
   * scene on screen — which is what left the homepage hero empty
   * (2026-09-30). The copy shares the geometry, materials and textures, so
   * compiling and uploading it prepares the real one.
   */
  detached?: boolean;
  /** 0→1 pinned scroll progress. A ref: never re-renders. */
  progress: RefObject<number>;
  /** Holds a single resolved pose and stops animating. */
  reducedMotion: boolean;
  tier: StageTier;
  /** The world's studio rig: the glass, cap and paper answer to it exactly as
      they do in the stills (see `studio/optics`). */
  rig: StudioRig;
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
  /** Presenter only: reports where the specimen stands, while enabled. */
  probe?: RefObject<SpecimenProbe | null>;
}

export function VialModel({
  modelPath,
  progress,
  reducedMotion,
  tier,
  rig,
  variant,
  anchor,
  pointer,
  probe,
  detached = false,
}: VialModelProps) {
  const gltf = useLoader(GLTFLoader, modelPath);
  const group = useRef<Group>(null);
  const card = useRef<Mesh>(null);

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
  /** Whether the hero has drawn its first frame (placed, not eased). */
  const placed = useRef(false);
  const pitch = useRef(0);
  const shiftX = useRef(0);
  const shiftY = useRef(0);
  /** The model's geometry, measured once for the inspection's readings. */
  const specimen = useRef<SpecimenGeometry | null>(null);

  /*
   * Prepared once per page and shared (see `preparedVial` below), so it is
   * never disposed here: the next canvas that shows this vial picks it up.
   */
  const model = preparedVial(gltf, rig, tier, labelSize(variant, tier));
  const shown = useMemo(() => (detached ? model.root.clone() : model.root), [detached, model]);

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

  // An inspection opened on a still frame (reduced motion) asks for one.
  useEffect(() => {
    const listener = probe?.current;
    if (!listener) return;
    listener.connect(invalidate);
    return () => listener.connect(null);
  }, [probe, invalidate]);

  /** Resolves the full pose at a given progress. */
  const applyPose = (at: number, time: number | null) => {
    // The presenter has a real, continuous rotation; the decorative sway that
    // gives the campaign sequences presence would only fight it.
    const idleSpin =
      time === null || variant === "presenter" || variant === "sequence" || variant === "moment"
        ? 0
        : Math.sin(time * 0.35) * IDLE_ROTATION;
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

        /*
         * THE SAME TURNTABLE AS THE HOMEPAGE (owner request, 2026-09-16).
         *
         * Yaw was an absolute ±8° hint that fell back to zero the moment the
         * cursor left. It is now the accumulated drive the sequence uses: one
         * traverse of the stage is one revolution, and the angle SURVIVES the
         * cursor leaving, so the object stays where it was put.
         */
        yaw.current = MathUtils.damp(yaw.current, cursor?.turn ?? 0, TURN_SETTLE, delta);

        /*
         * Pitch and parallax stay at vitrine amplitude and still fall back to
         * zero on exit. They are DEPTH CUES on other axes, not rotation, so
         * they never compete with the turn for control of the same axis — the
         * failure that made the homepage's travelling choreography and its
         * cursor irreconcilable.
         */
        const targetPitch = engaged ? -cursor.y * POINTER_PITCH : 0;
        const targetShiftX = engaged ? cursor.x * POINTER_SHIFT : 0;
        const targetShiftY = engaged ? -cursor.y * POINTER_SHIFT : 0;

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

      const listener = probe?.current;
      if (listener?.listening()) {
        specimen.current ??= measureSpecimen(node, model.label);
        listener.report(readSpecimen(node, state.camera, specimen.current));
      }
      return;
    }

    /*
     * SEQUENCE and MOMENT — the homepage turntables.
     *
     * The pose is constant now, so there is nothing for position or scale to
     * ease into and they are assigned directly; damping a value that never
     * changes only adds lag on the first frames. All of the movement is
     * rotation: the passive turn accumulates (so a backgrounded tab resumes
     * instead of jumping, rAF having stopped while it was away), and the
     * cursor's accumulated travel is damped in on top of it.
     */
    if ((variant === "sequence" || variant === "moment") && !reducedMotion) {
      const pose = applyPose(progress.current, state.clock.elapsedTime);

      spin.current += delta * SPIN_RATE;
      yaw.current = MathUtils.damp(yaw.current, pointer?.current.turn ?? 0, TURN_SETTLE, delta);

      node.position.set(pose.x, pose.y, pose.z);
      node.rotation.set(pose.rotX, pose.rotY + spin.current + yaw.current, pose.rotZ);
      node.scale.setScalar(pose.scale);
      return;
    }

    if (reducedMotion) {
      // The resolved frame — the composition at its strongest, held still.
      // Assigned directly rather than damped so it is correct on frame one,
      // which matters because `frameloop="demand"` renders exactly one.
      const pose = applyPose(restingProgress(variant), null);
      node.position.set(pose.x, pose.y, pose.z);
      node.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
      node.scale.setScalar(pose.scale);
      return;
    }

    const pose = applyPose(progress.current, state.clock.elapsedTime);

    /*
     * The FIRST frame is the pose itself, not a step toward it from the
     * group's default (centre, upright, unit scale) — the hero used to slide in
     * from the middle of its canvas as it faded in. Its stand-in is this pose
     * (`StageStandIn`), so the live vial now takes over from it unseen.
     */
    if (!placed.current) {
      placed.current = true;
      node.position.set(pose.x, pose.y, pose.z);
      node.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
      node.scale.setScalar(pose.scale);
      return;
    }

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

  /*
   * THE BACKLIGHT CARD (owner, 2026-09-29), the stills' own — see
   * `studio/optics`. Seen only through the glass, it is what keeps the body
   * clear and silvery instead of showing the world's saturated pool straight
   * through it as blue (or amber, or copper) glass.
   *
   * It FOLLOWS the object — position, size, depth — but never its rotation.
   * The studio's card is fixed to the set because a card that turned with the
   * object would swing edge-on across the glass; here the object travels, so
   * the card travels with it and keeps facing the lens. It is sized to cover
   * the object at its presenter lean, so it needs no lean of its own.
   *
   * Registered after the pose above, so it reads this frame's pose.
   */
  const backlight = useMemo(() => backlightFor(rig), [rig]);
  useFrame(() => {
    const node = group.current;
    const plate = card.current;
    if (!node || !plate) return;
    const size = node.scale.x;
    plate.position.set(node.position.x, node.position.y, node.position.z - BACKLIGHT_DEPTH * size);
    plate.scale.setScalar(size);
  });

  return (
    <>
      <group ref={group}>
        <primitive object={shown} />
      </group>
      {backlight && rig.backlight ? (
        <mesh ref={card} material={backlight} onBeforeRender={refractionOnly}>
          <planeGeometry args={[rig.backlight.width, rig.backlight.height]} />
        </mesh>
      ) : null}
    </>
  );
}
