import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

import type { WorldEnvironment } from "@/config/worlds";

import type { WorldPalette } from "./worldPalette";

/**
 * A studio environment built from the product world's own palette.
 *
 * WHY NOT `RoomEnvironment`
 * -------------------------
 * three's RoomEnvironment is a neutral grey room. Glass is defined almost
 * entirely by what it reflects, so a grey room makes the vial reflect grey —
 * which is exactly why RETA blue was "barely influencing the object". No
 * amount of light tuning fixes that, because the reflections are the problem.
 *
 * This builds a dark studio instead: a near-black room (so edges read as
 * contrast rather than wash), one NEUTRAL key softbox so the white label stays
 * colour-accurate, and cool accent panels in the world's own accent. The
 * environment is where "the environment becomes precision" actually happens.
 *
 * Emitters use the RoomEnvironment technique: a MeshBasicMaterial whose colour
 * is scaled past 1.0, giving genuine HDR values in the half-float PMREM target.
 */

/** Emitter panel: colour multiplied past 1.0 so PMREM captures real HDR range. */
function emitter(colour: string, intensity: number): MeshBasicMaterial {
  const material = new MeshBasicMaterial();
  material.color.set(colour).multiplyScalar(intensity);
  return material;
}

function panel(
  colour: string,
  intensity: number,
  width: number,
  height: number,
  position: [number, number, number],
  lookAtOrigin = true,
): Mesh {
  const mesh = new Mesh(new PlaneGeometry(width, height), emitter(colour, intensity));
  mesh.position.set(...position);
  if (lookAtOrigin) mesh.lookAt(0, 0, 0);
  return mesh;
}

/** Key-light warmth per world. Kept close to neutral so labels stay accurate. */
const KEY_TINT: Record<WorldEnvironment["lightTemperature"], string> = {
  cold: "#eef4ff",
  warm: "#fff1de",
  neutral: "#ffffff",
};

/** How bright the surrounding room is. Restrained = darker = more contrast. */
const ROOM_LEVEL: Record<WorldEnvironment["atmosphere"], number> = {
  restrained: 0.055,
  luminous: 0.22,
  tactile: 0.11,
};

export function createWorldEnvironment(
  renderer: WebGLRenderer,
  palette: WorldPalette,
  environment: WorldEnvironment,
): Texture {
  const scene = new Scene();

  // The room. Near-black, tinted with the world's void so the glass has dark
  // surroundings to reflect — this is what produces edge definition.
  const room = new Mesh(
    new BoxGeometry(12, 12, 12),
    emitter(palette.void, ROOM_LEVEL[environment.atmosphere]),
  );
  room.material.side = BackSide;
  scene.add(room);

  /*
   * NEUTRAL-DOMINANT, deliberately.
   *
   * A near-mirror clear glass shows you the room, so the room decides what
   * colour the glass appears to be. The previous balance was blue 4.6 + 2.1 +
   * pale-blue 1.5 + 0.55 against a single neutral 5.2 — so the glass reflected
   * mostly blue and read as blue glass.
   *
   * Now the two brightest sources are colourless, and the accent panels sit
   * behind the subject where they can only catch its edges. Blue arrives as
   * rim light; the body of the glass reflects neutral white and reads clear.
   *
   * Levels were then pulled down roughly 2x: at the previous brightness these
   * neutral panels reflected off mirror-smooth glass as broad white plates and
   * the vial read as chrome. Blue was deliberately reduced far less, so the
   * neutral:accent ratio stays balanced rather than swinging back to blue.
   */

  // KEY — a tall neutral softbox, front-upper-left. Tall and narrow on purpose:
  // it draws a long vertical specular streak down the glass, which is what
  // makes thickness and curvature legible. Neutral so the label reads true.
  scene.add(panel(KEY_TINT[environment.lightTemperature], 4.6, 2.6, 6.5, [-3.4, 2.2, 3.2]));

  // NEUTRAL FILL, front-right. The colourless bright source clear glass needs
  // to reflect in order to read as colourless. Without this the only strong
  // reflections available are the accent panels.
  scene.add(panel("#ffffff", 1.9, 2.2, 5.5, [3.2, 0.6, 2.9]));

  // ACCENT RIM — the world's colour, BEHIND the subject so it grazes the edges
  // rather than washing the body. This is where "the environment becomes
  // precision" happens: blue as a cold edge, not as a material.
  scene.add(panel(palette.accent, 3.0, 1.8, 6.5, [3.6, 0.8, -3.0]));

  // Second, dimmer accent from the opposite rear quarter so both edges resolve.
  scene.add(panel(palette.accent, 1.4, 1.4, 5, [-3.2, 0.4, -3.1]));

  // Cool overhead wash, restrained: separates cap and shoulder from the
  // background without lifting — or tinting — the whole object.
  scene.add(panel(palette.light, 0.55, 5, 5, [0, 4.2, 0.4]));

  // Faint neutral floor bounce. Stops the base going dead without flattening
  // the contrast the dark room exists to create.
  scene.add(panel("#ffffff", 0.3, 4, 4, [0, -3.4, 0.8]));

  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.02).texture;

  // The studio is scaffolding — only the cubemap survives.
  pmrem.dispose();
  scene.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      (object.material as MeshBasicMaterial).dispose();
    }
  });

  return texture;
}
