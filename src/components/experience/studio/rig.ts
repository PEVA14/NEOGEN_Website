/**
 * THE STUDIO RIG — a product photograph described as data.
 *
 * One object per product. Everything a photographer would set up for the shot
 * lives here: lens and camera height, the object's turn toward the lens, the
 * lights (as softboxes and strips, not abstract "lights"), the sweep behind the
 * object, the floor it stands on, and the grade. The scene in `StudioScene`
 * only executes it.
 *
 * RETA is the prototype (owner direction, 2026-09-18); GLOW and GHK-Cu now
 * have their own rig objects — not new scenes — built from it by overriding
 * the light colours, the sweep and the grade (owner request, 2026-09-20).
 */

export interface Softbox {
  /** World position; the subject is centred on the origin, 1 unit tall. */
  position: [number, number, number];
  width: number;
  height: number;
  /** Diffuse light the object receives (a real rect-area light). */
  intensity: number;
  /** What the glass and metal SEE — the panel's brightness in the reflection map. */
  reflection: number;
  color: string;
}

export interface StudioRig {
  /** Vertical field of view in degrees. Long lens: no perspective distortion. */
  fov: number;
  camera: [number, number, number];
  target: [number, number, number];
  /** Turn of the object toward the lens, in radians. 0 = label front and centre. */
  yaw: number;
  /** Exposure into the tone mapper. */
  exposure: number;
  softboxes: Record<"key" | "fill" | "stripLeft" | "stripRight" | "top" | "streak", Softbox>;
  sweep: {
    /** Ground colour at the edges of the frame. */
    edge: string;
    /** The pool of light behind the object. */
    glow: string;
    /** 0–1, where the pool sits in the frame. */
    glowX: number;
    glowY: number;
    glowStrength: number;
    /** Darkening toward the floor, 0–1. Deep on a dark set, faint on a light one. */
    horizon: number;
  };
  floor: {
    color: string;
    /** How much of the object's reflection survives in the floor, 0–1. */
    reflection: number;
    /** Contact shadow darkness under the base, 0–1. */
    shadow: number;
  };
  /** Brightness of the reflection room around the set, relative to its edge colour. */
  room: number;
  materials: {
    glass: {
      roughness: number;
      thickness: number;
      ior: number;
      attenuation: string;
      /** How strongly the glass reflects the studio. */
      reflect: number;
    };
    metal: { color: string; roughness: number };
    label: { roughness: number };
  };
}

/**
 * RETA — "the environment becomes precision".
 *
 * A near-black studio with a cold blue pool behind the vial. White softboxes
 * keep the label true; two tall strips draw the edges of the glass; the blue
 * lives in the sweep and one strip, never in the key.
 */
export const RETA_RIG: StudioRig = {
  fov: 18,
  camera: [0, 0.18, 4.9],
  target: [0, -0.03, 0],
  yaw: -0.17,
  exposure: 1,
  softboxes: {
    // Large, front-upper-left: the label and the body's main gradient.
    key: {
      position: [-1.7, 1.0, 2.5],
      width: 1.8,
      height: 2.4,
      intensity: 5.5,
      reflection: 6.5,
      color: "#f4f7ff",
    },
    // Front-right, dimmer: opens the shadow side without flattening it.
    fill: {
      position: [1.9, 0.1, 2.4],
      width: 1.4,
      height: 2.2,
      intensity: 0.9,
      reflection: 0.6,
      color: "#ffffff",
    },
    // Tall white strip behind-left: the bright left edge of the glass.
    stripLeft: {
      position: [-1.05, 0.25, -2.1],
      width: 0.5,
      height: 3.8,
      intensity: 5,
      reflection: 22,
      color: "#ffffff",
    },
    // Tall cold strip behind-right: the RETA edge.
    stripRight: {
      position: [1.05, 0.25, -2.1],
      width: 0.5,
      height: 3.8,
      intensity: 5,
      reflection: 16,
      color: "#5d8cff",
    },
    // A reflection-only strip, front-left: the long highlight down the glass
    // that makes it read as photographed glass. It lights nothing else.
    streak: {
      position: [-1.25, 0.2, 1.9],
      width: 0.9,
      height: 3.4,
      intensity: 0,
      reflection: 4.5,
      color: "#ffffff",
    },
    // Overhead: the top of the cap and the shoulder.
    top: {
      position: [0, 2.3, 0.5],
      width: 1.8,
      height: 1.2,
      intensity: 2.2,
      reflection: 1.8,
      color: "#eef3ff",
    },
  },
  sweep: {
    edge: "#05070c",
    glow: "#173a86",
    glowX: 0.64,
    glowY: 0.36,
    glowStrength: 0.95,
    horizon: 1,
  },
  floor: {
    color: "#06080d",
    reflection: 0.3,
    shadow: 0.85,
  },
  room: 0.6,
  materials: {
    glass: {
      roughness: 0.05,
      thickness: 0.5,
      ior: 1.5,
      attenuation: "#b9bcc2",
      reflect: 2.6,
    },
    metal: { color: "#cfd3d9", roughness: 0.34 },
    label: { roughness: 0.62 },
  },
};

/**
 * GLOW — "the environment becomes light".
 *
 * RETA's dark field, warmed: the pool behind the vial is amber and sits a
 * little higher and wider, so the glass is lit from behind rather than edged.
 * The key stays near-white — the label is paper and must not go orange — and
 * the amber lives in the sweep, the right strip and the top light, which is
 * what puts a warm crown on the cap.
 *
 * Colours are the world's own (`styles/worlds.css`): void #160d06, accent
 * #c88722, light #ffd78a.
 */
export const GLOW_RIG: StudioRig = {
  ...RETA_RIG,
  /* A luminous world carries more exposure; the sweep is brighter than RETA's
     and the roll-off is what keeps the highlights from clipping. */
  exposure: 1.06,
  softboxes: {
    ...RETA_RIG.softboxes,
    key: { ...RETA_RIG.softboxes.key, color: "#fff6e8", intensity: 5.2, reflection: 6 },
    fill: { ...RETA_RIG.softboxes.fill, color: "#fff4e4", intensity: 1.1 },
    stripLeft: { ...RETA_RIG.softboxes.stripLeft, reflection: 18, color: "#fffaf2" },
    /* The amber edge: GLOW's identity, and the one strip allowed to be warm. */
    stripRight: { ...RETA_RIG.softboxes.stripRight, reflection: 20, color: "#ffb44e" },
    streak: { ...RETA_RIG.softboxes.streak, reflection: 4.2 },
    top: { ...RETA_RIG.softboxes.top, color: "#ffd78a", intensity: 2.6, reflection: 2.4 },
  },
  sweep: {
    edge: "#0b0703",
    glow: "#8a5410",
    glowX: 0.5,
    glowY: 0.44,
    glowStrength: 1.15,
    horizon: 0.92,
  },
  floor: { color: "#0a0604", reflection: 0.32, shadow: 0.8 },
  room: 0.7,
  materials: {
    ...RETA_RIG.materials,
    glass: { ...RETA_RIG.materials.glass, attenuation: "#d8c6a8", reflect: 2.4 },
    /* Warm silver: the cap picks the world up without turning brass. */
    metal: { color: "#d8d2c6", roughness: 0.34 },
  },
};

/**
 * GHK-Cu — "the environment becomes material".
 *
 * The most physical of the three sets: a copper pool low and to the left, a
 * neutral key so the label stays true, and a copper strip that lays the metal's
 * own colour along the right edge of the glass. The floor holds more of the
 * object than RETA's, because a material world should show its weight.
 *
 * Colours are the world's own: void #1a100c, accent #b5683c, light #f0d9cb.
 */
export const GHK_RIG: StudioRig = {
  ...RETA_RIG,
  exposure: 1.02,
  softboxes: {
    ...RETA_RIG.softboxes,
    key: { ...RETA_RIG.softboxes.key, color: "#fff8f3", intensity: 5.4, reflection: 6.2 },
    fill: { ...RETA_RIG.softboxes.fill, color: "#fff6f0", intensity: 1.0 },
    stripLeft: { ...RETA_RIG.softboxes.stripLeft, reflection: 20, color: "#fffaf6" },
    /* Copper down the right edge — the metal reading its own world. */
    stripRight: { ...RETA_RIG.softboxes.stripRight, reflection: 17, color: "#c9763f" },
    streak: { ...RETA_RIG.softboxes.streak, reflection: 4.4 },
    top: { ...RETA_RIG.softboxes.top, color: "#f0d9cb", intensity: 2.3, reflection: 2 },
  },
  sweep: {
    edge: "#080505",
    glow: "#7a3a18",
    glowX: 0.38,
    glowY: 0.34,
    glowStrength: 1,
    horizon: 1,
  },
  floor: { color: "#0a0706", reflection: 0.36, shadow: 0.85 },
  room: 0.62,
  materials: {
    ...RETA_RIG.materials,
    glass: { ...RETA_RIG.materials.glass, attenuation: "#c8bdb6", reflect: 2.5 },
    metal: { color: "#d4cdc6", roughness: 0.3 },
  },
};

/**
 * NEUTRAL — every product that is not a flagship (owner direction,
 * 2026-09-18).
 *
 * The same canonical container, on a bright cream set. No world colour
 * anywhere: RETA, GLOW and GHK-Cu stay exceptional because everything else is
 * this calm.
 *
 * BRIGHT-FIELD, the inverse of RETA's dark-field: on a light set clear glass
 * vanishes unless something DARK defines its edges, so the two strips behind
 * the object are black flags (reflection only, no light). The key and fill
 * are large and soft, the shadow is light, and the floor barely reflects.
 */
export const NEUTRAL_RIG: StudioRig = {
  ...RETA_RIG,
  exposure: 1.02,
  softboxes: {
    key: {
      position: [-1.8, 1.1, 2.4],
      width: 2.4,
      height: 2.8,
      intensity: 4.2,
      reflection: 2.4,
      color: "#fffdf8",
    },
    fill: {
      position: [2.0, 0.2, 2.3],
      width: 2.0,
      height: 2.6,
      intensity: 1.9,
      reflection: 1.4,
      color: "#fffdf8",
    },
    // Black flags behind the sides: the dark edge lines of the glass.
    stripLeft: {
      position: [-1.05, 0.25, -2.1],
      width: 0.46,
      height: 3.8,
      intensity: 0,
      reflection: 1,
      color: "#000000",
    },
    stripRight: {
      position: [1.05, 0.25, -2.1],
      width: 0.46,
      height: 3.8,
      intensity: 0,
      reflection: 1,
      color: "#000000",
    },
    streak: {
      position: [-1.25, 0.2, 1.9],
      width: 0.9,
      height: 3.4,
      intensity: 0,
      reflection: 3.2,
      color: "#ffffff",
    },
    top: {
      position: [0, 2.3, 0.5],
      width: 2.2,
      height: 1.4,
      intensity: 2.4,
      reflection: 1.6,
      color: "#fffdf8",
    },
  },
  sweep: {
    edge: "#e7e3db",
    glow: "#fbfaf6",
    glowX: 0.5,
    glowY: 0.38,
    glowStrength: 1,
    horizon: 0.16,
  },
  floor: {
    color: "#ebe7e0",
    reflection: 0.16,
    shadow: 0.5,
  },
  room: 1.3,
  materials: {
    glass: {
      roughness: 0.05,
      thickness: 0.5,
      ior: 1.5,
      attenuation: "#e4e5e7",
      reflect: 1.1,
    },
    metal: { color: "#d2d5da", roughness: 0.32 },
    label: { roughness: 0.62 },
  },
};
