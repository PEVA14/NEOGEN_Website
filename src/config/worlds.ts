/**
 * NEOGEN — Product World configuration.
 *
 * The non-CSS half of a product world: identity, experiential intent, and the
 * asset/lighting hints Phase 2's 3D scene will read. The colour half lives in
 * `src/styles/worlds.css`, keyed by the same `id`.
 *
 * HARD RULE: no UI copy in this file. Worlds are locale-independent; anything
 * a human reads comes from `src/i18n/dictionaries`. `statementKey` is a
 * dictionary key, not a sentence.
 *
 * HARD RULE: no product claims, prices, specs or availability here. This
 * describes the *environment*, not the product.
 */

export const worldIds = ["reta", "glow", "ghk-cu"] as const;

export type WorldId = (typeof worldIds)[number];

/** Camera/lighting intent consumed by the Phase 2 3D layer. */
export interface WorldEnvironment {
  /** Dominant light temperature. Drives directional light colour in R3F. */
  lightTemperature: "cold" | "warm" | "neutral";
  /** Relative intensity of the key light, 0-1. Tuned against the real GLB later. */
  keyLightIntensity: number;
  /** How much atmospheric wash the section carries behind the subject. */
  atmosphere: "restrained" | "luminous" | "tactile";
  /** Material character the lighting rig should flatter. */
  materialFocus: "glass" | "light" | "metal";
}

export interface ProductWorld {
  id: WorldId;
  /** Brand name — a proper noun, not translated copy. */
  label: string;
  /** `data-world` attribute value. Matches the CSS selector in worlds.css. */
  dataAttribute: WorldId;
  /**
   * Path to the GLB under /public/models.
   * MVP: all three share the same vial master with different labels.
   * TODO(phase-2): NEOGEN_RETA.glb is not yet in the repository.
   */
  modelPath: string | null;
  /** Static image shown while the GLB loads, and as the no-3D fallback. */
  posterPath: string | null;
  environment: WorldEnvironment;
}

export const worlds: Record<WorldId, ProductWorld> = {
  reta: {
    id: "reta",
    label: "RETA",
    dataAttribute: "reta",
    modelPath: null, // TODO(phase-2): "/models/NEOGEN_RETA.glb" once provided.
    posterPath: null,
    environment: {
      lightTemperature: "cold",
      keyLightIntensity: 0.85,
      atmosphere: "restrained",
      materialFocus: "glass",
    },
  },
  glow: {
    id: "glow",
    label: "GLOW",
    dataAttribute: "glow",
    modelPath: null, // MVP reuses the RETA vial with a GLOW label.
    posterPath: null,
    environment: {
      lightTemperature: "warm",
      keyLightIntensity: 0.7,
      atmosphere: "luminous",
      materialFocus: "light",
    },
  },
  "ghk-cu": {
    id: "ghk-cu",
    label: "GHK-Cu",
    dataAttribute: "ghk-cu",
    modelPath: null, // MVP reuses the RETA vial with a GHK-Cu label.
    posterPath: null,
    environment: {
      lightTemperature: "neutral",
      keyLightIntensity: 0.75,
      atmosphere: "tactile",
      materialFocus: "metal",
    },
  },
};

export function getWorld(id: WorldId): ProductWorld {
  return worlds[id];
}

export function isWorldId(value: string | undefined): value is WorldId {
  return worldIds.includes(value as WorldId);
}
