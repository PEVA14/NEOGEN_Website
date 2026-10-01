import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Camera,
  type Material,
  type MeshStandardMaterial,
  type Texture,
  type WebGLRenderer,
} from "three";

import { finishCap } from "../capFinish";
import { isLabelMaterial, keepOutOfRefraction } from "../labelMaterial";

import type { StudioRig } from "./rig";

/**
 * THE OPTICS OF A RIG — shared by the studio that makes the stills and the
 * live viewer on the product pages and the homepage.
 *
 * They used to be tuned separately, and the live glass drifted: it kept a fixed
 * `thickness` written for a model ten times smaller than V4, so it bent almost
 * nothing and read as a flat, milky sheet beside the stills (owner,
 * 2026-09-29: "it ends up looking really milky and not reflect the light
 * well"). Both paths now read the same rig through this module, so a change
 * made for a still reaches the 3D, and the two cannot drift apart again.
 *
 * What stays per path: the studio's set (sweep, floor, flags) and the live
 * stage's own lights, backdrop and choreography. The backlight card is shared;
 * each path only decides where it stands.
 */

/**
 * The raw height, in its own units, of the container the glass was tuned on
 * (`reta-v2.glb`, 287.9 mm authored in metres). See `finishMaterial`.
 */
const TUNED_HEIGHT = 0.2879;

/* ---- the reflection map: what glass and metal see ------------------------ */

export function studioEnvironment(renderer: WebGLRenderer, rig: StudioRig): Texture {
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

  // Negative fill: black cards for the metal and the glass rims to reflect.
  for (const card of rig.negativeFill ?? []) {
    const panel = new Mesh(new PlaneGeometry(card.width, card.height), new MeshBasicMaterial());
    (panel.material as MeshBasicMaterial).color.set("#000000");
    panel.position.copy(new Vector3(...card.position).multiplyScalar(1.8));
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

/* ---- the materials' response ---------------------------------------------- */

export type FinishedAs = "glass" | "metal" | "plastic" | "label" | null;

/**
 * Tunes one of the model's materials to the rig, in place, and says what it
 * was. The caller owns the material — it must be a clone, never the cached
 * GLTF's own — and `rawHeight` is the model's height in its own units, before
 * any normalising scale.
 */
export function finishMaterial(
  mesh: Mesh,
  m: MeshStandardMaterial,
  rig: StudioRig,
  rawHeight: number,
): FinishedAs {
  const name = m.name.toLowerCase();

  if (m instanceof MeshPhysicalMaterial && m.transmission > 0) {
    // Clear glass: near-smooth, real volume, a whisper of cool tint so its
    // thick base reads as glass rather than as nothing.
    m.roughness = rig.materials.glass.roughness;
    /*
     * DEPTH IN THE MODEL'S OWN UNITS, scaled to its size. `thickness` is a
     * local-space length, and the root is normalised to a height of 1, so
     * the same number means ten times less glass on a model built ten
     * times larger. V4 is authored at 3.0 units tall where the jar the rig
     * was tuned on is 0.288, and it came out as a flat shell that bent
     * nothing. Scaling by the model's own height gives every container the
     * optical depth the approved jar has.
     */
    m.thickness = rig.materials.glass.thickness * (rawHeight / TUNED_HEIGHT);
    m.ior = rig.materials.glass.ior;
    m.attenuationColor = new Color(rig.materials.glass.attenuation);
    m.attenuationDistance = 1.1;
    m.specularIntensity = 1;
    // Front-facing glass reflects ~4%: the softboxes must read through that.
    m.envMapIntensity = rig.materials.glass.reflect;
    return "glass";
  }

  if (m.metalness > 0.5) {
    /*
     * The cap: brushed aluminium, not grey plastic.
     *
     * Matched on METALNESS, not on the material's name. The name is what
     * an exporter or an asset tool renames without meaning to — one did,
     * and this branch fell through to the black-plastic one below, so the
     * catalogue card came back with a black cap on a silver vial.
     */
    m.metalness = 1;
    m.color = new Color(rig.materials.metal.color);
    // Spun-aluminium relief and grain, and the rig's roughness as its
    // average — see `capFinish.ts`.
    finishCap(mesh, m, rig.materials.metal.roughness);
    m.envMapIntensity = rig.materials.metal.reflect ?? 1.4;
    return "metal";
  }

  if (name.includes("black plastic")) {
    // The flip-off top: a deep gloss black that holds a crisp highlight.
    m.roughness = 0.1;
    m.envMapIntensity = 1.3;
    return "plastic";
  }

  if (isLabelMaterial(m)) {
    // Paper: matte, and the printed type kept sharp at an angle.
    m.roughness = rig.materials.label.roughness;
    m.envMapIntensity = 0.35;
    // Out of the glass's refraction image — see `labelMaterial.ts`.
    keepOutOfRefraction(m);
    return "label";
  }

  return null;
}

/* ---- the backlight: what the glass sees through itself ------------------- */

/**
 * How far behind the object's centre the backlight card stands, in the
 * object's own height (it is normalised to 1 in both paths).
 */
export const BACKLIGHT_DEPTH = 0.6;

/**
 * DARK-FIELD BACKLIGHT, seen only through the glass — see `StudioRig.backlight`.
 *
 * An opaque card just behind the object: its centre lit, falling to the set's
 * edge colour. Drawn only in the transmission pass (`refractionOnly`), so the
 * lens never sees it and the set around the object is unchanged; only what the
 * glass shows is. Without it clear glass on a dark set shows the dark — or, on
 * the homepage, the world's saturated pool — straight through its body, and
 * reads as black or blue glass instead of clear. Null for a rig without one.
 */
export function backlightMaterial(rig: StudioRig): MeshBasicMaterial | null {
  const backlight = rig.backlight;
  if (!backlight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const s = canvas.width;
  ctx.fillStyle = rig.sweep.edge;
  ctx.fillRect(0, 0, s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, backlight.color);
  g.addColorStop(0.55, backlight.color);
  g.addColorStop(1, rig.sweep.edge);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return new MeshBasicMaterial({ map, toneMapped: false });
}

/**
 * `onBeforeRender` for anything the glass should see and the lens should not.
 *
 * The transmission pass renders into its own target; the main pass renders to
 * the canvas, where the target is null. Toggles the material three is about to
 * draw with — the one it hands to the callback.
 */
export function refractionOnly(
  renderer: WebGLRenderer,
  _scene: Scene,
  _camera: Camera,
  _geometry: BufferGeometry,
  drawn: Material,
): void {
  const refractionPass = renderer.getRenderTarget() !== null;
  drawn.colorWrite = refractionPass;
  drawn.depthWrite = refractionPass;
}
